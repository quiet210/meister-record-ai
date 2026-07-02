export const curriculumStandardsTemplateFileName = "curriculum-standards-template.xlsx";

const curriculumStandardsTemplateSheetName = "성취기준업로드양식";
const curriculumStandardsGuideSheetName = "안내";

const curriculumStandardsTemplateRows = [
  ["과목명", "교과유형", "학습모듈명", "단원명", "성취기준", "핵심키워드"],
  ["PLC제어", "NCS교과", "PLC 기본 제어", "PLC 입출력 제어", "PLC의 입출력 동작 원리를 이해하고 기본 명령어를 활용할 수 있다", "PLC, 래더도, 입출력, 타이머"],
  ["수학", "일반교과", "", "함수", "함수의 개념을 이해하고 그래프를 해석할 수 있다", ""]
];

const curriculumStandardsGuideRows = [
  ["안내문구"],
  ["핵심키워드는 선택 입력입니다."],
  ["NCS교과는 학습모듈명 입력을 권장합니다."]
];

export async function downloadCurriculumStandardsTemplate() {
  const { utils, write } = await import("xlsx");
  const worksheet = utils.aoa_to_sheet(curriculumStandardsTemplateRows);
  worksheet["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 64 }, { wch: 34 }];
  const guideWorksheet = utils.aoa_to_sheet(curriculumStandardsGuideRows);
  guideWorksheet["!cols"] = [{ wch: 48 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, curriculumStandardsTemplateSheetName);
  utils.book_append_sheet(workbook, guideWorksheet, curriculumStandardsGuideSheetName);

  const workbookData = write(workbook, {
    bookType: "xlsx",
    type: "array"
  }) as ArrayBuffer;

  const blob = new Blob([workbookData], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = curriculumStandardsTemplateFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
