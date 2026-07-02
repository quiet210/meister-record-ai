"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { curriculumSubjectTypeLabels, listCurriculumStandards, type CurriculumStandard, type CurriculumSubjectType } from "@/lib/curriculum";
import type { SettingsSubjectOption } from "@/lib/admin-settings";

function normalizeExactValue(value?: string | null) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function normalizeLookupValue(value?: string | null) {
  return normalizeExactValue(value).toLowerCase();
}

function uniqueNonEmptyValues(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeExactValue(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });

  return result;
}

type UseSubjectLearningModuleInput = {
  enabled?: boolean;
  subjectName: string;
  curriculumSubjects: SettingsSubjectOption[];
  setUnit: Dispatch<SetStateAction<string>>;
};

export function useSubjectLearningModule({ enabled = true, subjectName, curriculumSubjects, setUnit }: UseSubjectLearningModuleInput) {
  const [learningModule, setLearningModule] = useState("");
  const [standards, setStandards] = useState<CurriculumStandard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedSubjectName = normalizeLookupValue(subjectName);
  const selectedSubject = useMemo(
    () => curriculumSubjects.find((subject) => normalizeLookupValue(subject.subjectName) === normalizedSubjectName),
    [curriculumSubjects, normalizedSubjectName]
  );
  const selectedSubjectType: CurriculumSubjectType = selectedSubject?.subjectType || "general";
  const selectedSubjectName = selectedSubject?.subjectName || normalizeExactValue(subjectName);
  const isNcsSubject = selectedSubjectType === "ncs";

  useEffect(() => {
    setLearningModule("");
    setStandards([]);
    setError("");
  }, [normalizedSubjectName]);

  useEffect(() => {
    if (!enabled || !selectedSubjectName || !isNcsSubject) {
      setStandards([]);
      setIsLoading(false);
      setError("");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError("");

    listCurriculumStandards({ subjectName: selectedSubjectName, status: "active" })
      .then((result) => {
        if (!isMounted) return;
        setStandards(result.standards);
        setError(result.error || "");
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setStandards([]);
        setError(loadError instanceof Error ? loadError.message : "학습모듈 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, isNcsSubject, selectedSubjectName]);

  const learningModuleOptions = useMemo(() => uniqueNonEmptyValues(standards.map((standard) => standard.learningModule)), [standards]);
  const normalizedLearningModule = normalizeLookupValue(learningModule);
  const moduleStandards = useMemo(
    () =>
      normalizedLearningModule
        ? standards.filter((standard) => normalizeLookupValue(standard.learningModule) === normalizedLearningModule)
        : [],
    [normalizedLearningModule, standards]
  );
  const unitOptions = useMemo(() => uniqueNonEmptyValues(moduleStandards.map((standard) => standard.unitName)), [moduleStandards]);
  const previewStandards = useMemo(() => moduleStandards.slice(0, 5), [moduleStandards]);
  const unitOptionsKey = unitOptions.join("\u001f");
  const learningModuleOptionsKey = learningModuleOptions.join("\u001f");

  useEffect(() => {
    if (!isNcsSubject && learningModule) {
      setLearningModule("");
    }
  }, [isNcsSubject, learningModule]);

  useEffect(() => {
    if (!learningModule || learningModuleOptions.length === 0) return;
    if (!learningModuleOptions.includes(learningModule)) {
      setLearningModule("");
    }
  }, [learningModule, learningModuleOptions.length, learningModuleOptionsKey]);

  useEffect(() => {
    if (!learningModule || unitOptions.length !== 1) return;
    setUnit(unitOptions[0]);
  }, [learningModule, setUnit, unitOptions.length, unitOptionsKey]);

  return {
    learningModule,
    setLearningModule,
    selectedSubject,
    selectedSubjectType,
    selectedSubjectTypeLabel: curriculumSubjectTypeLabels[selectedSubjectType],
    isNcsSubject,
    learningModuleOptions,
    unitOptions,
    previewStandards,
    isLearningModuleLoading: isLoading,
    learningModuleError: error
  };
}
