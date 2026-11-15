
import { Pet } from "../pets/Pet";
import type { PetPosition } from "../../shared/petTypes";

export class MovementSystem {
  private target: PetPosition | null = null;

  // 초당 이동 속도 (px/s)
  private readonly speed: number;

  constructor(speed: number = 80) {
    this.speed = speed;
  }

  // 목표 위치 설정
  setTarget(x: number, y: number): void {
    this.target = { x, y };
  }

  // 목표 위치 확인
  getTarget(): PetPosition | null {
    return this.target ? { ...this.target } : null;
  }

  // 이동 중인지 확인
  isMoving(): boolean {
    return this.target !== null;
  }

  // 이동 취소
  stop(pet: Pet): void {
    this.target = null;
    pet.stop();
  }

  // 매 프레임 이동 처리
  update(pet: Pet, deltaTime: number): void {
    if (!this.target) return;

    const position = pet.getPosition();

    const dx = this.target.x - position.x;
    const dy = this.target.y - position.y;

    const distance = Math.hypot(dx, dy);

    // 목표에 도착
    if (distance <= 0.5) {
      this.finish(pet);
      return;
    }

    // deltaTime은 초 단위
    const step = this.speed * deltaTime;

    // 목표를 지나치지 않도록 이동 거리 제한
    const movement = Math.min(step, distance);

    const moveX = (dx / distance) * movement;
    const moveY = (dy / distance) * movement;

    pet.move(moveX, moveY);

    // 화면 경계 제한
    this.clampToViewport(pet);

    // 목표에 도착했는지 확인
    const updated = pet.getPosition();

    if (
      Math.hypot(
        this.target.x - updated.x,
        this.target.y - updated.y,
      ) <= 0.5
    ) {
      this.finish(pet);
    }
  }

  private finish(pet: Pet): void {
    this.target = null;
    pet.stop();
  }

  // 화면 밖으로 나가지 않도록 제한
  private clampToViewport(pet: Pet): void {
    const position = pet.getPosition();

    const maxX = Math.max(0, window.innerWidth - pet.config.size);
    const maxY = Math.max(0, window.innerHeight - pet.config.size);

    const x = Math.max(0, Math.min(position.x, maxX));
    const y = Math.max(0, Math.min(position.y, maxY));

    pet.setPosition(x, y);
  }
}
