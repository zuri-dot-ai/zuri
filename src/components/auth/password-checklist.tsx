"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordChecklistProps {
  password: string;
}

const RULES = [
  {
    label: "At least 8 characters",
    test: (password: string) => password.length >= 8,
  },
  {
    label: "One uppercase letter",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: "One number",
    test: (password: string) => /[0-9]/.test(password),
  },
] as const;

/**
 * Live password strength checklist — mirrors isStrongPassword() rules in
 * signup/page.tsx but as individually-tracked booleans for real-time UI.
 */
export function PasswordChecklist({ password }: PasswordChecklistProps) {
  return (
    <ul className="mt-1.5 flex flex-col gap-1">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors duration-200 ease-out",
              met ? "text-[#4ADE80]" : "text-[var(--chrome-dark)]"
            )}
          >
            <span
              className={cn(
                "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-200 ease-out",
                met
                  ? "border-[#4ADE80] bg-[#4ADE80]"
                  : "border-[var(--chrome-dark)] bg-transparent"
              )}
            >
              <Check
                className={cn(
                  "size-2.5 text-[#0d0c0a] transition-opacity duration-200 ease-out",
                  met ? "opacity-100" : "opacity-0"
                )}
                aria-hidden
              />
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
