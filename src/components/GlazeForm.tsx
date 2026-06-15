import { VOLUME_UNITS, fromMl, type VolumeUnit } from "@/lib/units";
import { GLAZE_STATUSES } from "@/lib/glazeStatus";
import { createGlaze, updateGlaze } from "@/lib/actions";
import type { Glaze } from "@/db/schema";
import Link from "next/link";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-stone-500 focus:outline-none";

export function GlazeForm({
  glaze,
  recipes,
}: {
  glaze?: Glaze;
  recipes: { id: number; name: string }[];
}) {
  const editing = Boolean(glaze);
  const unit = (glaze?.displayVolumeUnit ?? "quart") as VolumeUnit;
  const volume = glaze ? fromMl(glaze.volumeMl, unit) : "";

  return (
    <form action={editing ? updateGlaze : createGlaze} className="space-y-4">
      {editing && <input type="hidden" name="id" value={glaze!.id} />}

      <label className="block">
        <span className="text-sm font-medium text-stone-700">Glaze name</span>
        <input
          name="name"
          required
          defaultValue={glaze?.name ?? ""}
          placeholder="e.g. Frost Green"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Amount on hand
          </span>
          <input
            name="volume"
            type="number"
            step="any"
            min="0"
            defaultValue={volume}
            placeholder="0"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Unit</span>
          <select
            name="displayVolumeUnit"
            defaultValue={unit}
            className={inputClass}
          >
            {VOLUME_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Consistency
          </span>
          <select
            name="status"
            defaultValue={glaze?.status ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {GLAZE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Recipe (optional)
          </span>
          <select
            name="recipeId"
            defaultValue={glaze?.recipeId ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">
          Notes (optional)
        </span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={glaze?.notes ?? ""}
          placeholder="Cone, results, where it's stored…"
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700"
        >
          {editing ? "Save changes" : "Add glaze"}
        </button>
        <Link href="/glazes" className="text-stone-600 hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
