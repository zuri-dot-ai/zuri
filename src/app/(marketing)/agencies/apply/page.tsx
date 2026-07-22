"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { safeFetchJSON } from "@/lib/utils/safe-fetch";
import { AGENCY_SERVICE_LABELS, type AgencyService } from "@/lib/agencies/types";

const SERVICE_KEYS = Object.keys(AGENCY_SERVICE_LABELS) as AgencyService[];

export default function AgencyApplyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [form, setForm] = useState({
    agency_name: "",
    contact_name: "",
    email: "",
    phone: "",
    location_city: "",
    team_size: "small",
    price_range: "mid",
    description: "",
    portfolio_urls: "",
    referral_source: "",
  });
  const [services, setServices] = useState<AgencyService[]>([]);

  function toggleService(service: AgencyService) {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      const data = await safeFetchJSON<{ message: string }>("/api/agencies/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          services,
          portfolio_urls: form.portfolio_urls
            .split(/\n|,/)
            .map((u) => u.trim())
            .filter(Boolean),
        }),
      });
      setSubmitted(data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-5 py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold">Application received</h1>
        <p className="text-muted-foreground">{submitted}</p>
        <Button onClick={() => router.push("/agencies")}>Browse agencies</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 py-10">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">List your agency on Zuri</h1>
        <p className="text-sm text-muted-foreground">
          Reach thousands of African entrepreneurs looking for professional services.
        </p>
      </header>

      <div className="space-y-4">
        <Field label="Agency name">
          <input
            className="input"
            value={form.agency_name}
            onChange={(e) => setForm({ ...form, agency_name: e.target.value })}
          />
        </Field>
        <Field label="Contact name">
          <input
            className="input"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Phone (optional)">
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Location (city)">
          <input
            className="input"
            value={form.location_city}
            onChange={(e) => setForm({ ...form, location_city: e.target.value })}
          />
        </Field>

        <Field label="Services offered">
          <div className="flex flex-wrap gap-2">
            {SERVICE_KEYS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleService(s)}
                className={`rounded-sm border px-2.5 py-1 text-xs ${
                  services.includes(s)
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border text-muted-foreground"
                }`}
              >
                {AGENCY_SERVICE_LABELS[s]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Team size">
          <Select
            value={form.team_size}
            onChange={(e) => setForm({ ...form, team_size: e.target.value })}
          >
            <option value="solo">Solo / Freelancer</option>
            <option value="small">Small team (2–10)</option>
            <option value="medium">Medium team (11–50)</option>
            <option value="large">Large agency (50+)</option>
          </Select>
        </Field>

        <Field label="Price range">
          <Select
            value={form.price_range}
            onChange={(e) => setForm({ ...form, price_range: e.target.value })}
          >
            <option value="budget">₦ Budget-friendly</option>
            <option value="mid">₦₦ Mid-range</option>
            <option value="premium">₦₦₦ Premium</option>
          </Select>
        </Field>

        <Field label="Describe your agency (30–500 characters)">
          <textarea
            rows={4}
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <Field label="Portfolio links (one per line, optional)">
          <textarea
            rows={3}
            className="input"
            value={form.portfolio_urls}
            onChange={(e) => setForm({ ...form, portfolio_urls: e.target.value })}
          />
        </Field>

        <Field label="How did you hear about Zuri? (optional)">
          <input
            className="input"
            value={form.referral_source}
            onChange={(e) => setForm({ ...form, referral_source: e.target.value })}
          />
        </Field>

        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
      </div>

      <style>{`.input { width: 100%; border: 1px solid var(--border); background: transparent; border-radius: 4px; padding: 8px 12px; font-size: 14px; margin-top: 4px; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}
