import type { PetConfig } from "../shared/petTypes";
import { watchOwnedPet, type OwnedPet } from "../storage/petStorage";
import { showGachaModal } from "./gacha/GachaModal";
import { Pet } from "./pets/Pet";
import { PetRenderer } from "./pets/PetRenderer";
import { PetAnimator } from "./pets/PetAnimator";
import { GameLoop } from "./systems/GameLoop";
import { ButterflySystem } from "./systems/ButterflySystem";
import { WorldConnection } from "./systems/WorldConnection";
import { PetSettings } from "./ui/PetSettings";
import { createPetFeatures } from "../shared/features";
import type { PetFeatureHandler, PetFeatureRequest, PetFeatureResponse } from "../shared/features";
import type { PetWorldSnapshot } from "../shared/worldTypes";

type PetRuntime = {
  destroy: () => void;
  rerollPet: PetFeatureHandler;
  syncOwnedPet: (owned: OwnedPet) => void;
  syncWorld: (snapshot: PetWorldSnapshot) => void;
  showPettingReaction: (affection: number) => void;
};

let currentRuntime: PetRuntime | null = null;
let currentOwned: OwnedPet | null = null;
let latestWorld: PetWorldSnapshot | null = null;
let gachaInProgress = false;

const world = new WorldConnection((message) => {
  if (message.type === "snapshot") {
    latestWorld = message.snapshot;
    if (currentOwned?.instanceId === message.snapshot.instanceId) {
      currentRuntime?.syncWorld(message.snapshot);
    }
  } else if (message.type === "petting" && currentOwned?.instanceId === message.instanceId) {
    currentRuntime?.showPettingReaction(message.affection);
  }
});

function startPet(owned: OwnedPet): PetRuntime {
  const petConfig: PetConfig = { species: owned.species, skin: owned.skin, size: 96 };
  const container = document.createElement("div");
  container.id = "chrome-pet-root";
  Object.assign(container.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  document.documentElement.append(container);

  const pet = new Pet(petConfig, {
    x: Math.max(0, (window.innerWidth - petConfig.size) / 2),
    y: Math.max(0, window.innerHeight - petConfig.size - 20),
  });
  const butterfly = new ButterflySystem(pet, container);
  const features = createPetFeatures({
    petting: () => renderer.handlePetting(),
    openPetStatus: () => renderer.showStatusPanel(),
    openPetSettings: () => settings.open(),
    spawnButterfly: () => {
      if (!gachaInProgress) world.command(owned.instanceId, { action: "spawnButterfly" });
    },
    rerollPet: () => settings.confirmReroll(),
  });
  const rerollFeature = features.find((feature) => feature.id === "rerollPet")!;
  const settings = new PetSettings(rerollFeature, () => { void drawPet("reroll"); });
  const renderer = new PetRenderer(pet, container, {
    onGrab: () => world.command(owned.instanceId, { action: "hold" }),
    onDragStart: () => {},
    onDragMove: (x, y) => world.command(owned.instanceId, {
      action: "drag",
      x: x / Math.max(1, window.innerWidth - petConfig.size),
      y: y / Math.max(1, window.innerHeight - petConfig.size),
    }),
    onRelease: () => world.command(owned.instanceId, { action: "release" }),
  }, features, owned);
  const animator = new PetAnimator(pet, renderer);
  let snapshot: PetWorldSnapshot | null = null;

  const applyPosition = (): void => {
    if (!snapshot) return;
    pet.setPosition(
      snapshot.x * Math.max(0, window.innerWidth - petConfig.size),
      snapshot.y * Math.max(0, window.innerHeight - petConfig.size),
    );
    pet.setDirection(snapshot.direction);
    pet.setState(snapshot.state);
    animator.sync(snapshot.animationTime);
    butterfly.sync(snapshot.butterfly);
    renderer.render();
  };
  window.addEventListener("resize", applyPosition);

  // 행동과 이동은 백그라운드에서만 계산한다. 탭은 공유 상태를 그리기만 한다.
  const gameLoop = new GameLoop(() => {
    renderer.render();
  });
  gameLoop.start();

  return {
    rerollPet: rerollFeature.execute,
    syncOwnedPet: (pet) => renderer.syncOwnedPet(pet),
    showPettingReaction: (affection) => renderer.showPettingReaction(affection),
    syncWorld(next) {
      snapshot = next;
      applyPosition();
    },
    destroy() {
      gameLoop.stop();
      window.removeEventListener("resize", applyPosition);
      renderer.destroy();
      settings.destroy();
      butterfly.destroy();
      container.remove();
    },
  };
}

function syncPet(owned: OwnedPet | null): void {
  if (owned && currentOwned && owned.revision < currentOwned.revision) return;
  if (owned && currentOwned?.instanceId === owned.instanceId) {
    currentOwned = owned;
    currentRuntime?.syncOwnedPet(owned);
    return;
  }

  currentRuntime?.destroy();
  currentRuntime = null;
  currentOwned = owned;
  if (owned) {
    currentRuntime = startPet(owned);
    if (latestWorld?.instanceId === owned.instanceId) currentRuntime.syncWorld(latestWorld);
  } else if (!gachaInProgress) {
    void drawPet("first");
  }
}

async function drawPet(mode: "first" | "reroll"): Promise<void> {
  if (gachaInProgress || (mode === "reroll" && !currentOwned)) return;
  gachaInProgress = true;
  try {
    const pet = mode === "first"
      ? await showGachaModal()
      : await showGachaModal("reroll", currentOwned!.instanceId);
    if (pet) syncPet(pet);
  } catch (error) {
    console.error("[Chrome Pet] 펫 뽑기 실패", error);
  } finally {
    gachaInProgress = false;
  }
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse: (response: PetFeatureResponse) => void) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== "object") return;
  const request = message as Partial<PetFeatureRequest>;
  if (request.type !== "chrome-pet:execute-feature" || request.featureId !== "rerollPet") return;
  if (gachaInProgress || !currentRuntime) {
    sendResponse({ ok: false, error: "펫을 준비 중입니다. 잠시 후 다시 시도해 주세요." });
    return;
  }
  void Promise.resolve().then(currentRuntime.rerollPet).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false, error: "다시 뽑기 화면을 열지 못했습니다." }),
  );
  return true;
});

watchOwnedPet(syncPet);
