import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

type GenerateApiSupabaseClient = SupabaseClient;

type UserProfileRow = {
  id: string;
  school_id: string;
  role: string;
};

export type GenerateApiAuthContext = {
  userId: string;
  schoolId: string;
  role: string;
};

export type GenerateApiAuthResult =
  | {
      supabase: GenerateApiSupabaseClient;
      context: GenerateApiAuthContext;
      response?: never;
    }
  | {
      supabase?: never;
      context?: never;
      response: NextResponse;
    };

function generateErrorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      draft: "",
      evidence: [],
      warnings: [message]
    },
    { status }
  );
}

function createSupabaseTokenClient(accessToken: string): GenerateApiSupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

export async function getGenerateApiAuthContext(request: Request): Promise<GenerateApiAuthResult> {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const accessToken = match?.[1];

  if (!accessToken) {
    return {
      response: generateErrorResponse("로그인이 필요한 생성 요청입니다.", 401)
    };
  }

  const supabase = createSupabaseServiceClient() || createSupabaseTokenClient(accessToken);
  if (!supabase) {
    return {
      response: generateErrorResponse("Supabase 환경변수가 설정되지 않아 인증을 확인하지 못했습니다.", 500)
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  const authUser = authData.user;
  if (authError || !authUser) {
    return {
      response: generateErrorResponse("로그인 세션을 확인하지 못했습니다.", 401)
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, school_id, role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    return {
      response: generateErrorResponse(`사용자 프로필 조회 실패: ${profileError.message}`, 500)
    };
  }

  if (!profile) {
    return {
      response: generateErrorResponse("사용자 프로필을 찾지 못했습니다.", 403)
    };
  }

  const profileRow = profile as UserProfileRow;
  return {
    supabase,
    context: {
      userId: profileRow.id,
      schoolId: profileRow.school_id,
      role: profileRow.role
    }
  };
}

export async function assertStudentBelongsToSchool(
  supabase: GenerateApiSupabaseClient,
  context: GenerateApiAuthContext,
  studentId?: string | null
) {
  if (!studentId) return null;

  const { data, error } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", context.schoolId)
    .maybeSingle();

  if (error) {
    return generateErrorResponse(`학생 소속 확인 실패: ${error.message}`, 500);
  }

  if (!data) {
    return generateErrorResponse("현재 학교의 학생만 생성 요청에 사용할 수 있습니다.", 403);
  }

  return null;
}
