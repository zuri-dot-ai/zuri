"use client";

import { useEffect, useState } from "react";
import { TagInput } from "@/components/onboarding/TagInput";
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
        <h1 className="onboarding-headline">What do you offer — and who for?</h1>
        <p className="onboarding-subtext">
          Services first, then the people and place you serve.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <p className="onboarding-eyebrow">What you offer</p>
          <p className="onboarding-helper mt-1.5">
            Add your main services or products.
          </p>
        </div>
        <div className="onboarding-panel">
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
          <p className="onboarding-helper mt-1.5">
            Choose all that apply — swipe to see more.
          </p>
        </div>
        <div
          className="flex snap-x gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
          role="group"
          aria-label="Who you serve"
        >
          {AUDIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleAudience(opt.id)}
              aria-pressed={audienceTypes.includes(opt.id)}
              className={cn(
                "min-h-[44px] shrink-0 snap-start whitespace-nowrap rounded-full border px-4 py-2.5 text-sm transition-all duration-150",
                audienceTypes.includes(opt.id)
                  ? "scale-[1.02] border-gold bg-gold/[0.08] text-foreground"
                  : "border-border bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <p className="onboarding-label">Primary location</p>
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
