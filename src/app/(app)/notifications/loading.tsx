import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="space-y-0 overflow-hidden rounded-lg border border-[rgba(201,162,39,0.16)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-b border-border px-5 py-4 last:border-b-0">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
