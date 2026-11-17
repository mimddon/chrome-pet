
import type { PetConfig } from "../shared/petTypes";
import {
  getOwnedPet,
  type OwnedPet,
} from "../storage/petStorage";

import { showGachaModal } from "./gacha/GachaModal";
import { Pet } from "./pets/Pet";
import { PetRenderer } from "./pets/PetRenderer";
import { PetAnimator } from "./pets/PetAnimator";
import { MovementSystem } from "./systems/MovementSystem";
import { BehaviorSystem } from "./systems/BehaviorSystem";
import { GameLoop } from "./systems/GameLoop";
import { ButterflySystem } from "./systems/ButterflySystem";
import { PetSettings } from "./ui/PetSettings";
import { createPetFeatures } from "../shared/features";
import type { PetFeatureHandler, PetFeatureRequest, PetFeatureResponse } from "../shared/features";

type PetRuntime = {
  destroy: () => void;
  rerollPet: PetFeatureHandler;
};

let currentRuntime: PetRuntime | null = null;
let gachaInProgress = false;

// 펫 생성
function startPet(owned: OwnedPet): PetRuntime {
  const petConfig: PetConfig = {
    species: owned.species,
    skin: owned.skin,
    size: 96,
  };

  const initialX = Math.max(
    0,
    (window.innerWidth - petConfig.size) / 2,
  );

  const initialY = Math.max(
    0,
    window.innerHeight - petConfig.size - 20,
  );

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
    x: initialX,
    y: initialY,
  });

  const movement = new MovementSystem(80);
  const behavior = new BehaviorSystem(pet, movement);

  // 나비 시스템 생성
  const butterfly = new ButterflySystem(
    pet,
    behavior,
    container,
  );

  const features = createPetFeatures({
    petting: () => renderer.handlePetting(),
    openPetStatus: () => renderer.showStatusPanel(),
    openPetSettings: () => settings.open(),
    spawnButterfly: () => {
      if (!gachaInProgress) butterfly.spawn();
    },
    rerollPet: () => settings.confirmReroll(),
  });
  const rerollFeature = features.find((feature) => feature.id === "rerollPet")!;
  const settings = new PetSettings(
    rerollFeature,
    () => { void drawReplacementPet(); },
  );
  const renderer = new PetRenderer(pet, container, {
    onGrab: () => behavior.pause(),
    onDragStart: () => {
      butterfly.cancel();
      movement.stop(pet);
    },
    onRelease: (dragged) => behavior.resume(dragged),
  }, features);
  const animator = new PetAnimator(pet, renderer);

  const gameLoop = new GameLoop((deltaTime) => {
    behavior.update(deltaTime);
    animator.update(deltaTime);
    renderer.render();
  });

  gameLoop.start();

  return {
    rerollPet: rerollFeature.execute,

    destroy() {
      gameLoop.stop();
      renderer.destroy();
      settings.destroy();
      butterfly.destroy();
      container.remove();
    },
  };
}

// 현재 펫 교체
function replacePet(owned: OwnedPet): void {
  currentRuntime?.destroy();
  currentRuntime = null;

  document.getElementById("chrome-pet-root")?.remove();

  currentRuntime = startPet(owned);
}

// 다시 뽑기
async function drawReplacementPet(): Promise<void> {
  if (gachaInProgress) return;

  gachaInProgress = true;

  try {
    const newPet = await showGachaModal("reroll");

    if (!newPet) {
      return;
    }

    replacePet(newPet);
  } catch (error) {
    console.error(
      "[Chrome Pet] 다시 뽑기 실패",
      error,
    );
  } finally {
    gachaInProgress = false;
  }
}

// 최초 실행
async function main(): Promise<void> {
  if (
    document.getElementById("chrome-pet-root") ||
    document.getElementById("chrome-pet-gacha-root")
  ) {
    return;
  }

  if (gachaInProgress) return;

  gachaInProgress = true;

  try {
    const owned = await getOwnedPet();

    const pet = owned ?? await showGachaModal();

    replacePet(pet);
  } catch (error) {
    console.error(
      "[Chrome Pet] 초기화 실패",
      error,
    );
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

void main();
