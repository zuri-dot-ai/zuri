import {
  PageHeaderSkeleton,
  WebsitePreviewSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeaderSkeleton />
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(280px,380px)_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-sm bg-[var(--bg-secondary)]"
            />
          ))}
        </div>
        <WebsitePreviewSkeleton className="min-h-[520px]" />
      </div>
      <div className="space-y-2 lg:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-sm bg-[var(--bg-secondary)]"
          />
        ))}
      </div>
    </div>
  );
}
