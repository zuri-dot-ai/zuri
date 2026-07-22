"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { subscribeNetworkStatus, isOnline } from "@/lib/network/network-status";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!isOnline());
    return subscribeNetworkStatus((online) => setIsOffline(!online));
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-error/20 bg-error/10 px-4 py-2 text-sm text-error backdrop-blur"
    >
      <WifiOff className="size-4" />
      You&apos;re offline — changes won&apos;t save until you reconnect
    </div>
  );
}
