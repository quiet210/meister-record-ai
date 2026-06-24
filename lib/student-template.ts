export const studentUploadTemplateFileName = "student-upload-template.xlsx";

const studentUploadTemplateSheetName = "학생업로드양식";

const studentUploadTemplateRows = [
  ["이름", "학년", "학과", "반", "번호", "성별", "비고"],
  ["홍길동", "1학년", "자동화설비과", "1", "1", "남", ""],
  ["김민지", "2학년", "전기전자과", "2", "12", "여", ""]
];

export async function downloadStudentUploadTemplate() {
  const { utils, write } = await import("xlsx");
  const worksheet = utils.aoa_to_sheet(studentUploadTemplateRows);
  worksheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 24 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, studentUploadTemplateSheetName);

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
  link.download = studentUploadTemplateFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
