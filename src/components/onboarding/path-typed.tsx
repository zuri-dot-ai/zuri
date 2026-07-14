"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROMPTS = [
  "What's your business called, and what do you do?",
  "Who are your ideal customers?",
  "What makes you different from others in your space?",
];

export function PathTyped({ onComplete }: { onComplete: (transcript: string) => void }) {
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [step, setStep] = useState(0);

  function next() {
    if (step < PROMPTS.length - 1) {
      setStep(step + 1);
    } else {
      const transcript = PROMPTS.map((q, i) => `${q}\n${answers[i]}`).join("\n\n");
      onComplete(transcript);
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {PROMPTS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-gold" : "bg-border"
            }`}
          />
        ))}
      </div>

      <h2 className="mb-4 font-heading text-2xl">{PROMPTS[step]}</h2>

      <textarea
        autoFocus
        value={answers[step]}
        onChange={(e) => {
          const copy = [...answers];
          copy[step] = e.target.value;
          setAnswers(copy);
        }}
        rows={5}
        placeholder="Type your answer…"
        className="w-full resize-none rounded-xl border border-border bg-background p-4 text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
      />

      <div className="mt-6 flex justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
        ) : <span />}
        <Button onClick={next} disabled={answers[step].trim().length < 3}>
          {step < PROMPTS.length - 1 ? "Next" : "Continue"} <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}