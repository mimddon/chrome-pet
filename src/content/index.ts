
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

type PetRuntime = {
  destroy: () => void;
  spawnButterfly: () => void;
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

  const renderer = new PetRenderer(pet, container, {
    onGrab: () => behavior.pause(),
    onDragStart: () => {
      butterfly.cancel();
      movement.stop(pet);
    },
    onRelease: (dragged) => behavior.resume(dragged),
  });
  const animator = new PetAnimator(pet, renderer);

  const gameLoop = new GameLoop((deltaTime) => {
    behavior.update(deltaTime);
    animator.update(deltaTime);
    renderer.render();
  });

  gameLoop.start();

  return {
    spawnButterfly() {
      butterfly.spawn();
    },

    destroy() {
      gameLoop.stop();
      renderer.destroy();
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
async function rerollPet(): Promise<void> {
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

// 설정 → 다시 뽑기 이벤트
document.addEventListener("chrome-pet:reroll", () => {
  void rerollPet();
});

// 더블클릭 → 나비 소환 이벤트
document.addEventListener("chrome-pet:butterfly", () => {
  if (gachaInProgress) return;

  currentRuntime?.spawnButterfly();
});

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

void main();
