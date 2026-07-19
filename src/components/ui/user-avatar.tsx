"use client";

import Image from "next/image";
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

/**
 * Circular avatar with subtle gold ring.
 * Renders profile image when available; falls back to letter mark.
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

  if (src) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-[rgba(201,162,39,0.45)]",
          className
        )}
        style={{ width: dim, height: dim }}
      >
        <Image
          src={src}
          alt={name || email || "Profile"}
          width={size}
          height={size}
          className="size-full object-cover"
          unoptimized={src.includes("googleusercontent.com")}
        />
      </span>
    );
  }

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
