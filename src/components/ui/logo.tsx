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
   * `wordmark` = theme-aware SVG + ZURI text.
   * `image` = full chrome PNG (auth / onboarding hero).
   * `app` / `wood` = theme-aware 3D wood mark for dashboard chrome.
   */
  variant?: "wordmark" | "image" | "app" | "wood";
  size?: LogoSize;
}

const SIZE: Record<
  LogoSize,
  { mark: number; word: string; gap: string; tracking: string; imgH: number }
> = {
  sm: { mark: 22, word: "16px", gap: "10px", tracking: "0.22em", imgH: 24 },
  md: { mark: 28, word: "18px", gap: "12px", tracking: "0.24em", imgH: 28 },
  lg: { mark: 48, word: "28px", gap: "14px", tracking: "0.28em", imgH: 40 },
  navbar: { mark: 28, word: "20px", gap: "14px", tracking: "0.22em", imgH: 30 },
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

/**
 * Theme-aware wood mark — layered bevels + grain filter.
 * Dark mode: light oak. Light mode: deeper walnut (via CSS vars).
 */
function WoodMark({ size }: { size: number }) {
  const uid = `wood-${size}`;
  return (
    <svg
      className="zuri-mark-wood"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-face`} x1="15%" y1="5%" x2="85%" y2="95%">
          <stop offset="0%" stopColor="var(--wood-face)" />
          <stop offset="45%" stopColor="var(--wood-face-mid)" />
          <stop offset="100%" stopColor="var(--wood-face)" />
        </linearGradient>
        <linearGradient id={`${uid}-side`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--wood-side)" />
          <stop offset="100%" stopColor="var(--wood-edge)" />
        </linearGradient>
        <filter id={`${uid}-grain`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.4
                    0 0 0 0 0.25
                    0 0 0 0 0.1
                    0 0 0 0.28 0"
            result="grain"
          />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
        </filter>
      </defs>

      {/* Depth slab (offset back-left) */}
      <path
        d={MARK_PATH}
        fill={`url(#${uid}-side)`}
        fillRule="evenodd"
        transform="translate(-4, 5)"
        style={{ transition: "fill 0.35s ease" }}
      />
      {/* Front face */}
      <g filter={`url(#${uid}-grain)`}>
        <path
          d={MARK_PATH}
          fill={`url(#${uid}-face)`}
          fillRule="evenodd"
          style={{ transition: "fill 0.35s ease" }}
        />
      </g>
      {/* Edge highlight */}
      <path
        d="M50 6 L70 42 L60 50 L50 30 Z"
        fill="rgba(255,255,255,0.22)"
        style={{ mixBlendMode: "soft-light" }}
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
    content = (
      <span
        className={cn("zuri-logo inline-flex items-center select-none", className)}
        style={{ gap: s.gap }}
      >
        <WoodMark size={s.mark} />
        {!showMark && (
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
        )}
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
