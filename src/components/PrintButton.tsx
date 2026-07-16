"use client";

// Prints the current page (the Help page is styled to print as a clean
// handout — nav and this button hide themselves when printing).
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 print:hidden"
    >
      🖨 Print these instructions
    </button>
  );
}
