"use client";

import { useMemo } from "react";

type SubjectSelectProps = {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

function normalizeSubjectOption(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueSubjectOptions(options: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  options.forEach((option) => {
    const normalized = normalizeSubjectOption(option);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });

  return result;
}

export function SubjectSelect({ value, options, onChange, disabled = false, placeholder = "과목 선택" }: SubjectSelectProps) {
  const subjectOptions = useMemo(() => uniqueSubjectOptions(options), [options]);

  return (
    <select className="input-base" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {subjectOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
