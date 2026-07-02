export type Department = string;

export type Student = {
  id: string;
  name: string;
  grade: "1학년" | "2학년" | "3학년";
  department: Department;
  className: string;
  number: string;
};

export type CommentMode = "subject" | "behavior";

export type RecordDraftLifecycleStatus = "ai_generated" | "editing" | "saved" | "finalized";

export type KnowledgeDocumentType = "learning_goal" | "curriculum" | "ncs_unit" | "rubric";

export type CommentLength = "short" | "medium" | "long";

export type RagSource = {
  fileId?: string;
  filename: string;
  score?: number;
  text: string;
  attributes?: Record<string, string | number | boolean>;
};

export type SubjectRecordFormPayload = {
  mode: "subject";
  schoolId?: string;
  selectedStudentId?: string;
  studentNo?: string;
  studentName?: string;
  grade: string;
  department: Department;
  subjectName: string;
  learningModule?: string;
  textbook: string;
  unit: string;
  lengthOption?: CommentLength;
  writingStyle?: string;
  activityTypes: string[];
  competencies: string[];
  improvements: string[];
  observationMemo: string;
};

export type BehaviorRecordFormPayload = {
  mode: "behavior";
  studentName?: string;
  grade: string;
  department?: Department;
  className: string;
  schoolLifeAreas: string[];
  industrialAttitudes: string[];
  behaviorImprovements: string[];
  homeroomMemo: string;
  lengthOption?: string;
  writingStyle?: string;
  writingPerspective?: string;
};

export type RecordFormPayload = SubjectRecordFormPayload | BehaviorRecordFormPayload;

export type GenerateResponse = {
  draft: string;
  evidence: string[];
  warnings: string[];
  sources?: RagSource[];
};
