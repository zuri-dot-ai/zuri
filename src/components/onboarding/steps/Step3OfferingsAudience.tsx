"use client";

import { useEffect, useState } from "react";
import { TagInput } from "@/components/onboarding/TagInput";
import { SelectionCard } from "@/components/onboarding/SelectionCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";
import { SERVICE_SUGGESTIONS } from "@/lib/onboarding/types";

const AUDIENCE_OPTIONS = [
  { id: "young-professionals", label: "Young professionals" },
  { id: "families", label: "Families" },
  { id: "students", label: "Students" },
  { id: "corporate-clients", label: "Corporate clients" },
  { id: "walk-in-local", label: "Walk-in / local customers" },
  { id: "online-nationwide", label: "Online customers (nationwide or global)" },
  { id: "everyone", label: "Everyone (general public)" },
];

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

interface Step3OfferingsAudienceProps {
  businessType: string;
  services: string[];
  audienceTypes: string[];
  location: string;
  locationCity?: string;
  onServicesChange: (services: string[]) => void;
  onAudienceChange: (types: string[]) => void;
  onLocationChange: (location: string) => void;
  onLocationCityChange: (city: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step3OfferingsAudience({
  businessType,
  services,
  audienceTypes,
  location,
  locationCity = "",
  onServicesChange,
  onAudienceChange,
  onLocationChange,
  onLocationCityChange,
  onValidityChange,
}: Step3OfferingsAudienceProps) {
  const [cityError, setCityError] = useState<string | null>(null);
  const suggestions = SERVICE_SUGGESTIONS[businessType] ?? [];

  useEffect(() => {
    const servicesOk = services.length >= 1 && services.length <= 8;
    const audienceOk = audienceTypes.length >= 1;
    let locationOk = Boolean(location);

    if (location === "other-city") {
      const city = sanitizeText(locationCity);
      if (!city || city.length < 2) {
        locationOk = false;
        setCityError(
          locationCity.length > 0 ? "Please enter your city name." : null
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

    onValidityChange(servicesOk && audienceOk && locationOk);
  }, [services, audienceTypes, location, locationCity, onValidityChange]);

  function toggleAudience(id: string) {
    if (audienceTypes.includes(id)) {
      onAudienceChange(audienceTypes.filter((a) => a !== id));
    } else {
      onAudienceChange([...audienceTypes, id]);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground md:text-[2rem]">
          What do you offer — and who for?
        </h1>
        <p className="mt-2 text-[0.9375rem] text-[var(--text-secondary)]">
          Services first, then the people and place you serve.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <p className="onboarding-eyebrow">What you offer</p>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            Add your main services or products.
          </p>
        </div>
        <div className="rounded-md border border-border bg-[var(--bg-secondary)] p-5 sm:p-6">
          <TagInput
            value={services}
            onChange={onServicesChange}
            suggestions={suggestions}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="onboarding-eyebrow">Who you serve</p>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            Choose all that apply.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {AUDIENCE_OPTIONS.map((opt) => (
            <SelectionCard
              key={opt.id}
              label={opt.label}
              selected={audienceTypes.includes(opt.id)}
              onSelect={() => toggleAudience(opt.id)}
              multi
            />
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Primary location
          </p>
          <div className="flex flex-wrap gap-2">
            {LOCATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onLocationChange(opt.id)}
                className={cn(
                  "min-h-[44px] rounded-sm border px-3.5 py-2 text-sm transition-all duration-150",
                  location === opt.id
                    ? "border-gold bg-gold/10 text-foreground"
                    : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {location === "other-city" && (
            <div className="space-y-1.5 pt-1">
              <Input
                value={locationCity}
                onChange={(e) => onLocationCityChange(e.target.value)}
                placeholder="Which city?"
                className="onboarding-input h-11 max-w-sm"
              />
              {cityError && <p className="text-sm text-error">{cityError}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
