"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { AGENCY_SERVICE_LABELS, type AgencyService } from "@/lib/agencies/types";

export function ContactAgencyModal({
  agencyId,
  agencyName,
}: {
  agencyId: string;
  agencyName: string;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openModal() {
    if (loading) return;
    if (!user) {
      router.push(`/login?next=/agencies`);
      return;
    }
    setOpen(true);
  }

  async function submit() {
    if (message.trim().length < 10) {
      toast.error("Please write a more detailed message (at least 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const data = await safeFetchJSON<{ message: string }>("/api/agencies/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId,
          serviceNeeded: service || undefined,
          message,
          budget: budget || undefined,
        }),
      });
      toast.success(data.message);
      setOpen(false);
      setMessage("");
      setBudget("");
      setService("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send your inquiry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={openModal} className="w-full sm:w-auto">
        Contact agency
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-md border border-border bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-xl font-semibold">
                Contact {agencyName}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-sm p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Service needed</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="mt-1 w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Select a service (optional)</option>
                  {Object.entries(AGENCY_SERVICE_LABELS).map(([key, label]) => (
                    <option key={key} value={key as AgencyService}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Tell them about your business and what you need"
                  className="mt-1 w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  Budget (optional)
                </label>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. ₦100k–₦200k/month"
                  className="mt-1 w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Your email will be shared with {agencyName} to facilitate this connection.
              </p>

              <Button className="w-full" onClick={submit} disabled={submitting}>
                {submitting ? "Sending…" : "Send inquiry"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
