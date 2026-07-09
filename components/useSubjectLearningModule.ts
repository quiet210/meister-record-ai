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
  units: string[];
  setUnit: Dispatch<SetStateAction<string>>;
  setUnits: Dispatch<SetStateAction<string[]>>;
};

export function useSubjectLearningModule({ enabled = true, subjectName, curriculumSubjects, units, setUnit, setUnits }: UseSubjectLearningModuleInput) {
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
    setUnit("");
    setUnits([]);
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
  const selectedUnitSet = useMemo(() => new Set(units.map(normalizeLookupValue).filter(Boolean)), [units]);
  const previewStandards = useMemo(
    () =>
      selectedUnitSet.size > 0
        ? moduleStandards.filter((standard) => selectedUnitSet.has(normalizeLookupValue(standard.unitName))).slice(0, 5)
        : moduleStandards.slice(0, 5),
    [moduleStandards, selectedUnitSet]
  );
  const learningModuleOptionsKey = learningModuleOptions.join("\u001f");

  useEffect(() => {
    if (!isNcsSubject && learningModule) {
      setLearningModule("");
      setUnit("");
      setUnits([]);
    }
  }, [isNcsSubject, learningModule, setUnit, setUnits]);

  useEffect(() => {
    if (!learningModule || learningModuleOptions.length === 0) return;
    if (!learningModuleOptions.includes(learningModule)) {
      setLearningModule("");
    }
  }, [learningModule, learningModuleOptions.length, learningModuleOptionsKey]);

  useEffect(() => {
    setUnit("");
    setUnits([]);
  }, [normalizedLearningModule, setUnit, setUnits]);

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
