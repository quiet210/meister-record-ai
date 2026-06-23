"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import {
  behaviorIndustrialChecklistCategoryKeys,
  behaviorSchoolLifeChecklistCategoryKeys,
  createChecklistItem,
  deleteChecklistItem,
  listAdminChecklistGroups,
  seedDefaultAdminSettings,
  subjectChecklistCategoryKeys,
  updateChecklistItem,
  type ChecklistCategoryKey,
  type ChecklistGroup,
  type ChecklistItem,
  type ChecklistMode
} from "@/lib/admin-settings";

const allCategoryKeys: ChecklistCategoryKey[] = [
  ...subjectChecklistCategoryKeys,
  ...behaviorSchoolLifeChecklistCategoryKeys,
  ...behaviorIndustrialChecklistCategoryKeys
];

const emptyInputs = allCategoryKeys.reduce(
  (accumulator, key) => ({
    ...accumulator,
    [key]: ""
  }),
  {} as Record<ChecklistCategoryKey, string>
);

type EditingItem = {
  id: string;
  categoryKey: ChecklistCategoryKey;
  label: string;
};

export function AdminChecklistManager() {
  const [mode, setMode] = useState<ChecklistMode>("subject");
  const [groups, setGroups] = useState<ChecklistGroup[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItems, setNewItems] = useState<Record<ChecklistCategoryKey, string>>(emptyInputs);
  const [editing, setEditing] = useState<EditingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadChecklists();
  }, []);

  const visibleGroups = useMemo(() => groups.filter((group) => group.mode === mode), [groups, mode]);

  async function loadChecklists() {
    setIsLoading(true);
    setError("");
    const result = await listAdminChecklistGroups();
    setGroups(result.groups);
    setItems(result.items);
    if (result.error) setError(result.error);
    setIsLoading(false);
  }

  function updateNewItem(key: ChecklistCategoryKey, value: string) {
    setNewItems((current) => ({ ...current, [key]: value }));
  }

  function resetEditing() {
    setEditing(null);
    setMessage("");
    setError("");
  }

  async function addItem(categoryKey: ChecklistCategoryKey) {
    setIsSaving(true);
    setMessage("");
    setError("");

    const result = await createChecklistItem({
      categoryKey,
      label: newItems[categoryKey]
    });

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    setNewItems((current) => ({ ...current, [categoryKey]: "" }));
    await loadChecklists();
    setMessage("체크리스트 항목을 추가했습니다.");
    setIsSaving(false);
  }

  async function saveEditing() {
    if (!editing) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    const result = await updateChecklistItem(editing.id, { label: editing.label });
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    await loadChecklists();
    setEditing(null);
    setMessage("체크리스트 항목을 수정했습니다.");
    setIsSaving(false);
  }

  async function removeItem(item: ChecklistItem) {
    setIsSaving(true);
    setMessage("");
    setError("");

    const result = await deleteChecklistItem(item.id);
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
    if (editing?.id === item.id) setEditing(null);
    setMessage(`${item.label} 항목을 삭제했습니다.`);
    setIsSaving(false);
  }

  async function fillDefaults() {
    setIsSaving(true);
    setMessage("");
    setError("");

    const result = await seedDefaultAdminSettings();
    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    await loadChecklists();
    setMessage("기본 설정값을 채웠습니다.");
    setIsSaving(false);
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm font-semibold text-blue-700">Admin Settings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">체크리스트 관리</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          과세특과 행동특성 작성 화면의 선택 항목을 학교별로 관리합니다.
        </p>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:w-80">
            {(["subject", "behavior"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => setMode(option)}
                className={`min-h-11 rounded-md border px-3 text-sm font-semibold transition ${
                  mode === option ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                }`}
              >
                {option === "subject" ? "과세특" : "행동특성"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="secondary-button w-full sm:w-auto" type="button" disabled={isLoading || isSaving} onClick={loadChecklists}>
              <RefreshCw size={18} aria-hidden="true" className={isLoading ? "animate-spin" : ""} />
              새로고침
            </button>
            <button className="secondary-button w-full sm:w-auto" type="button" disabled={isSaving} onClick={fillDefaults}>
              <RotateCcw size={18} aria-hidden="true" />
              기본값 채우기
            </button>
          </div>
        </div>

        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{error}</p> : null}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">{mode === "subject" ? "과세특 체크리스트" : "행동특성 체크리스트"}</h2>
          <span className="text-xs font-semibold text-slate-500">{visibleGroups.length}개 분류</span>
        </div>

        {isLoading ? (
          <div className="p-5 text-sm text-slate-500">체크리스트를 불러오는 중입니다.</div>
        ) : visibleGroups.length === 0 ? (
          <div className="p-5 text-sm leading-6 text-slate-500">등록된 체크리스트 분류가 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleGroups.map((group) => {
              const groupItems = items.filter((item) => item.categoryKey === group.key);
              return (
                <div key={group.key} className="space-y-4 px-4 py-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-950">{group.label}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{groupItems.length}개 항목</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      className="input-base"
                      value={newItems[group.key]}
                      onChange={(event) => updateNewItem(group.key, event.target.value)}
                      placeholder={`${group.label} 항목 추가`}
                    />
                    <button className="primary-button w-full sm:w-auto" type="button" disabled={!newItems[group.key].trim() || isSaving} onClick={() => addItem(group.key)}>
                      <Plus size={18} aria-hidden="true" />
                      추가
                    </button>
                  </div>

                  {groupItems.length === 0 ? (
                    <p className="text-sm text-slate-500">등록된 항목이 없습니다.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {groupItems.map((item) => {
                        const isEditing = editing?.id === item.id;
                        return (
                          <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                            {isEditing ? (
                              <input
                                className="input-base"
                                value={editing.label}
                                onChange={(event) => setEditing((current) => (current ? { ...current, label: event.target.value } : current))}
                              />
                            ) : (
                              <p className="min-w-0 self-center text-sm font-semibold text-slate-900">{item.label}</p>
                            )}

                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                    onClick={saveEditing}
                                    aria-label={`${item.label} 저장`}
                                    disabled={!editing.label.trim() || isSaving}
                                  >
                                    <Pencil size={17} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                                    onClick={resetEditing}
                                    aria-label={`${item.label} 수정 취소`}
                                    disabled={isSaving}
                                  >
                                    <X size={17} aria-hidden="true" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                    onClick={() =>
                                      setEditing({
                                        id: item.id,
                                        categoryKey: item.categoryKey,
                                        label: item.label
                                      })
                                    }
                                    aria-label={`${item.label} 수정`}
                                    disabled={isSaving}
                                  >
                                    <Pencil size={17} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                    onClick={() => removeItem(item)}
                                    aria-label={`${item.label} 삭제`}
                                    disabled={isSaving}
                                  >
                                    <Trash2 size={17} aria-hidden="true" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
