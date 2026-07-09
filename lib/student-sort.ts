import type { Student } from "@/lib/types";

const koNaturalCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base"
});

function compareText(a: string, b: string) {
  return koNaturalCollator.compare(a.trim(), b.trim());
}

export function compareStudents(a: Student, b: Student) {
  const byGrade = compareText(a.grade, b.grade);
  if (byGrade !== 0) return byGrade;

  const byDepartment = compareText(a.department, b.department);
  if (byDepartment !== 0) return byDepartment;

  const byClass = compareText(a.className, b.className);
  if (byClass !== 0) return byClass;

  const byNumber = compareText(a.number, b.number);
  if (byNumber !== 0) return byNumber;

  const byName = compareText(a.name, b.name);
  if (byName !== 0) return byName;

  return compareText(a.id, b.id);
}

export function sortStudents<T extends Student>(students: T[]) {
  return [...students].sort(compareStudents);
}

export function sortClassNames(values: string[]) {
  return [...values].sort(compareText);
}
