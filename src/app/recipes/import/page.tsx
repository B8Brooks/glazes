import { BackLink } from "@/components/BackLink";
import { importRecipesCsv } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function ImportRecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { done, error } = await searchParams;

  return (
    <div className="space-y-5">
      <BackLink href="/recipes" label="Recipes" />
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          Import recipes from a spreadsheet
        </h1>
        <p className="mt-1 text-stone-600">
          Bring in many recipes at once from a spreadsheet saved as a CSV file
          (in Excel or Google Sheets: File → Download → Comma-separated values).
        </p>
      </div>

      {done && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {done}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-stone-900">
          How the spreadsheet should look
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          One row per ingredient, with these column headings. Repeat the recipe
          name on each of its rows:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-100 text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="border border-stone-200 bg-stone-50 px-2 py-1 font-medium">
                  Recipe
                </th>
                <th className="border border-stone-200 bg-stone-50 px-2 py-1 font-medium">
                  Ingredient
                </th>
                <th className="border border-stone-200 bg-stone-50 px-2 py-1 font-medium">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="text-stone-700">
              <tr>
                <td className="border border-stone-200 px-2 py-1">Apricot</td>
                <td className="border border-stone-200 px-2 py-1">
                  Custer Feldspar
                </td>
                <td className="border border-stone-200 px-2 py-1">44</td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-2 py-1">Apricot</td>
                <td className="border border-stone-200 px-2 py-1">Whiting</td>
                <td className="border border-stone-200 px-2 py-1">19.9</td>
              </tr>
              <tr>
                <td className="border border-stone-200 px-2 py-1">
                  Carmen&apos;s Turquois
                </td>
                <td className="border border-stone-200 px-2 py-1">
                  Nepheline Syenite
                </td>
                <td className="border border-stone-200 px-2 py-1">52.8</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-600">
          <li>
            An optional <strong>Recipe notes</strong> column is picked up too.
          </li>
          <li>
            New ingredient names are added to your Materials automatically.
          </li>
          <li>
            A recipe whose name is already in the app is skipped, never
            overwritten.
          </li>
        </ul>
      </div>

      <form
        action={importRecipesCsv}
        className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
      >
        <label className="block text-sm font-medium text-stone-700">
          Choose your CSV file
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-stone-700"
          />
        </label>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700"
        >
          Import recipes
        </button>
      </form>
    </div>
  );
}
