import { PET_GACHA_POOL } from "../shared/gacha/petPool";
import { PET_STORAGE_KEY, parseOwnedPet, type OwnedPet } from "../storage/petState";
import type { PetMutationRequest } from "../storage/petMessages";

export interface PetStore {
  read: () => Promise<unknown>;
  write: (pet: OwnedPet) => Promise<void>;
}

// 모든 탭의 read-modify-write를 하나의 큐에서 처리한다.
// 매번 저장소를 읽으므로 서비스 워커가 재시작되어도 데이터가 유지된다.
export function createPetService(store: PetStore): (request: PetMutationRequest) => Promise<OwnedPet> {
  let queue: Promise<unknown> = Promise.resolve();

  async function mutate(request: PetMutationRequest): Promise<OwnedPet> {
    const previous = parseOwnedPet(await store.read());
    if (request.action === "adopt" && previous) return previous;

    if (request.action !== "adopt" && (!previous || previous.instanceId !== request.instanceId)) {
      throw new Error("다른 탭에서 펫이 변경되었습니다. 현재 펫으로 다시 시도해 주세요.");
    }

    let pet: OwnedPet;
    if (request.action === "pet") {
      if (!Number.isSafeInteger(request.amount) || request.amount <= 0) {
        throw new Error("올바르지 않은 애정도 값입니다.");
      }
      const affection = previous!.affection + request.amount;
      if (!Number.isSafeInteger(affection)) throw new Error("애정도 저장 범위를 초과했습니다.");
      pet = { ...previous!, affection, revision: previous!.revision + 1 };
    } else {
      const entry = PET_GACHA_POOL.find((candidate) =>
        candidate.id === request.entryId && candidate.enabled && candidate.weight > 0,
      );
      if (!entry) throw new Error("뽑기 가능한 펫이 아닙니다.");
      pet = {
        id: entry.id,
        instanceId: crypto.randomUUID(),
        revision: (previous?.revision ?? 0) + 1,
        species: entry.species,
        skin: entry.skin,
        name: entry.name,
        level: 1,
        experience: 0,
        affection: 0,
        obtainedAt: new Date().toISOString(),
      };
    }

    await store.write(pet);
    return pet;
  }

  return (request) => {
    const result = queue.then(() => mutate(request));
    // 실패한 요청 하나가 이후 요청을 막지 않도록 큐는 복구한다.
    queue = result.catch(() => undefined);
    return result;
  };
}

export function createChromePetStore(): PetStore {
  return {
    async read() {
      const data = await chrome.storage.local.get(PET_STORAGE_KEY);
      return data[PET_STORAGE_KEY];
    },
    async write(pet) {
      await chrome.storage.local.set({ [PET_STORAGE_KEY]: pet });
    },
  };
}
