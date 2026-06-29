export type DraftSimilarityStatus = "normal" | "similar" | "duplicate";

export type DraftSimilarityInput = {
  studentId: string;
  studentName: string;
  draft: string;
};

export type DraftSimilarityResult = {
  studentId: string;
  studentName: string;
  similarity: number;
  percentage: number;
  status: DraftSimilarityStatus;
  matchedStudentId?: string;
  matchedStudentName?: string;
};

export const similarDraftThresholdPercent = 70;
export const duplicateDraftThresholdPercent = 85;

type DraftVector = Map<string, number>;

function normalizeDraftText(text: string, studentNames: string[]) {
  let normalized = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  studentNames.forEach((name) => {
    const normalizedName = name
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^0-9a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (normalizedName) {
      normalized = normalized.split(normalizedName).join(" ");
    }
  });

  return normalized.replace(/\s+/g, " ").trim();
}

function addToken(vector: DraftVector, token: string, weight = 1) {
  if (!token) return;
  vector.set(token, (vector.get(token) || 0) + weight);
}

function buildDraftVector(text: string): DraftVector {
  const vector: DraftVector = new Map();
  const words = text.split(" ").filter((word) => word.length > 1);
  const compactText = text.replace(/\s/g, "");

  words.forEach((word) => addToken(vector, `w:${word}`, 1.4));

  [2, 3].forEach((size) => {
    if (compactText.length < size) return;

    for (let index = 0; index <= compactText.length - size; index += 1) {
      addToken(vector, `g${size}:${compactText.slice(index, index + size)}`);
    }
  });

  if (vector.size === 0 && compactText) {
    addToken(vector, `raw:${compactText}`);
  }

  return vector;
}

function cosineSimilarity(left: DraftVector, right: DraftVector) {
  if (left.size === 0 || right.size === 0) return 0;

  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  left.forEach((value, key) => {
    leftNorm += value * value;
    dotProduct += value * (right.get(key) || 0);
  });

  right.forEach((value) => {
    rightNorm += value * value;
  });

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function statusFromPercentage(percentage: number): DraftSimilarityStatus {
  if (percentage >= duplicateDraftThresholdPercent) return "duplicate";
  if (percentage >= similarDraftThresholdPercent) return "similar";
  return "normal";
}

export function analyzeDraftSimilarity(items: DraftSimilarityInput[]) {
  const studentNames = items.map((item) => item.studentName).filter(Boolean);
  const vectors = items.map((item) => ({
    item,
    vector: buildDraftVector(normalizeDraftText(item.draft, studentNames))
  }));
  const results: Record<string, DraftSimilarityResult> = {};

  vectors.forEach(({ item }) => {
    results[item.studentId] = {
      studentId: item.studentId,
      studentName: item.studentName,
      similarity: 0,
      percentage: 0,
      status: "normal"
    };
  });

  for (let leftIndex = 0; leftIndex < vectors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < vectors.length; rightIndex += 1) {
      const left = vectors[leftIndex];
      const right = vectors[rightIndex];
      const similarity = cosineSimilarity(left.vector, right.vector);

      if (similarity > results[left.item.studentId].similarity) {
        const percentage = Math.round(similarity * 100);
        results[left.item.studentId] = {
          studentId: left.item.studentId,
          studentName: left.item.studentName,
          similarity,
          percentage,
          status: statusFromPercentage(percentage),
          matchedStudentId: right.item.studentId,
          matchedStudentName: right.item.studentName
        };
      }

      if (similarity > results[right.item.studentId].similarity) {
        const percentage = Math.round(similarity * 100);
        results[right.item.studentId] = {
          studentId: right.item.studentId,
          studentName: right.item.studentName,
          similarity,
          percentage,
          status: statusFromPercentage(percentage),
          matchedStudentId: left.item.studentId,
          matchedStudentName: left.item.studentName
        };
      }
    }
  }

  return results;
}

export function getDraftSimilarityStatusMeta(status?: DraftSimilarityStatus | null) {
  if (status === "duplicate") {
    return {
      label: "중복 의심",
      className: "border-rose-200 bg-rose-50 text-rose-700"
    };
  }

  if (status === "similar") {
    return {
      label: "유사",
      className: "border-amber-200 bg-amber-50 text-amber-800"
    };
  }

  if (status === "normal") {
    return {
      label: "정상",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700"
    };
  }

  return {
    label: "미분석",
    className: "border-slate-200 bg-slate-50 text-slate-600"
  };
}
