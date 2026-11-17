import type { PetFeature, PetFeatureHandler } from "./types";

export function createDisablePetFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "disablePet",
    label: "펫 끄기",
    displayIn: ["popup", "petContextMenu"],
    triggers: [],
    execute,
  };
}
