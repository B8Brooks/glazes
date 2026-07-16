import { PrintButton } from "@/components/PrintButton";

export const metadata = {
  title: "How to use Sheila's Glazes",
};

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm print:break-inside-avoid print:border-stone-300 print:p-3 print:shadow-none">
      <h2 className="text-lg font-semibold text-stone-900 print:text-base">
        {number}. {title}
      </h2>
      <div className="mt-2 space-y-2 text-stone-700 print:text-sm">
        {children}
      </div>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-stone-900">{children}</strong>;
}

export default function HelpPage() {
  return (
    <div className="space-y-5 print:space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 print:text-xl">
            How to use Sheila&apos;s Glazes 🏺
          </h1>
          <p className="mt-1 text-stone-600 print:text-sm">
            Everything here is safe to try — the app always asks before
            deleting anything, and mixing can always be undone.
          </p>
        </div>
        <PrintButton />
      </div>

      <Section number={1} title="Put the app on your phone (one time)">
        <Steps
          items={[
            <>Open this website in <B>Safari</B> on your iPhone.</>,
            <>
              Tap the <B>Share button</B> at the bottom of the screen (the
              square with an arrow pointing up).
            </>,
            <>
              Scroll down and tap <B>&ldquo;Add to Home Screen&rdquo;</B>, then
              tap <B>Add</B>.
            </>,
            <>
              A little <B>terracotta pot icon</B> appears with your other apps.
              From now on, just tap that — it opens like a regular app.
            </>,
          ]}
        />
      </Section>

      <Section number={2} title="What the four tabs are">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <B>Recipes</B> — your recipe cards, typed in. Each one lists its
            ingredients and percentages.
          </li>
          <li>
            <B>Glazes</B> — the buckets of mixed, liquid glaze you have on the
            shelf, tracked in cups, pints, quarts, and gallons.
          </li>
          <li>
            <B>Materials</B> — the dry ingredients you buy in bags (feldspar,
            silica, and so on), tracked in pounds.
          </li>
          <li>
            <B>Backup</B> — downloads a copy of everything, for safekeeping.
          </li>
        </ul>
      </Section>

      <Section number={3} title="Type in a recipe from one of your cards">
        <Steps
          items={[
            <>
              Go to <B>Recipes</B> and tap <B>+ New recipe</B>.
            </>,
            <>Type the glaze&apos;s name at the top.</>,
            <>
              Type the first ingredient&apos;s name and its percentage — just
              like it reads on your card. A fresh empty row appears by itself
              for the next one.
            </>,
            <>
              If an ingredient is new, that&apos;s fine — the app adds it to
              your Materials list automatically.
            </>,
            <>
              Colorants and additions (like bentonite or copper carbonate) go
              in as their own rows too. It&apos;s normal for the total to be
              more than 100%.
            </>,
            <>
              Tap <B>Save recipe</B>.
            </>,
          ]}
        />
      </Section>

      <Section number={4} title="Mix a batch">
        <Steps
          items={[
            <>Open the recipe and find the <B>Mix a batch</B> box.</>,
            <>
              Enter the batch size in <B>grams</B> (for example, 1000). The
              table shows exactly how many grams of each material you need,
              next to how much you have. If something says{" "}
              <B>&ldquo;not enough&rdquo;</B>, you may want to reorder.
            </>,
            <>
              If you know roughly how much liquid glaze this made (say, 2
              quarts), enter it under <B>Volume made</B> — the app adds it to
              that glaze&apos;s bucket for you.
            </>,
            <>
              Tap <B>Mix this batch</B>. The materials you used are subtracted
              from your inventory automatically.
            </>,
            <>
              Changed your mind or made a mistake? Every batch is listed under{" "}
              <B>Recent batches</B> with an <B>Undo</B> button that puts
              everything back.
            </>,
          ]}
        />
      </Section>

      <Section number={5} title="Keep your buckets up to date">
        <Steps
          items={[
            <>
              On the <B>Glazes</B> tab, each bucket has an amount box with{" "}
              <B>Use</B> and <B>Add</B> buttons — glazed some pots with about a
              quart? Type 1, pick quarts, tap <B>Use</B>.
            </>,
            <>
              Tap a glaze&apos;s name to change anything about it — including
              its consistency: <B>Good, Dryish, Chunky, or Empty</B>.
            </>,
            <>
              A bucket can never go below empty — if you use the last of it,
              it marks itself <B>Empty</B>.
            </>,
          ]}
        />
      </Section>

      <Section number={6} title="When a new bag of material arrives">
        <Steps
          items={[
            <>
              On the <B>Materials</B> tab, find the material and type the
              amount next to <B>Received more</B> (for example, 50 lb), then
              tap <B>Add</B>.
            </>,
            <>
              Tap a material&apos;s name to set{" "}
              <B>&ldquo;reorder when below&rdquo;</B> — then the home page will
              tell you when you&apos;re running low.
            </>,
          ]}
        />
      </Section>

      <Section number={7} title="Once a month: download a backup">
        <Steps
          items={[
            <>
              Go to <B>Backup</B> and tap all four <B>Download</B> buttons.
            </>,
            <>
              Keep the files somewhere safe (email them to yourself, or save
              them to Google Drive or iCloud).
            </>,
          ]}
        />
        <p>
          Good to know: updates to the app <B>never touch your saved data</B>,
          and the app always asks &ldquo;are you sure?&rdquo; before deleting
          anything. The backups are simply extra peace of mind.
        </p>
      </Section>

      <Section number={8} title="Little things worth knowing">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Every list has a <B>&ldquo;Find…&rdquo;</B> box at the top — start
            typing a name instead of scrolling.
          </li>
          <li>
            The <B>home page</B> tells you at a glance when materials are low
            or buckets need attention.
          </li>
          <li>
            If a yellow message appears, it&apos;s just the app explaining why
            it couldn&apos;t do something — nothing is broken.
          </li>
          <li>
            Stuck or something looks odd? <B>Call Brooks.</B> Nothing you tap
            can ruin your data.
          </li>
        </ul>
      </Section>
    </div>
  );
}
