import { createSupabaseBrowserClient, getClientDefaultSchoolId } from "@/lib/supabase";
import { coerceToActiveSchoolCode, getSchoolName } from "@/lib/schools";
import { sortStudents } from "@/lib/student-sort";
import type { Department, Student } from "@/lib/types";

export type StudentInput = {
  name: string;
  grade: Student["grade"];
  department: Department;
  className: string;
  number: string;
};

export type UserProfile = {
  id: string;
  school_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
};

type StudentRow = {
  id: string;
  school_id: string;
  name: string;
  grade: Student["grade"];
  department: Department;
  class_name: string;
  number: string;
  created_by: string | null;
};

type StudentsResult = {
  students: Student[];
  error?: string;
};

type StudentResult = {
  student?: Student;
  error?: string;
};

type StudentsBulkResult = {
  students: Student[];
  error?: string;
};

type DeleteStudentsResult = {
  deletedCount: number;
  errors: string[];
  error?: string;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

const studentColumns = "id, school_id, name, grade, department, class_name, number, created_by";

function normalizeStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    department: row.department,
    className: row.class_name,
    number: row.number
  };
}

function formatSupabaseError(action: string, error: SupabaseErrorLike) {
  const message = error.message || "알 수 없는 Supabase 오류가 발생했습니다.";
  const context = [error.details, error.hint, error.code ? `code: ${error.code}` : ""].filter(Boolean).join(" / ");
  const rlsHint = /row-level security|rls|permission denied/i.test(`${message} ${context}`)
    ? " RLS 정책이 막았을 수 있습니다. public.users 프로필의 school_id와 students.school_id가 같은지 확인하세요."
    : "";

  return `${action} 실패: ${message}${context ? ` (${context})` : ""}${rlsHint}`;
}

