"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function PaymentToast() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const payment = params.get("payment");
    const tab = params.get("tab");

    if (payment === "success") {
      toast.success("Payment successful! Your plan is now active. 🎉");
    } else if (payment === "failed" || payment === "error") {
      toast.error("Payment was not completed. Your plan has not changed.");
    }

    if (payment) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("payment");
      router.replace(clean.pathname + (tab ? `?tab=${tab}` : ""), {
        scroll: false,
      });
    }
  }, [params, router]);

  return null;
}