import { MaterialForm } from "@/components/MaterialForm";
import { BackLink } from "@/components/BackLink";

export default function NewMaterialPage() {
  return (
    <div className="space-y-5">
      <BackLink href="/inventory" label="Materials" />
      <h1 className="text-2xl font-bold text-stone-900">Add material</h1>
      <MaterialForm />
    </div>
  );
}
