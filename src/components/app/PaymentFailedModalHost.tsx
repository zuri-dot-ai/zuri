"use client";

import { useState, useEffect } from "react";
import { PaymentFailedModal } from "@/components/notifications/PaymentFailedModal";

export function PaymentFailedModalHost({
  shouldShow,
  planName,
  graceEndDate,
}: {
  shouldShow: boolean;
  planName: string;
  graceEndDate: string;
}) {
  const [open, setOpen] = useState(shouldShow);
  useEffect(() => setOpen(shouldShow), [shouldShow]);
  return (
    <PaymentFailedModal
      open={open}
      onOpenChange={setOpen}
      planName={planName}
      graceEndDate={graceEndDate}
    />
  );
}
