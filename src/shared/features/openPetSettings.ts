import type { PetFeature, PetFeatureHandler } from "./types";

export function createOpenPetSettingsFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "openPetSettings",
    label: "설정",
    displayIn: ["popup"],
    triggers: [],
    execute,
  };
}
