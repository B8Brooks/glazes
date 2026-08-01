"use client";

import { useState } from "react";
import {
  DISPLAY_UNITS,
  VOLUME_UNITS,
  toGrams,
  fromGrams,
  toMl,
  fromMl,
  roundTo,
  type DisplayUnit,
  type VolumeUnit,
} from "@/lib/units";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none";

// Amount input + unit select that CONVERTS the shown number when the unit
// changes (50 lb -> 22.68 kg), so switching units never silently rescales
// what's stored. Used by the material and glaze edit forms.
export function AmountWithUnit({
  kind,
  amountName,
  unitName,
  initialAmount,
  initialUnit,
  amountLabel,
  required,
  secondName,
  secondLabel,
  secondInitial,
}: {
  kind: "weight" | "volume";
  amountName: string;
  unitName: string;
  initialAmount: number | "";
  initialUnit: string;
  amountLabel: string;
  required?: boolean;
  // Optional second amount that shares the same unit (e.g. reorder threshold)
  // and must convert along with it.
  secondName?: string;
  secondLabel?: string;
  secondInitial?: number | "";
}) {
  const [amount, setAmount] = useState<string>(
    initialAmount === "" ? "" : String(roundTo(initialAmount, 3))
  );
  const [second, setSecond] = useState<string>(
    secondInitial === "" || secondInitial === undefined
      ? ""
      : String(roundTo(secondInitial, 3))
  );
  const [unit, setUnit] = useState(initialUnit);

  const units =
    kind === "weight"
      ? DISPLAY_UNITS.map((u) => ({ value: u.value as string, label: u.label }))
      : VOLUME_UNITS.map((u) => ({ value: u.value as string, label: u.label }));

  function convert(value: number, fromUnit: string, toUnit: string): number {
    return kind === "weight"
      ? fromGrams(toGrams(value, fromUnit as DisplayUnit), toUnit as DisplayUnit)
      : fromMl(toMl(value, fromUnit as VolumeUnit), toUnit as VolumeUnit);
  }

  function onUnitChange(nextUnit: string) {
    const value = parseFloat(amount);
    if (Number.isFinite(value)) {
      setAmount(String(roundTo(convert(value, unit, nextUnit), 3)));
    }
    const secondValue = parseFloat(second);
    if (Number.isFinite(secondValue)) {
      setSecond(String(roundTo(convert(secondValue, unit, nextUnit), 3)));
    }
    setUnit(nextUnit);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {amountLabel}
          </span>
          <input
            name={amountName}
            type="number"
            step="any"
            min="0"
            required={required}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Unit</span>
          <select
            name={unitName}
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            className={inputClass}
          >
            {units.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {secondName && (
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {secondLabel}
          </span>
          <input
            name={secondName}
            type="number"
            step="any"
            min="0"
            value={second}
            onChange={(e) => setSecond(e.target.value)}
            placeholder="e.g. 5"
            className={inputClass}
          />
        </label>
      )}
    </>
  );
}
