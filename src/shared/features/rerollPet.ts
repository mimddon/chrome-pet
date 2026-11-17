import type { PetFeature, PetFeatureHandler } from "./types";

export function createRerollPetFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "rerollPet",
    label: "펫 다시 뽑기",
    displayIn: ["popup"],
    triggers: [],
    execute,
  };
}
