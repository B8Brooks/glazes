import { DISPLAY_UNITS, fromGrams, type DisplayUnit } from "@/lib/units";
import { createMaterial, updateMaterial } from "@/lib/actions";
import type { Ingredient } from "@/db/schema";
import Link from "next/link";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none";

export function MaterialForm({ material }: { material?: Ingredient }) {
  const editing = Boolean(material);
  const unit = (material?.displayUnit ?? "lb") as DisplayUnit;
  const quantity = material ? fromGrams(material.quantityGrams, unit) : "";
  const threshold =
    material?.reorderThresholdGrams != null
      ? fromGrams(material.reorderThresholdGrams, unit)
      : "";

  return (
    <form
      action={editing ? updateMaterial : createMaterial}
      className="space-y-4"
    >
      {editing && <input type="hidden" name="id" value={material!.id} />}

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Material name</span>
        <input
          name="name"
          required
          defaultValue={material?.name ?? ""}
          placeholder="e.g. Custer Feldspar"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Amount on hand
          </span>
          <input
            name="quantity"
            type="number"
            step="any"
            min="0"
            defaultValue={quantity}
            placeholder="0"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Unit</span>
          <select name="displayUnit" defaultValue={unit} className={inputClass}>
            {DISPLAY_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">
          Reorder when below (optional, same unit)
        </span>
        <input
          name="reorderThreshold"
          type="number"
          step="any"
          min="0"
          defaultValue={threshold}
          placeholder="e.g. 5"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">
          Supplier (optional)
        </span>
        <input
          name="supplier"
          defaultValue={material?.supplier ?? ""}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">
          Notes (optional)
        </span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={material?.notes ?? ""}
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700"
        >
          {editing ? "Save changes" : "Add material"}
        </button>
        <Link href="/inventory" className="text-stone-600 hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
