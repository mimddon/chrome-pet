export type {
  PetFeature,
  PetFeatureHandler,
  PetFeatureId,
  PetFeatureLocation,
  PetFeatureRequest,
  PetFeatureResponse,
  PetFeatureTrigger,
} from "./types";

export function createPetFeatures(
  actions: Partial<Record<PetFeatureId, PetFeatureHandler>>,
  visibility: Partial<Record<PetFeatureId, () => boolean>> = {},
): readonly PetFeature[] {
  const execute = (id: PetFeatureId): void | Promise<void> => {
    const action = actions[id];
    if (!action) throw new Error(`이 환경에서는 ${id} 기능을 실행할 수 없습니다.`);
    return action();
  };

  const features: PetFeature[] = [
    createPettingFeature(() => execute("petting")),
    createSpawnButterflyFeature(() => execute("spawnButterfly")),
    createGiveTreatFeature(() => execute("giveTreat")),
    createCancelGiveTreatFeature(() => execute("cancelGiveTreat")),
    createRerollPetFeature(() => execute("rerollPet")),
    createOpenPetStatusFeature(() => execute("openPetStatus")),
    createEnablePetFeature(() => execute("enablePet")),
    createDisablePetFeature(() => execute("disablePet")),
    createOpenPetSettingsFeature(() => execute("openPetSettings")),
  ];
  return features.map((feature) => {
    const isVisible = visibility[feature.id];
    return isVisible ? { ...feature, isVisible } : feature;
  });
}
import { createPettingFeature } from "./petting";
import { createSpawnButterflyFeature } from "./spawnButterfly";
import { createGiveTreatFeature } from "./giveTreat";
import { createCancelGiveTreatFeature } from "./cancelGiveTreat";
import { createRerollPetFeature } from "./rerollPet";
import { createOpenPetStatusFeature } from "./openPetStatus";
import { createOpenPetSettingsFeature } from "./openPetSettings";
import { createEnablePetFeature } from "./enablePet";
import { createDisablePetFeature } from "./disablePet";
import type { PetFeature, PetFeatureHandler, PetFeatureId } from "./types";
