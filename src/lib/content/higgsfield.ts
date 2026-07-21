import type { BusinessProfile } from "@/types/brand";
import type { VideoScript } from "./types";

export interface HiggsFieldGenerationInput {
  script: VideoScript;
  brand: BusinessProfile;
  style_preset?: string;
}

export async function generateVideoWithHiggsfield(
  _input: HiggsFieldGenerationInput
): Promise<{ videoUrl: string; duration: number }> {
  throw new Error(
    "Higgsfield video generation is not yet available. Your script is saved and ready. " +
      "We will notify you when video generation launches."
  );
}
