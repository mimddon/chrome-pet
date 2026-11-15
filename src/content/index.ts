
import type { PetConfig } from "../shared/petTypes";

import { Pet } from "./pets/Pet";
import { PetRenderer } from "./pets/PetRenderer";
import { PetAnimator } from "./pets/PetAnimator";

import { MovementSystem } from "./systems/MovementSystem";
import { BehaviorSystem } from "./systems/BehaviorSystem";
import { GameLoop } from "./systems/GameLoop";

// 기본 펫 설정
const petConfig: PetConfig = {
  species: "cat",
  skin: "basic",
  size: 96,
};

// 펫이 화면 중앙 하단에서 시작하도록 설정
const initialX = Math.max(
  0,
  (window.innerWidth - petConfig.size) / 2,
);

const initialY = Math.max(
  0,
  window.innerHeight - petConfig.size - 20,
);

// 웹페이지와 분리된 펫 전용 컨테이너
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

document.documentElement.appendChild(container);

// 펫 객체 및 시스템 생성
const pet = new Pet(petConfig, {
  x: initialX,
  y: initialY,
});

const renderer = new PetRenderer(pet, container);
const animator = new PetAnimator(pet, renderer);

const movement = new MovementSystem(80);
const behavior = new BehaviorSystem(pet, movement);

// 게임 루프
const gameLoop = new GameLoop((deltaTime) => {
  behavior.update(deltaTime);
  animator.update(deltaTime);
  renderer.render();
});

gameLoop.start();

console.log("[Chrome Pet] 펫 시스템 시작!", petConfig);
