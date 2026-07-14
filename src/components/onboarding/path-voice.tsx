"use client";

import { useEffect } from "react";
import { Mic, MicOff, ArrowRight } from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PathVoice({ onComplete }: { onComplete: (transcript: string) => void }) {
  const { transcript, interim, listening, supported, start, stop } = useSpeech();

  useEffect(() => {
    if (supported) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  if (!supported) {
    return (
      <div className="text-center text-muted-foreground">
        <MicOff className="mx-auto mb-3 size-8" />
        <p>Voice isn&apos;t supported in this browser. Try typing instead.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-8 max-w-md text-muted-foreground">
        Tell us about your business — what you do, who you help, and what makes you different.
        Speak naturally.
      </p>

      <button
        onClick={listening ? stop : start}
        className={cn(
          "relative flex size-24 items-center justify-center rounded-full transition-all",
          listening ? "bg-gold text-background" : "bg-surface text-gold border border-border"
        )}
      >
        {listening && (
          <span className="absolute inset-0 animate-ping rounded-full bg-gold/30" />
        )}
        <Mic className="size-9" />
      </button>
      <span className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
        {listening ? "Listening… tap to pause" : "Tap to speak"}
      </span>

      <div className="mt-8 min-h-[120px] w-full rounded-xl border border-border bg-surface p-5 text-left">
        {transcript || interim ? (
          <p className="leading-relaxed">
            {transcript}
            <span className="text-muted-foreground">{interim}</span>
          </p>
        ) : (
          <p className="text-muted-foreground">Your words will appear here…</p>
        )}
      </div>

      <Button
        className="mt-6"
        size="lg"
        disabled={transcript.trim().length < 10}
        onClick={() => { stop(); onComplete(transcript); }}
      >
        Continue <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}