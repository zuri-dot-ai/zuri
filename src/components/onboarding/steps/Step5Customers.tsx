"use client";

import { useEffect, useState } from "react";
import { SelectionCard } from "@/components/onboarding/SelectionCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/utils/sanitize";

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

interface Step5CustomersProps {
  audienceTypes: string[];
  location: string;
  locationCity?: string;
  onAudienceChange: (types: string[]) => void;
  onLocationChange: (location: string) => void;
  onLocationCityChange: (city: string) => void;
  onValidityChange: (valid: boolean) => void;
}

export function Step5Customers({
  audienceTypes,
  location,
  locationCity = "",
  onAudienceChange,
  onLocationChange,
  onLocationCityChange,
  onValidityChange,
}: Step5CustomersProps) {
  const [cityError, setCityError] = useState<string | null>(null);

  useEffect(() => {
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

    onValidityChange(audienceOk && locationOk);
  }, [audienceTypes, location, locationCity, onValidityChange]);

  function toggleAudience(id: string) {
    if (audienceTypes.includes(id)) {
      onAudienceChange(audienceTypes.filter((a) => a !== id));
    } else {
      onAudienceChange([...audienceTypes, id]);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        Who do you serve?
      </h1>

      <section className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Audience type
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Primary location
        </p>
        <div className="flex flex-wrap gap-2">
          {LOCATION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onLocationChange(opt.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                location === opt.id
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-white/10 text-muted-foreground hover:border-gold/40"
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
              className="h-11 max-w-sm border-white/10 bg-white/[0.02]"
            />
            {cityError && <p className="text-sm text-error">{cityError}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
