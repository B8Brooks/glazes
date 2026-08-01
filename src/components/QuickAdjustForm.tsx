"use client";

import { useRef, useState } from "react";
import { adjustGlazeVolume } from "@/lib/actions";
import { VOLUME_UNITS } from "@/lib/units";

// The Use/Add row on a glaze card. Clears itself after a successful submit so
// a leftover value can't be applied twice by accident, and keeps the buttons
// disabled while the amount box is empty.
export function QuickAdjustForm({
  glazeId,
  defaultUnit,
}: {
  glazeId: number;
  defaultUnit: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState("");
  const disabled = !(parseFloat(amount) > 0);

  async function submit(formData: FormData) {
    await adjustGlazeVolume(formData);
    formRef.current?.reset();
    setAmount("");
  }

  return (
    <form ref={formRef} action={submit} className="flex items-end gap-2">
      <input type="hidden" name="id" value={glazeId} />
      <label className="text-xs text-stone-500">
        Amount
        <input
          name="amount"
          type="number"
          step="any"
          min="0"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-20 rounded-lg border border-stone-300 px-2 py-2 text-sm"
        />
      </label>
      <select
        name="unit"
        defaultValue={defaultUnit}
        className="rounded-lg border border-stone-300 px-2 py-2 text-sm"
      >
        {VOLUME_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        name="direction"
        value="use"
        disabled={disabled}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
      >
        Use
      </button>
      <button
        type="submit"
        name="direction"
        value="add"
        disabled={disabled}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
