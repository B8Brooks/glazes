import { ConfirmButton } from "@/components/ConfirmButton";
import { restoreBackup } from "@/lib/actions";

export const dynamic = "force-dynamic";

const downloadClass =
  "flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-300 hover:shadow";

function DownloadLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    // download attribute + attachment header => saves the file
    <a href={href} download className={downloadClass}>
      <span>
        <span className="block font-semibold text-stone-900">{title}</span>
        <span className="block text-sm text-stone-600">{desc}</span>
      </span>
      <span className="ml-3 rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white">
        Download
      </span>
    </a>
  );
}

export default async function BackupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; restored?: string }>;
}) {
  const { error, restored } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Backup &amp; export</h1>
        <p className="mt-1 text-stone-600">
          Download a copy of your data anytime. Save these somewhere safe (like
          Google Drive) for peace of mind.
        </p>
      </div>

      {restored && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Restore complete: {restored} are back exactly as they were in the
          file.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <DownloadLink
          href="/api/export/materials"
          title="Materials (CSV)"
          desc="Your raw dry materials and how much you have, opens in Excel or Google Sheets."
        />
        <DownloadLink
          href="/api/export/glazes"
          title="Mixed glazes (CSV)"
          desc="Your finished glaze buckets, volumes, and consistency."
        />
        <DownloadLink
          href="/api/export/recipes"
          title="Recipes (CSV)"
          desc="Every recipe with its ingredients and percentages."
        />
        <DownloadLink
          href="/api/export/backup"
          title="Complete backup (JSON)"
          desc="A full, exact copy of everything — keep this file safe; Brooks can restore everything from it."
        />
      </div>

      <form
        action={restoreBackup}
        className="rounded-xl border border-red-200 bg-red-50/50 p-4"
      >
        <h2 className="font-semibold text-stone-900">
          Restore from a backup file
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Puts everything back exactly as it was in a Complete backup (JSON)
          file. This <strong>replaces all current data</strong> — normally
          Brooks does this. Download a fresh backup first, just in case.
        </p>
        <label className="mt-3 block text-sm font-medium text-stone-700">
          Backup file
          <input
            type="file"
            name="file"
            accept=".json,application/json"
            required
            className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-stone-700"
          />
        </label>
        <ConfirmButton
          message="Restore from this file? EVERYTHING currently in the app will be replaced with the file's contents. This can't be undone."
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-600"
        >
          Replace everything with this file
        </ConfirmButton>
      </form>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        <h2 className="font-semibold text-stone-800">Is my data safe?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Your data is stored in a managed cloud database (Neon), separate from
            the app itself.
          </li>
          <li>
            Updating or redeploying the tool only changes the app&apos;s code — it
            never touches your saved materials, recipes, or glazes.
          </li>
          <li>
            For extra safety, download a backup here every so often (a monthly
            reminder is plenty) and keep the file.
          </li>
        </ul>
      </div>
    </div>
  );
}
