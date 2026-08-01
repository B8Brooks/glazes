"use client";

import { useRef, useState } from "react";
import { addStock } from "@/lib/actions";
import { DISPLAY_UNITS } from "@/lib/units";

// The "Received more" row on a material card. Clears itself after a
// successful submit; Add stays disabled while the box is empty.
export function QuickAddStockForm({
  materialId,
  defaultUnit,
}: {
  materialId: number;
  defaultUnit: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState("");
  const disabled = !(parseFloat(amount) > 0);

  async function submit(formData: FormData) {
    await addStock(formData);
    formRef.current?.reset();
    setAmount("");
  }

  return (
    <form ref={formRef} action={submit} className="flex items-end gap-2">
      <input type="hidden" name="id" value={materialId} />
      <label className="text-xs text-stone-500">
        Received more
        <input
          name="amount"
          type="number"
          step="any"
          min="0"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-24 rounded-lg border border-stone-300 px-2 py-2 text-sm"
        />
      </label>
      <select
        name="unit"
        defaultValue={defaultUnit}
        className="rounded-lg border border-stone-300 px-2 py-2 text-sm"
      >
        {DISPLAY_UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.value}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
