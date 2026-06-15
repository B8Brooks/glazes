// Quick consistency states for a mixed glaze bucket, matching the kinds of
// notes on Sheila's handwritten lists ("almost dry", "empty", "chunky").
export const GLAZE_STATUSES = ["Good", "Dryish", "Chunky", "Empty"] as const;

export type GlazeStatus = (typeof GLAZE_STATUSES)[number];

// Tailwind classes for the status badge on the glaze list.
export function statusBadgeClass(status: string | null): string {
  switch (status) {
    case "Good":
      return "bg-green-100 text-green-800";
    case "Dryish":
      return "bg-amber-100 text-amber-800";
    case "Chunky":
      return "bg-orange-100 text-orange-800";
    case "Empty":
      return "bg-stone-200 text-stone-600";
    default:
      return "bg-stone-100 text-stone-500";
  }
}
