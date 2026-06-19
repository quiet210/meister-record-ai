"use client";

import { Check } from "lucide-react";

type SelectableChipGroupProps = {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  compact?: boolean;
};

export function SelectableChipGroup({ label, options, values, onChange, compact = false }: SelectableChipGroupProps) {
  function toggle(option: string) {
    if (values.includes(option)) {
      onChange(values.filter((value) => value !== option));
      return;
    }

    onChange([...values, option]);
  }

  return (
    <fieldset className="space-y-3">
      <legend className="field-label">{label}</legend>
      <div className={`grid grid-cols-2 gap-2 ${compact ? "sm:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option)}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                selected
                  ? "border-blue-600 bg-blue-50 text-blue-800 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
              }`}
            >
              <span className="min-w-0 leading-5">{option}</span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  selected ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-transparent"
                }`}
              >
                <Check size={13} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
