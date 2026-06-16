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

export default function BackupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Backup &amp; export</h1>
        <p className="mt-1 text-stone-600">
          Download a copy of your data anytime. Save these somewhere safe (like
          Google Drive) for peace of mind.
        </p>
      </div>

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
          desc="A full, exact copy of everything — keep this as your restore file."
        />
      </div>

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
