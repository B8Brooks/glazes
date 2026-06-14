import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          Sheila&apos;s Glazes
        </h1>
        <p className="mt-1 text-stone-600">
          Keep track of your glaze recipes and how much of each material you
          have left.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/recipes"
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Recipes</h2>
          <p className="mt-1 text-sm text-stone-600">
            Write down a glaze by name and its ingredient percentages, then mix
            a batch in grams.
          </p>
        </Link>

        <Link
          href="/inventory"
          className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-stone-300 hover:shadow"
        >
          <h2 className="text-lg font-semibold text-stone-900">Inventory</h2>
          <p className="mt-1 text-sm text-stone-600">
            Track materials in pounds. Mixing a batch subtracts what you used
            automatically.
          </p>
        </Link>
      </div>
    </div>
  );
}
