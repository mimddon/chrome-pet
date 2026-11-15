
import {
  PET_GACHA_POOL,
  type PetPoolEntry,
} from "./petPool";

// 현재 뽑기 가능한 펫 목록
export function getAvailablePets(): PetPoolEntry[] {
  return PET_GACHA_POOL.filter(
    (pet) => pet.enabled && pet.weight > 0,
  );
}

// 펫별 실제 확률 조회
export function getPetProbabilities() {
  const pets = getAvailablePets();

  const totalWeight = pets.reduce(
    (sum, pet) => sum + pet.weight,
    0,
  );

  return pets.map((pet) => ({
    ...pet,
    probability: (pet.weight / totalWeight) * 100,
  }));
}

// 가중치 기반 랜덤 펫 추첨
export function drawRandomPet(): PetPoolEntry {
  const pets = getAvailablePets();

  const totalWeight = pets.reduce(
    (sum, pet) => sum + pet.weight,
    0,
  );

  if (totalWeight <= 0) {
    throw new Error("뽑기 가능한 펫이 없습니다.");
  }

  const random = Math.random() * totalWeight;

  let accumulated = 0;

  for (const pet of pets) {
    accumulated += pet.weight;

    if (random < accumulated) {
      return pet;
    }
  }

  return pets[pets.length - 1]!;
}
