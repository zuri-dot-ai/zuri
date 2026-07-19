"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Subtle fade/slide between app routes (~180ms).
 */
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-0"
    >
      {children}
    </motion.div>
  );
}
