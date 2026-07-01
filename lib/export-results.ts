import type { DraftSimilarityStatus } from "@/lib/draft-quality";

export const subjectCommentResultsFileName = "subject-comments-results.xlsx";
export const behaviorCommentResultsFileName = "behavior-comments-results.xlsx";

const subjectCommentResultsSheetName = "과세특결과";
const behaviorCommentResultsSheetName = "행특결과";

export type ExportGenerationStatus = "completed" | "failed";

type BaseCommentResultExportRow = {
  grade: string;
  className: string;
  number: string;
  name: string;
  department: string;
  draft: string;
  similarityPercentage?: number | null;
  similarityStatus?: DraftSimilarityStatus | null;
  generationStatus: ExportGenerationStatus;
};

export type SubjectCommentResultExportRow = BaseCommentResultExportRow & {
  subjectName: string;
  unit: string;
};

export type BehaviorCommentResultExportRow = BaseCommentResultExportRow;

const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function normalizeCellText(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function formatSimilarityPercentage(row: BaseCommentResultExportRow) {
  if (row.generationStatus !== "completed" || typeof row.similarityPercentage !== "number") return "";
  return `${row.similarityPercentage}%`;
}

function getSimilarityStatusLabel(row: BaseCommentResultExportRow) {
  if (row.generationStatus !== "completed") return "";

  if (row.similarityStatus === "duplicate") return "중복 의심";
  if (row.similarityStatus === "similar") return "유사";
  if (row.similarityStatus === "normal") return "정상";
  return "미분석";
}

function getGenerationStatusLabel(status: ExportGenerationStatus) {
  return status === "completed" ? "완료" : "실패";
}

async function downloadWorkbook(fileName: string, sheetName: string, rows: string[][], columnWidths: number[]) {
  const { utils, write } = await import("xlsx");
  const worksheet = utils.aoa_to_sheet(rows);

  worksheet["!cols"] = columnWidths.map((width) => ({ wch: width }));
  worksheet["!rows"] = rows.map((row, index) => {
    if (index === 0) return { hpt: 24 };
    const longestCellLength = Math.max(...row.map((cell) => cell.length));
    return { hpt: Math.min(180, Math.max(28, Math.ceil(longestCellLength / 60) * 18)) };
  });

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, sheetName);

  const workbookData = write(workbook, {
    bookType: "xlsx",
    type: "array"
  }) as ArrayBuffer;

  const blob = new Blob([workbookData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSubjectCommentResults(rows: SubjectCommentResultExportRow[]) {
  const sheetRows = [
    ["학년", "반", "번호", "이름", "학과", "과목명", "단원명", "최종 출력 내용", "유사도", "유사도 상태", "생성 상태"],
    ...rows.map((row) => [
      row.grade,
      row.className,
      row.number,
      row.name,
      row.department,
      row.subjectName,
      row.unit,
      row.generationStatus === "completed" ? normalizeCellText(row.draft) : "",
      formatSimilarityPercentage(row),
      getSimilarityStatusLabel(row),
      getGenerationStatusLabel(row.generationStatus)
    ])
  ];

  await downloadWorkbook(subjectCommentResultsFileName, subjectCommentResultsSheetName, sheetRows, [10, 8, 8, 14, 20, 20, 24, 90, 10, 14, 12]);
}

export async function downloadBehaviorCommentResults(rows: BehaviorCommentResultExportRow[]) {
  const sheetRows = [
    ["학년", "반", "번호", "이름", "학과", "최종 출력 내용", "유사도", "유사도 상태", "생성 상태"],
    ...rows.map((row) => [
      row.grade,
      row.className,
      row.number,
      row.name,
      row.department,
      row.generationStatus === "completed" ? normalizeCellText(row.draft) : "",
      formatSimilarityPercentage(row),
      getSimilarityStatusLabel(row),
      getGenerationStatusLabel(row.generationStatus)
    ])
  ];

  await downloadWorkbook(behaviorCommentResultsFileName, behaviorCommentResultsSheetName, sheetRows, [10, 8, 8, 14, 20, 90, 10, 14, 12]);
}
