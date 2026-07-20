/** Design tokens — CSS vars in globals.css remain source of truth. */
export const tokens = {
  gold: "#C9A84C",
  goldBright: "#D4B55F",
  goldMuted: "rgba(201, 168, 76, 0.18)",
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
  spacing: {
    panel: "1.25rem",
    section: "1.5rem",
  },
} as const;
