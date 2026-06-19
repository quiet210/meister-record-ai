import { NextResponse } from "next/server";
import { uploadKnowledgeDocument } from "@/lib/rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          ok: false,
          message: "multipart/form-data 형식으로 파일을 업로드하세요.",
          warnings: ["file, grade, department, subjectName, documentType 필드가 필요합니다."]
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const grade = String(formData.get("grade") || "");
    const department = String(formData.get("department") || "");
    const subjectName = String(formData.get("subjectName") || "");
    const unitTitle = String(formData.get("unitTitle") || "");
    const documentType = String(formData.get("documentType") || "");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: "업로드할 파일을 선택하세요.",
          warnings: ["multipart/form-data의 file 필드가 필요합니다."]
        },
        { status: 400 }
      );
    }

    if (!grade || !department || !subjectName || !documentType) {
      return NextResponse.json(
        {
          ok: false,
          message: "필수 태그를 입력하세요.",
          warnings: ["학년, 학과, 과목, 문서 유형은 필수입니다."]
        },
        { status: 400 }
      );
    }

    const result = await uploadKnowledgeDocument({
      file,
      grade,
      department,
      subjectName,
      unitTitle,
      documentType
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "파일 업로드 처리 중 오류가 발생했습니다.",
        warnings: [error instanceof Error ? error.message : "알 수 없는 오류"]
      },
      { status: 500 }
    );
  }
}