function logSupabaseError(action: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[students] ${action} failed`, {
    error,
    ...context
  });
}

function cleanStudentInput(input: StudentInput) {
  return {
    name: input.name.trim(),
    grade: input.grade,
    department: input.department,
    class_name: input.className.trim() || "-",
    number: input.number.trim() || "-"
  };
}

export async function ensureUserProfile(): Promise<{ profile?: UserProfile; error?: string }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return {
      error: "Supabase 환경변수가 설정되지 않았습니다. Vercel 또는 .env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 설정하세요."
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return { error: authError.message };
  }

  const authUser = authData.user;
  if (!authUser) {
    return { error: "로그인이 필요합니다." };
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from("users")
    .select("id, school_id, email, name, role, created_at, updated_at")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existingProfile) {
    return { profile: existingProfile as UserProfile };
  }

  if (selectError) {
    const formattedError = formatSupabaseError("사용자 프로필 조회", selectError);
    logSupabaseError("ensureUserProfile.selectProfile", selectError, { authUserId: authUser.id });
    return { error: formattedError };
  }

  const metadataSchoolId = typeof authUser.user_metadata?.school_id === "string" ? authUser.user_metadata.school_id.trim() : "";
  const schoolId = coerceToActiveSchoolCode(metadataSchoolId || getClientDefaultSchoolId());
  const name = String(authUser.user_metadata?.name || authUser.email?.split("@")[0] || "교사");
  const email = authUser.email || "";

  const { error: schoolError } = await supabase.from("schools").upsert({
    id: schoolId,
    name: getSchoolName(schoolId)
  });

  if (schoolError) {
    const formattedError = formatSupabaseError("학교 ID 준비", schoolError);
    logSupabaseError("ensureUserProfile.upsertSchool", schoolError, { schoolId, authUserId: authUser.id });
    return { error: formattedError };
  }

  const { data: createdProfile, error: insertError } = await supabase
    .from("users")
    .insert({
      id: authUser.id,
      school_id: schoolId,
      email,
      name,
      role: "teacher"
    })
    .select("id, school_id, email, name, role, created_at, updated_at")
    .single();

  if (insertError) {
    const { data: retriedProfile, error: retryError } = await supabase
      .from("users")
      .select("id, school_id, email, name, role, created_at, updated_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (retriedProfile) {
      return { profile: retriedProfile as UserProfile };
    }

    const sourceError = retryError || insertError;
    const formattedError = formatSupabaseError("사용자 프로필 생성", sourceError);
    logSupabaseError("ensureUserProfile.insertProfile", sourceError, { schoolId, authUserId: authUser.id });
    return { error: formattedError };
  }

  return { profile: createdProfile as UserProfile };
}

export async function listStudents(): Promise<StudentsResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return {
      students: [],
      error: "Supabase 환경변수가 설정되지 않았습니다."
    };
  }

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) {
    return {
      students: [],
      error: profileResult.error
    };
  }

  const { data, error } = await supabase
    .from("students")
    .select(studentColumns)
    .eq("school_id", profileResult.profile.school_id)
    .order("grade", { ascending: true })
    .order("class_name", { ascending: true })
    .order("number", { ascending: true });

  if (error) {
    const formattedError = formatSupabaseError("학생 목록 조회", error);
    logSupabaseError("listStudents.selectStudents", error, { schoolId: profileResult.profile.school_id });
    return {
      students: [],
      error: formattedError
    };
  }

  return {
    students: sortStudents(((data || []) as StudentRow[]).map(normalizeStudent))
  };
}

export async function createStudent(input: StudentInput): Promise<StudentResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 환경변수가 설정되지 않았습니다." };
  if (!input.name.trim()) return { error: "학생 이름을 입력하세요." };

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) return { error: profileResult.error };

  const cleanedInput = cleanStudentInput(input);
  const insertPayload = {
    ...cleanedInput,
    school_id: profileResult.profile.school_id,
    created_by: profileResult.profile.id
  };

  const { data, error } = await supabase
    .from("students")
    .insert(insertPayload)
    .select(studentColumns)
    .single();

  if (error) {
    const formattedError = formatSupabaseError("학생 추가", error);
    logSupabaseError("createStudent.insertStudent", error, {
      schoolId: insertPayload.school_id,
      createdBy: insertPayload.created_by,
      grade: insertPayload.grade,
      department: insertPayload.department,
      className: insertPayload.class_name,
      number: insertPayload.number,
      hasName: Boolean(insertPayload.name)
    });
    return { error: formattedError };
  }

  if (!data) {
    const errorMessage = "학생 추가 실패: insert 응답이 비어 있습니다. Supabase students 테이블과 RLS select 정책을 확인하세요.";
    logSupabaseError("createStudent.emptyInsertResponse", errorMessage, {
      schoolId: insertPayload.school_id,
      createdBy: insertPayload.created_by
    });
    return { error: errorMessage };
  }

  return { student: normalizeStudent(data as StudentRow) };
}

export async function createStudents(inputs: StudentInput[]): Promise<StudentsBulkResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { students: [], error: "Supabase 환경변수가 설정되지 않았습니다." };

  const validInputs = inputs.filter((input) => input.name.trim());
  if (validInputs.length === 0) {
    return {
      students: [],
      error: "업로드할 학생 데이터가 없습니다."
    };
  }

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) {
    return {
      students: [],
      error: profileResult.error
    };
  }

  const profile = profileResult.profile;
  const insertPayloads = validInputs.map((input) => ({
    ...cleanStudentInput(input),
    school_id: profile.school_id,
    created_by: profile.id
  }));

  const { data, error } = await supabase.from("students").insert(insertPayloads).select(studentColumns);

  if (error) {
    const formattedError = formatSupabaseError("학생 엑셀 업로드", error);
    logSupabaseError("createStudents.insertStudents", error, {
      schoolId: profile.school_id,
      createdBy: profile.id,
      count: insertPayloads.length
    });
    return {
      students: [],
      error: formattedError
    };
  }

  if (!data) {
    const errorMessage = "학생 엑셀 업로드 실패: insert 응답이 비어 있습니다. Supabase students 테이블과 RLS select 정책을 확인하세요.";
    logSupabaseError("createStudents.emptyInsertResponse", errorMessage, {
      schoolId: profile.school_id,
      createdBy: profile.id,
      count: insertPayloads.length
    });
    return {
      students: [],
      error: errorMessage
    };
  }

  return {
    students: sortStudents(((data || []) as StudentRow[]).map(normalizeStudent))
  };
}

export async function updateStudent(id: string, input: StudentInput): Promise<StudentResult> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 환경변수가 설정되지 않았습니다." };
  if (!input.name.trim()) return { error: "학생 이름을 입력하세요." };

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) return { error: profileResult.error };

  const { data, error } = await supabase
    .from("students")
    .update(cleanStudentInput(input))
    .eq("id", id)
    .eq("school_id", profileResult.profile.school_id)
    .select(studentColumns)
    .single();

  if (error) {
    const formattedError = formatSupabaseError("학생 수정", error);
    logSupabaseError("updateStudent.updateStudent", error, { id, schoolId: profileResult.profile.school_id });
    return { error: formattedError };
  }
  return { student: normalizeStudent(data as StudentRow) };
}

export async function deleteStudent(id: string): Promise<{ error?: string }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase 환경변수가 설정되지 않았습니다." };

  const profileResult = await ensureUserProfile();
  if (!profileResult.profile) return { error: profileResult.error };

  const { data: studentData, error: selectError } = await supabase
    .from("students")
    .select(studentColumns)
    .eq("id", id)
    .eq("school_id", profileResult.profile.school_id)
    .maybeSingle();

  if (selectError) {
    const formattedError = formatSupabaseError("삭제 대상 학생 조회", selectError);
    logSupabaseError("deleteStudent.selectStudent", selectError, { id, schoolId: profileResult.profile.school_id });
    return { error: formattedError };
  }

  if (!studentData) {
    return { error: "학생 삭제 실패: 삭제할 학생을 찾지 못했습니다." };
  }

  const student = studentData as StudentRow;
  const archivedAt = new Date().toISOString();
  const { error: archiveError } = await supabase
    .from("record_drafts")
    .update({
      is_current: false,
      deleted_student_id: student.id,
      deleted_student_name: student.name,
      deleted_student_grade: student.grade,
      deleted_student_department: student.department,
      deleted_student_class: student.class_name,
      deleted_student_number: student.number,
      archived_at: archivedAt,
      archive_reason: "student_deleted"
    })
    .eq("student_id", id)
    .eq("school_id", profileResult.profile.school_id);

  if (archiveError) {
    const formattedError = formatSupabaseError("학생부 기록 archive", archiveError);
    logSupabaseError("deleteStudent.archiveRecordDrafts", archiveError, {
      id,
      schoolId: profileResult.profile.school_id
    });
    return { error: formattedError };
  }

  const { error } = await supabase.from("students").delete().eq("id", id).eq("school_id", profileResult.profile.school_id);
  if (error) {
    const formattedError = formatSupabaseError("학생 삭제", error);
    logSupabaseError("deleteStudent.deleteStudent", error, { id, schoolId: profileResult.profile.school_id });
    return { error: formattedError };
  }

  return {};
}

export async function deleteStudents(ids: string[]): Promise<DeleteStudentsResult> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const errors: string[] = [];
  let deletedCount = 0;

  for (const id of uniqueIds) {
    const result = await deleteStudent(id);
    if (result.error) {
      errors.push(result.error);
    } else {
      deletedCount += 1;
    }
  }

  return {
    deletedCount,
    errors,
    error: errors.length > 0 ? `${deletedCount}명 삭제 완료, ${errors.length}명 삭제 실패` : undefined
  };
}
