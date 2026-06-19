import type { Student } from "@/lib/types";

export const sampleStudents: Student[] = [
  {
    id: "student-1",
    name: "김도윤",
    grade: "2학년",
    department: "automation_machine",
    className: "2-1",
    number: "01"
  },
  {
    id: "student-2",
    name: "이서연",
    grade: "2학년",
    department: "electrical_electronic_control",
    className: "2-2",
    number: "07"
  },
  {
    id: "student-3",
    name: "박민준",
    grade: "1학년",
    department: "materials",
    className: "1-1",
    number: "12"
  }
];

export const studentStorageKey = "industrial-student-record-ai:students";

export function readStoredStudents(): Student[] {
  if (typeof window === "undefined") {
    return sampleStudents;
  }

  const raw = window.localStorage.getItem(studentStorageKey);
  if (!raw) {
    return sampleStudents;
  }

  try {
    const parsed = JSON.parse(raw) as Student[];
    return parsed.length > 0 ? parsed : sampleStudents;
  } catch {
    return sampleStudents;
  }
}

export function writeStoredStudents(students: Student[]) {
  window.localStorage.setItem(studentStorageKey, JSON.stringify(students));
}
