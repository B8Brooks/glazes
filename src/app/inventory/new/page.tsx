import { MaterialForm } from "@/components/MaterialForm";

export default function NewMaterialPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">Add material</h1>
      <MaterialForm />
    </div>
  );
}
