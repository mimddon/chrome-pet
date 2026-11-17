import type { PetPoolEntry } from "../shared/gacha/petPool";
import { PET_STORAGE_KEY, parseOwnedPet, type OwnedPet } from "./petState";
import type { PetMutationRequest, PetMutationResponse } from "./petMessages";

export type { OwnedPet } from "./petState";

export async function getOwnedPet(): Promise<OwnedPet | null> {
  const data = await chrome.storage.local.get(PET_STORAGE_KEY);
  return parseOwnedPet(data[PET_STORAGE_KEY]);
}

// 구독을 먼저 등록해서 초기 조회 중 발생한 변경도 놓치지 않는다.
export function watchOwnedPet(
  onChange: (pet: OwnedPet | null) => void,
  onError: (error: unknown) => void = (error) => {
    console.error("[Chrome Pet] 펫 동기화 실패", error);
  },
): () => void {
  let active = true;
  let changed = false;
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (!active || area !== "local" || !Object.hasOwn(changes, PET_STORAGE_KEY)) return;
    changed = true;
    onChange(parseOwnedPet(changes[PET_STORAGE_KEY]?.newValue));
  };

  chrome.storage.onChanged.addListener(listener);
  void getOwnedPet().then(
    (pet) => { if (active && !changed) onChange(pet); },
    (error: unknown) => { if (active && !changed) onError(error); },
  );

  return () => {
    active = false;
    chrome.storage.onChanged.removeListener(listener);
  };
}

async function mutatePet(request: PetMutationRequest): Promise<OwnedPet> {
  const response = await chrome.runtime.sendMessage<PetMutationRequest, PetMutationResponse>(request);
  if (!response) throw new Error("확장 프로그램을 다시 로드하고 페이지를 새로고침해 주세요.");
  if (!response.ok) throw new Error(response.error);
  return response.pet;
}

export function saveOwnedPet(entry: PetPoolEntry): Promise<OwnedPet> {
  return mutatePet({ type: "chrome-pet:mutate", action: "adopt", entryId: entry.id });
}

export function replaceOwnedPet(entry: PetPoolEntry, instanceId: string): Promise<OwnedPet> {
  return mutatePet({ type: "chrome-pet:mutate", action: "replace", entryId: entry.id, instanceId });
}

export function increasePetAffection(instanceId: string, amount = 1): Promise<OwnedPet> {
  return mutatePet({ type: "chrome-pet:mutate", action: "pet", instanceId, amount });
}
