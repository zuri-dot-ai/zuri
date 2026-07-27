"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
};

function initialFrom(name?: string | null, email?: string | null) {
  return (name || email || "Z").charAt(0).toUpperCase();
}

function LetterMark({
  initial,
  size,
  className,
}: {
  initial: string;
  size: number;
  className?: string;
}) {
  const dim = `${size}px`;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gold font-semibold text-[var(--accent-foreground)] ring-1 ring-[rgba(201,162,39,0.35)]",
        className
      )}
      style={{
        width: dim,
        height: dim,
        fontSize: Math.max(10, Math.round(size * 0.38)),
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function isGoogleAvatar(src: string): boolean {
  return /googleusercontent\.com|ggpht\.com/i.test(src);
}

/**
 * Circular avatar with subtle gold ring.
 * Renders profile image when available; falls back to letter mark.
 * Google URLs use a plain <img> with one automatic retry (soft-nav safe).
 */
export function UserAvatar({
  name,
  email,
  src,
  size = 32,
  className,
}: UserAvatarProps) {
  const initial = initialFrom(name, email);
  const dim = `${size}px`;
  const [broken, setBroken] = useState(false);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    setBroken(false);
    setRetries(0);
  }, [src]);

  if (!src || broken) {
    return <LetterMark initial={initial} size={size} className={className} />;
  }

  const google = isGoogleAvatar(src);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-[rgba(201,162,39,0.45)]",
        className
      )}
      style={{ width: dim, height: dim }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${src}:${retries}`}
        src={src}
        alt={name || email || "Profile"}
        width={size}
        height={size}
        className="size-full object-cover"
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => {
          if (google && retries < 1) {
            setRetries(1);
            return;
          }
          setBroken(true);
        }}
      />
    </span>
  );
}
