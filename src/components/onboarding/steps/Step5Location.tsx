"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";

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

interface Step5LocationProps {
  location: string;
  locationCity?: string;
  onLocationChange: (location: string) => void;
  onLocationCityChange: (city: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step5Location({
  location,
  locationCity = "",
  onLocationChange,
  onLocationCityChange,
  onValidityChange,
}: Step5LocationProps) {
  const [cityError, setCityError] = useState<string | null>(null);

  useEffect(() => {
    let locationOk = Boolean(location);

    if (location === "other-city") {
      const city = sanitizeText(locationCity);
      if (!city || city.length < 2) {
        locationOk = false;
        setCityError(locationCity.length > 0 ? "Please enter your city name." : null);
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

    onValidityChange(locationOk);
  }, [location, locationCity, onValidityChange]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="onboarding-headline">Where are you based?</h1>
        <p className="onboarding-subtext">
          Helps us tailor location-aware copy on your site.
        </p>
      </div>

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
        <div className="space-y-1.5">
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
  );
}
