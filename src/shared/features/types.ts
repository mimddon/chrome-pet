export type PetFeatureId =
  | "petting"
  | "openPetStatus"
  | "openPetSettings"
  | "spawnButterfly"
  | "giveTreat"
  | "cancelGiveTreat"
  | "enablePet"
  | "disablePet"
  | "rerollPet";

export type PetFeatureLocation = "petContextMenu" | "popup" | "popupSettings";
export type PetFeatureTrigger = "click" | "dblclick";
export type PetFeatureHandler = () => void | Promise<void>;

export type PetFeature = {
  id: PetFeatureId;
  label: string;
  displayIn: readonly PetFeatureLocation[];
  triggers: readonly PetFeatureTrigger[];
  execute: PetFeatureHandler;
  isVisible?: () => boolean;
};

export type PetFeatureRequest = {
  type: "chrome-pet:execute-feature";
  featureId: "rerollPet";
};

export type PetFeatureResponse =
  | { ok: true }
  | { ok: false; error: string };
