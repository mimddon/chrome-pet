export type {
  PetFeature,
  PetFeatureHandler,
  PetFeatureId,
  PetFeatureLocation,
  PetFeatureRequest,
  PetFeatureResponse,
  PetFeatureTrigger,
} from "./types";

export function createPetFeatures(actions: Partial<Record<PetFeatureId, PetFeatureHandler>>): readonly PetFeature[] {
  const execute = (id: PetFeatureId): void | Promise<void> => {
    const action = actions[id];
    if (!action) throw new Error(`이 환경에서는 ${id} 기능을 실행할 수 없습니다.`);
    return action();
  };

  return [
    createPettingFeature(() => execute("petting")),
    createSpawnButterflyFeature(() => execute("spawnButterfly")),
    createRerollPetFeature(() => execute("rerollPet")),
    createOpenPetStatusFeature(() => execute("openPetStatus")),
    createEnablePetFeature(() => execute("enablePet")),
    createDisablePetFeature(() => execute("disablePet")),
    createOpenPetSettingsFeature(() => execute("openPetSettings")),
  ];
}
import { createPettingFeature } from "./petting";
import { createSpawnButterflyFeature } from "./spawnButterfly";
import { createRerollPetFeature } from "./rerollPet";
import { createOpenPetStatusFeature } from "./openPetStatus";
import { createOpenPetSettingsFeature } from "./openPetSettings";
import { createEnablePetFeature } from "./enablePet";
import { createDisablePetFeature } from "./disablePet";
import type { PetFeature, PetFeatureHandler, PetFeatureId } from "./types";
