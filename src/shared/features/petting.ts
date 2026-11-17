import type { PetFeature, PetFeatureHandler } from "./types";

export function createPettingFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "petting",
    label: "쓰다듬기",
    displayIn: ["petContextMenu"],
    triggers: ["click"],
    execute,
  };
}
