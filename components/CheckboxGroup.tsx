"use client";

import { Check } from "lucide-react";

type CheckboxGroupProps = {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
};

export function CheckboxGroup({ label, options, values, onChange }: CheckboxGroupProps) {
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = values.includes(option);
          return (
            <button
              type="button"
              key={option}
              aria-pressed={checked}
              onClick={() => toggle(option)}
              className={`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
                checked
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                }`}
              >
                {checked ? <Check size={14} aria-hidden="true" /> : null}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
