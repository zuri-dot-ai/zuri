"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import { normalizeWebsiteUrl } from "./types";

const LOCATION_OPTIONS = [
  { id: "lagos", label: "Lagos" },
  { id: "abuja", label: "Abuja" },
  { id: "port-harcourt", label: "Port Harcourt" },
  { id: "ibadan", label: "Ibadan" },
  { id: "kano", label: "Kano" },
  { id: "other-city", label: "Another Nigerian city" },
  { id: "nationwide", label: "Nationwide" },
  { id: "international", label: "International" },
];

interface Step1IdentityProps {
  agencyName: string;
  locationId: string;
  locationCityOther: string;
  website: string;
  onAgencyNameChange: (value: string) => void;
  onLocationIdChange: (value: string) => void;
  onLocationCityOtherChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step1Identity({
  agencyName,
  locationId,
  locationCityOther,
  website,
  onAgencyNameChange,
  onLocationIdChange,
  onLocationCityOtherChange,
  onWebsiteChange,
  onValidityChange,
}: Step1IdentityProps) {
  const [cityError, setCityError] = useState<string | null>(null);

  useEffect(() => {
    const nameOk = sanitizeText(agencyName).length >= 2;

    let locationOk = Boolean(locationId);
    if (locationId === "other-city") {
      const city = sanitizeText(locationCityOther);
      if (!city || city.length < 2) {
        locationOk = false;
        setCityError(
          locationCityOther.length > 0 ? "Please enter your city name." : null
        );
      } else if (city.length > 40) {
        locationOk = false;
        setCityError("City name must be 40 characters or fewer.");
      } else if (!/^[\p{L}\s]+$/u.test(city)) {
        locationOk = false;
        setCityError("City name can only contain letters and spaces.");
      } else {
        setCityError(null);
      }
    } else {
      setCityError(null);
    }

    const normalized = normalizeWebsiteUrl(website);
    let websiteOk = false;
    if (normalized) {
      try {
        const url = new URL(normalized);
        websiteOk = ["http:", "https:"].includes(url.protocol);
      } catch {
        websiteOk = false;
      }
    }

    onValidityChange(nameOk && locationOk && websiteOk);
  }, [
    agencyName,
    locationId,
    locationCityOther,
    website,
    onValidityChange,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">Tell us about your agency</h1>
        <p className="onboarding-subtext">
          Basic details so we can list you in the right place.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-1.5">
          <label className="onboarding-label" htmlFor="agency-name">
            Agency name
          </label>
          <Input
            id="agency-name"
            name="organization"
            value={agencyName}
            onChange={(e) => onAgencyNameChange(e.target.value)}
            placeholder="Your agency name"
            autoComplete="organization"
            className="onboarding-input h-11"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <p className="onboarding-label">Primary location</p>
          <div className="flex flex-wrap gap-2">
            {LOCATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onLocationIdChange(opt.id)}
                className={cn(
                  "min-h-[44px] rounded-sm border px-3.5 py-2 text-sm transition-all duration-150",
                  locationId === opt.id
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {locationId === "other-city" && (
            <div className="space-y-1.5">
              <Input
                value={locationCityOther}
                onChange={(e) => onLocationCityOtherChange(e.target.value)}
                placeholder="Which city?"
                className="onboarding-input h-11 max-w-sm"
              />
              {cityError && <p className="text-sm text-error">{cityError}</p>}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="onboarding-label" htmlFor="agency-website">
            Website or portfolio link
          </label>
          <Input
            id="agency-website"
            type="url"
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            placeholder="https://youragency.com"
            className="onboarding-input h-11"
          />
        </div>
      </div>
    </div>
  );
}
