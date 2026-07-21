import {
  ContentSlotSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-7 gap-px rounded-lg border border-[var(--zuri-border)]">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="min-h-[90px] p-2">
            <ContentSlotSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
