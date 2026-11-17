import type { PetFeature, PetFeatureHandler } from "./types";

export function createGiveTreatFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "giveTreat",
    label: "간식 주기",
    displayIn: ["petContextMenu"],
    triggers: [],
    execute,
  };
}
