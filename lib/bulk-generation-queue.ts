import { postGenerateApi } from "@/lib/generate-api-client";
import type { GenerateResponse, RecordFormPayload } from "@/lib/types";

export const BULK_GENERATION_CONCURRENCY = 3;
export const MAX_RATE_LIMIT_RETRIES = 3;
export const RATE_LIMIT_BACKOFF_MS = [5_000, 15_000, 30_000] as const;

export type BulkGenerationStatus = "waiting" | "queued" | "generating" | "retrying" | "completed" | "failed" | "cancelled";

export type BulkGenerationRetry = {
  retryNumber: number;
  delayMs: number;
};

type QueueOptions<T> = {
  signal: AbortSignal;
  concurrency?: number;
  onCancelled?: (items: T[]) => void;
};

type GenerateWithRetryOptions = {
  signal: AbortSignal;
  onRetry?: (retry: BulkGenerationRetry) => void;
  onRetryStart?: (retryNumber: number) => void;
};

function abortError() {
  const error = new Error("생성이 중단되었습니다.");
  error.name = "AbortError";
  return error;
}

export function isBulkGenerationAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function waitForRetry(delayMs: number, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(abortError());

  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    function handleAbort() {
      window.clearTimeout(timeoutId);
      reject(abortError());
    }

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

function retryAfterMs(response: Response) {
  const value = response.headers.get("Retry-After")?.trim();
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  return Math.max(0, retryAt - Date.now());
}

function parseGenerateResponse(body: string) {
  try {
    return JSON.parse(body) as GenerateResponse & { error?: string; message?: string };
  } catch {
    return null;
  }
}

function requestErrorMessage(status: number, result: ReturnType<typeof parseGenerateResponse>) {
  if (status === 500 || status === 502 || status === 503) return "일시적인 서버 오류가 발생했습니다.";
  if (status === 401) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  if (status === 403) return "선택한 학생에 대한 생성 권한이 없습니다.";
  if (status === 404) return "생성 API를 찾을 수 없습니다.";
  if (status === 400) return result?.error || result?.message || "생성 요청 내용을 확인해 주세요.";
  return result?.error || result?.message || `생성 API 오류가 발생했습니다. (${status})`;
}

export async function generateWithRateLimitRetry(
  endpoint: string,
  payload: RecordFormPayload,
  options: GenerateWithRetryOptions
): Promise<GenerateResponse> {
  for (let requestIndex = 0; ; requestIndex += 1) {
    if (options.signal.aborted) throw abortError();
    if (requestIndex > 0) options.onRetryStart?.(requestIndex);

    const response = await postGenerateApi(endpoint, payload, { signal: options.signal });
    const body = await response.text();
    const result = parseGenerateResponse(body);
    const errorCode = result?.errorCode ? String(result.errorCode) : "";
    const rateLimited = response.status === 429 || errorCode === "429";

    if (rateLimited) {
      if (requestIndex >= MAX_RATE_LIMIT_RETRIES) {
        throw new Error("Gemini API 사용 한도로 인해 생성하지 못했습니다. 실패 학생만 다시 생성해 주세요.");
      }

      const delayMs = retryAfterMs(response) ?? RATE_LIMIT_BACKOFF_MS[requestIndex];
      options.onRetry?.({ retryNumber: requestIndex + 1, delayMs });
      await waitForRetry(delayMs, options.signal);
      continue;
    }

    if (!response.ok) {
      throw new Error(requestErrorMessage(response.status, result));
    }

    if (["500", "502", "503"].includes(errorCode) && !result?.draft) {
      throw new Error("일시적인 서버 오류가 발생했습니다.");
    }

    if (!result) {
      throw new Error("생성 API 응답을 확인할 수 없습니다.");
    }

    if (!result.draft) {
      throw new Error(result.warnings?.join(" ") || "초안을 생성하지 못했습니다.");
    }

    return result;
  }
}

export async function runBulkGenerationQueue<T>(items: T[], worker: (item: T) => Promise<void>, options: QueueOptions<T>) {
  let nextIndex = 0;
  const workerCount = Math.min(options.concurrency ?? BULK_GENERATION_CONCURRENCY, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (!options.signal.aborted) {
        const itemIndex = nextIndex;
        nextIndex += 1;
        if (itemIndex >= items.length) return;

        try {
          await worker(items[itemIndex]);
        } catch (error) {
          if (options.signal.aborted || isBulkGenerationAbortError(error)) return;
          throw error;
        }
      }
    })
  );

  const cancelledItems = options.signal.aborted ? items.slice(Math.min(nextIndex, items.length)) : [];
  if (cancelledItems.length > 0) options.onCancelled?.(cancelledItems);
  return { cancelledItems };
}
