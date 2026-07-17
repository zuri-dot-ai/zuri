import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-[520px]" />
      </div>
    </div>
  );
}
