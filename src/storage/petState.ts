import type { PetSpecies } from "../shared/petTypes";

export const PET_STORAGE_KEY = "chromePet.currentPet";

export interface OwnedPet {
  id: string;
  // 같은 종류를 다시 뽑아도 서로 다른 펫으로 구분한다.
  instanceId: string;
  revision: number;
  species: PetSpecies;
  skin: string;
  name: string;
  level: number;
  experience: number;
  affection: number;
  obtainedAt: string;
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

// 기존 저장 데이터를 지우지 않고 새 필드에 기본값을 적용한다.
export function parseOwnedPet(value: unknown): OwnedPet | null {
  if (!value || typeof value !== "object") return null;
  const pet = value as Partial<OwnedPet>;
  if (
    typeof pet.id !== "string" ||
    (pet.species !== "cat" && pet.species !== "dog") ||
    typeof pet.skin !== "string"
  ) {
    return null;
  }

  const obtainedAt = typeof pet.obtainedAt === "string" ? pet.obtainedAt : "";
  return {
    id: pet.id,
    instanceId: typeof pet.instanceId === "string" && pet.instanceId
      ? pet.instanceId
      : `legacy:${pet.id}:${obtainedAt}`,
    revision: nonNegativeInteger(pet.revision),
    species: pet.species,
    skin: pet.skin,
    name: typeof pet.name === "string" ? pet.name : pet.id,
    level: Math.max(1, nonNegativeInteger(pet.level, 1)),
    experience: nonNegativeInteger(pet.experience),
    affection: nonNegativeInteger(pet.affection),
    obtainedAt,
  };
}
