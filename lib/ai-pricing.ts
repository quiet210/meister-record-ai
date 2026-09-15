import type { AiUsage } from "@/lib/types";

export type AiModelPricing = {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
};

export type AiUsageCostEstimate = {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
};

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

// Google Gemini Developer API paid tier standard pricing, checked 2026-09-14.
export const AI_MODEL_PRICING_USD: Record<string, AiModelPricing> = {
  [DEFAULT_GEMINI_MODEL]: {
    inputPerMillionTokens: 0.3,
    outputPerMillionTokens: 2.5
  }
};

const defaultUsdKrwRate = 1400;

function normalizeModelName(model: string) {
  return model.trim().replace(/^models\//, "");
}

function parsePositiveNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getConfiguredGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getAiModelPricing(model: string) {
  return AI_MODEL_PRICING_USD[normalizeModelName(model)] || null;
}

export function estimateAiUsageCostUsd(usage: Pick<AiUsage, "model" | "promptTokens" | "outputTokens">): AiUsageCostEstimate {
  const pricing = getAiModelPricing(usage.model);
  if (!pricing) {
    return {
      inputCostUsd: 0,
      outputCostUsd: 0,
      totalCostUsd: 0
    };
  }

  const inputCostUsd = (usage.promptTokens / 1_000_000) * pricing.inputPerMillionTokens;
  const outputCostUsd = (usage.outputTokens / 1_000_000) * pricing.outputPerMillionTokens;

  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd
  };
}

export function getUsdKrwRate() {
  return parsePositiveNumber(process.env.NEXT_PUBLIC_AI_COST_USD_KRW) || parsePositiveNumber(process.env.AI_COST_USD_KRW) || defaultUsdKrwRate;
}

export function estimateUsdToKrw(usd: number) {
  return usd * getUsdKrwRate();
}
