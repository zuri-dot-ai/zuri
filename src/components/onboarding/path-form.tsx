"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function PathForm({ onComplete }: { onComplete: (transcript: string) => void }) {
  const [f, setF] = useState({
    business_name: "",
    industry: "",
    services: "",
    target_audience: "",
    tone: "professional",
  });

  function submit() {
    const transcript = `
Business name: ${f.business_name}
Industry: ${f.industry}
Services: ${f.services}
Target audience: ${f.target_audience}
Preferred tone: ${f.tone}
`.trim();
    onComplete(transcript);
  }

  const valid = f.business_name.trim() && f.industry.trim() && f.services.trim();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bn">Business name</Label>
        <Input id="bn" value={f.business_name}
          onChange={(e) => setF({ ...f, business_name: e.target.value })}
          placeholder="Bola's Bakery" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ind">Industry</Label>
        <Input id="ind" value={f.industry}
          onChange={(e) => setF({ ...f, industry: e.target.value })}
          placeholder="Bakery & confectionery" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="srv">Services (comma-separated)</Label>
        <Input id="srv" value={f.services}
          onChange={(e) => setF({ ...f, services: e.target.value })}
          placeholder="Custom cakes, pastries, event catering" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="aud">Target audience</Label>
        <Input id="aud" value={f.target_audience}
          onChange={(e) => setF({ ...f, target_audience: e.target.value })}
          placeholder="Lagos families, event planners" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tone">Tone</Label>
        <Select
          id="tone"
          value={f.tone}
          onChange={(e) => setF({ ...f, tone: e.target.value })}
          className="h-11 rounded-lg"
        >
          <option value="professional">Professional</option>
          <option value="warm">Warm</option>
          <option value="bold">Bold</option>
          <option value="playful">Playful</option>
        </Select>
      </div>

      <Button className="w-full" onClick={submit} disabled={!valid}>
        Continue <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}