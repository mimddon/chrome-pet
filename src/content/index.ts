
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

type PetRuntime = {
  destroy: () => void;
};

let currentRuntime: PetRuntime | null = null;
let gachaInProgress = false;

// 펫 생성 및 게임 루프 실행
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

  const renderer = new PetRenderer(pet, container);
  const animator = new PetAnimator(pet, renderer);
  const movement = new MovementSystem(80);
  const behavior = new BehaviorSystem(pet, movement);

  const gameLoop = new GameLoop((deltaTime) => {
    behavior.update(deltaTime);
    animator.update(deltaTime);
    renderer.render();
  });

  gameLoop.start();

  return {
    destroy() {
      gameLoop.stop();
      renderer.destroy();
      container.remove();
    },
  };
}

// 현재 펫을 새로운 펫으로 교체
function replacePet(owned: OwnedPet): void {
  currentRuntime?.destroy();
  currentRuntime = null;

  document.getElementById("chrome-pet-root")?.remove();

  currentRuntime = startPet(owned);

  console.log(
    `[Chrome Pet] 현재 펫: ${owned.name}`,
  );
}

// 설정에서 다시 뽑기 요청
async function rerollPet(): Promise<void> {
  if (gachaInProgress) return;

  gachaInProgress = true;

  try {
    console.log("[Chrome Pet] 다시 뽑기 시작");

    const newPet = await showGachaModal("reroll");

    if (!newPet) {
      console.log("[Chrome Pet] 다시 뽑기 취소");
      return;
    }

    replacePet(newPet);

    console.log(
      `[Chrome Pet] 펫 교체 완료: ${newPet.name}`,
    );
  } catch (error) {
    console.error(
      "[Chrome Pet] 다시 뽑기 실패",
      error,
    );
  } finally {
    gachaInProgress = false;
  }
}

// PetRenderer → PetSettings에서 전달한 이벤트 수신
document.addEventListener("chrome-pet:reroll", () => {
  void rerollPet();
});

// 확장 프로그램 최초 실행
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
