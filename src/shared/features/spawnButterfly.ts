import type { PetFeature, PetFeatureHandler } from "./types";

export function createSpawnButterflyFeature(execute: PetFeatureHandler): PetFeature {
  return {
    id: "spawnButterfly",
    label: "나비 소환",
    displayIn: ["petContextMenu"],
    triggers: ["dblclick"],
    execute,
  };
}
