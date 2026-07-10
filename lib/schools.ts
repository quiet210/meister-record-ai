export type SchoolOption = {
  code: string;
  name: string;
  active: boolean;
};

export const SCHOOL_OPTIONS: SchoolOption[] = [
  {
    code: "POSCO",
    name: "포항제철공업고등학교",
    active: true
  }
];

export const DEFAULT_SCHOOL_CODE = SCHOOL_OPTIONS.find((school) => school.active)?.code || "POSCO";

const schoolCodeAliases: Record<string, string> = {
  posco: "POSCO",
  포항제철공업고등학교: "POSCO",
  abcd123: "POSCO"
};

function normalizeSchoolLookupValue(value?: string | null) {
  return (value || "").trim().replace(/\s+/g, "").toLowerCase();
}

export function getActiveSchoolOptions() {
  return SCHOOL_OPTIONS.filter((school) => school.active);
}

export function getSchoolName(value?: string | null) {
  const trimmedValue = (value || "").trim();
  if (!trimmedValue) return "-";

  const normalizedValue = normalizeSchoolLookupValue(trimmedValue);
  const aliasCode = schoolCodeAliases[normalizedValue];
  const school = SCHOOL_OPTIONS.find(
    (option) =>
      normalizeSchoolLookupValue(option.code) === normalizedValue ||
      normalizeSchoolLookupValue(option.name) === normalizedValue ||
      option.code === aliasCode
  );

  return school?.name || trimmedValue;
}

export function getSchoolCodeByName(value?: string | null) {
  const trimmedValue = (value || "").trim();
  if (!trimmedValue) return "";

  const normalizedValue = normalizeSchoolLookupValue(trimmedValue);
  const school = SCHOOL_OPTIONS.find(
    (option) => normalizeSchoolLookupValue(option.code) === normalizedValue || normalizeSchoolLookupValue(option.name) === normalizedValue
  );

  return school?.code || schoolCodeAliases[normalizedValue] || trimmedValue;
}

export function coerceToActiveSchoolCode(value?: string | null) {
  const code = getSchoolCodeByName(value);
  const activeSchool = SCHOOL_OPTIONS.find((school) => school.active && school.code === code);
  return activeSchool?.code || DEFAULT_SCHOOL_CODE;
}
