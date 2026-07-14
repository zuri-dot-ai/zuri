import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  showMark?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { logo: { width: 80, height: 24 }, mark: { width: 24, height: 24 } },
  md: { logo: { width: 120, height: 36 }, mark: { width: 36, height: 36 } },
  lg: { logo: { width: 160, height: 48 }, mark: { width: 48, height: 48 } },
};

export function Logo({ className, href = "/", showMark = false, size = "md" }: LogoProps) {
  const s = sizes[size];
  const content = (
    <span className={cn("inline-flex items-center", className)}>
      {showMark ? (
        <Image src="/Zuri_Favicon.png" alt="Zuri" width={s.mark.width} height={s.mark.height} className="object-contain" />
      ) : (
        <Image src="/Zuri_Logo.png" alt="Zuri" width={s.logo.width} height={s.logo.height} className="object-contain" />
      )}
    </span>
  );
  return href ? <Link href={href} aria-label="Zuri home">{content}</Link> : content;
}