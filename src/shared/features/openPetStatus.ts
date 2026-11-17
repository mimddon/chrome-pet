import type { PetFeature, PetFeatureHandler } from "./types";

export function createOpenPetStatusFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "openPetStatus",
    label: "상태 확인",
    displayIn: ["petContextMenu"],
    triggers: [],
    execute,
  };
}
