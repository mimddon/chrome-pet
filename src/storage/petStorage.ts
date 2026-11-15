
import type { PetPoolEntry } from "../shared/gacha/petPool";

const STORAGE_KEY = "chromePet.currentPet";

export interface OwnedPet {
  id: string;
  species: PetPoolEntry["species"];
  skin: string;
  name: string;
  level: number;
  experience: number;
  affection: number;
  obtainedAt: string;
}

function createOwnedPet(entry: PetPoolEntry): OwnedPet {
  return {
    id: entry.id,
    species: entry.species,
    skin: entry.skin,
    name: entry.name,
    level: 1,
    experience: 0,
    affection: 0,
    obtainedAt: new Date().toISOString(),
  };
}

// 현재 보유 중인 펫 조회
export async function getOwnedPet(): Promise<OwnedPet | null> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const value: unknown = data[STORAGE_KEY];

  if (!value || typeof value !== "object") {
    return null;
  }

  const pet = value as Partial<OwnedPet>;

  if (
    typeof pet.id !== "string" ||
    (pet.species !== "cat" && pet.species !== "dog") ||
    typeof pet.skin !== "string"
  ) {
    return null;
  }

  return pet as OwnedPet;
}

// 최초 펫 뽑기: 기존 펫이 있으면 유지
export async function saveOwnedPet(
  entry: PetPoolEntry,
): Promise<OwnedPet> {
  const previous = await getOwnedPet();

  if (previous) {
    return previous;
  }

  const pet = createOwnedPet(entry);

  await chrome.storage.local.set({
    [STORAGE_KEY]: pet,
  });

  return pet;
}

// 다시 뽑기: 새로운 펫으로 교체
export async function replaceOwnedPet(
  entry: PetPoolEntry,
): Promise<OwnedPet> {
  const pet = createOwnedPet(entry);

  await chrome.storage.local.set({
    [STORAGE_KEY]: pet,
  });

  return pet;
}


/**
 * 현재 펫의 애정도를 증가시킨다.
 * 애정도에는 상한선을 두지 않는다.
 */
export async function increasePetAffection(
  amount = 1,
): Promise<number> {
  const pet = await getOwnedPet();

  if (!pet) {
    throw new Error("보유한 펫이 없습니다.");
  }

  const currentAffection =
    Number.isFinite(pet.affection) && pet.affection >= 0
      ? pet.affection
      : 0;

  const newAffection =
    currentAffection + Math.max(0, Math.floor(amount));

  await chrome.storage.local.set({
    "chromePet.currentPet": {
      ...pet,
      affection: newAffection,
    },
  });

  return newAffection;
}
