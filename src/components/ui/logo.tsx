import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Original mark path — used for marketing/auth wordmark */
const MARK_PATH = `
  M50 6
  L92 82
  L70 82
  L70 66
  L60 66
  L60 50
  L50 30
  L28 78
  L8 82
  Z
  M50 40
  L64 68
  L36 68
  Z
`;

type LogoSize = "sm" | "md" | "lg" | "navbar";

interface LogoProps {
  className?: string;
  href?: string | null;
  /** Mark only — SVG without text (wordmark / wood variants) */
  showMark?: boolean;
  /**
   * `wordmark` = theme-aware SVG mark + ZURI text.
   * `image` = full chrome PNG (auth / onboarding hero).
   * `app` / `wood` = Cormorant “ZURI” wordmark for dashboard chrome.
   */
  variant?: "wordmark" | "image" | "app" | "wood";
  size?: LogoSize;
}

const SIZE: Record<
  LogoSize,
  { mark: number; word: string; gap: string; tracking: string; imgH: number }
> = {
  sm: { mark: 22, word: "18px", gap: "10px", tracking: "0.2em", imgH: 24 },
  md: { mark: 28, word: "20px", gap: "12px", tracking: "0.22em", imgH: 28 },
  lg: { mark: 48, word: "28px", gap: "14px", tracking: "0.28em", imgH: 40 },
  navbar: { mark: 28, word: "22px", gap: "14px", tracking: "0.2em", imgH: 30 },
};

function Mark({ size }: { size: number }) {
  return (
    <svg
      className="zuri-mark"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d={MARK_PATH}
        fillRule="evenodd"
        style={{ fill: "var(--logo-color)", transition: "fill 0.35s ease" }}
      />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  showMark = false,
  variant = "wordmark",
  size = "md",
}: LogoProps) {
  const s = SIZE[size];
  const isWood = variant === "app" || variant === "wood";

  let content: ReactNode;

  if (variant === "image") {
    content = (
      <span className={cn("inline-flex items-center", className)}>
        <Image
          src="/Zuri_Logo.png"
          alt="Zuri"
          width={Math.round(s.imgH * 3.2)}
          height={s.imgH}
          className="h-auto object-contain"
          style={{ height: s.imgH, width: "auto" }}
          priority
        />
      </span>
    );
  } else if (isWood) {
    /* Dashboard chrome: Cormorant wordmark only (no triangular mark) */
    content = (
      <span
        className={cn("zuri-logo inline-flex items-center select-none", className)}
      >
        <span
          className="zuri-word font-heading font-medium leading-none"
          style={{
            fontSize: s.word,
            letterSpacing: s.tracking,
            color: "var(--wood-word)",
            paddingRight: s.tracking,
            transition: "color 0.35s ease",
          }}
        >
          ZURI
        </span>
      </span>
    );
  } else {
    content = (
      <span
        className={cn("zuri-logo inline-flex items-center select-none", className)}
        style={{ gap: s.gap }}
      >
        <Mark size={s.mark} />
        {!showMark && (
          <span
            className="zuri-word font-heading font-semibold leading-none"
            style={{
              fontSize: s.word,
              letterSpacing: s.tracking,
              color: "var(--logo-color)",
              paddingRight: s.tracking,
            }}
          >
            ZURI
          </span>
        )}
      </span>
    );
  }

  if (href === null || href === undefined) return content;

  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a href={href} aria-label="Zuri home" className="inline-flex">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} aria-label="Zuri home" className="inline-flex">
      {content}
    </Link>
  );
}
