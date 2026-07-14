import { ZuriSpinner } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ZuriSpinner size={48} />
    </div>
  );
}
