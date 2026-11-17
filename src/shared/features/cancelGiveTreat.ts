import type { PetFeature, PetFeatureHandler } from "./types";

export function createCancelGiveTreatFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "cancelGiveTreat",
    label: "간식 주기 취소",
    displayIn: ["petContextMenu"],
    triggers: [],
    execute,
  };
}
