import { createChromePetStore, createPetService } from "./petService";
import { isPetMutationRequest, type PetMutationResponse } from "../storage/petMessages";
import { createWorldHost } from "./worldHost";
import { parseOwnedPet } from "../storage/petState";

const store = createChromePetStore();
const worldHost = createWorldHost(async (instanceId): Promise<void> => {
  await mutatePet({ type: "chrome-pet:mutate", action: "pet", instanceId, amount: 3 });
});
const mutatePet = createPetService({
  read: store.read,
  async write(pet) {
    await store.write(pet);
    worldHost.setPet(pet);
  },
});
const initialized = store.read().then((value) => {
  const pet = parseOwnedPet(value);
  if (pet) worldHost.setPet(pet);
}).catch((error: unknown) => console.error("[Chrome Pet] 펫 불러오기 실패", error));

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse: (response: PetMutationResponse) => void) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== "object") return;
  if ((message as Record<string, unknown>).type !== "chrome-pet:mutate") return;
  if (!isPetMutationRequest(message)) {
    sendResponse({ ok: false, error: "올바르지 않은 펫 변경 요청입니다." });
    return;
  }
  void initialized.then(() => mutatePet(message)).then(
    (pet) => {
      worldHost.setPet(pet);
      if (message.action === "pet") worldHost.notifyPetting(pet);
      sendResponse({ ok: true, pet });
    },
    (error: unknown) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "펫 정보를 저장하지 못했습니다.",
    }),
  );
  return true;
});
