import type { PetFeature, PetFeatureHandler } from "./types";

export function createEnablePetFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "enablePet",
    label: "펫 켜기",
    displayIn: ["popup"],
    triggers: [],
    execute,
  };
}
