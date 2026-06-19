export const gradeOptions = ["1학년", "2학년", "3학년"] as const;

export const departmentOptions = [
  { value: "materials", label: "재료기술과" },
  { value: "automation_machine", label: "자동화기계과" },
  { value: "electrical_electronic_control", label: "전기전자제어과" }
] as const;

export const subjectOptions = [
  "재료일반",
  "금속재료",
  "기계기초공작",
  "기계제도",
  "이차전지기초",
  "자동화설비",
  "공압유압제어",
  "PLC제어",
  "전기회로",
  "전자회로",
  "전기전자제어"
] as const;

export const activityTypeOptions = [
  "실습 참여",
  "프로젝트 수행",
  "문제 해결",
  "장비 조작",
  "도면 해석",
  "회로 구성",
  "안전수칙 준수",
  "협업",
  "발표",
  "보고서 작성"
] as const;

export const competencyOptions = [
  "직무 이해도",
  "실습 집중도",
  "정밀성",
  "책임감",
  "자기주도성",
  "의사소통",
  "개선 의지",
  "창의적 문제 해결",
  "품질 관리 의식"
] as const;

export const improvementOptions = [
  "발표 자신감",
  "보고서 구체성",
  "작업속도",
  "이론 보완",
  "안전점검 습관"
] as const;

export const schoolLifeAreaOptions = [
  "기본생활습관",
  "근태",
  "예절",
  "책임감",
  "성실성",
  "협동심",
  "배려",
  "리더십",
  "자기관리",
  "의사소통",
  "갈등 조정",
  "봉사활동",
  "진로 태도",
  "학교 행사 참여",
  "학급 역할 수행"
] as const;

export const industrialAttitudeOptions = [
  "안전수칙 준수",
  "실습실 정리정돈",
  "장비 관리 태도",
  "협업 태도",
  "작업 책임감",
  "직업윤리",
  "현장실습 태도",
  "취업 준비 태도"
] as const;

export const behaviorImprovementOptions = [
  "시간 관리",
  "발표 자신감",
  "자기표현",
  "감정 조절",
  "지속적 노력",
  "규칙 준수"
] as const;

export const commentLengthOptions = [
  { value: "short", label: "짧게", help: "1문장, 150자 안팎" },
  { value: "medium", label: "보통", help: "1~2문장, 250자 안팎" },
  { value: "long", label: "자세히", help: "2~3문장, 400자 안팎" }
] as const;

export const documentTypeOptions = [
  { value: "learning_goal", label: "교과서 학습목표" },
  { value: "curriculum", label: "학과별 교육과정" },
  { value: "ncs_unit", label: "NCS 능력단위" },
  { value: "rubric", label: "평가 루브릭" }
] as const;
