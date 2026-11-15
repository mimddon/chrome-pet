
import { Pet } from "../pets/Pet";
import { MovementSystem } from "./MovementSystem";

type BehaviorState = "idle" | "walking" | "chasing";

export class BehaviorSystem {
  private state: BehaviorState = "idle";

  private remainingTime = 0;
  private chaseCallback: (() => void) | null = null;

  private readonly minIdleTime = 2;
  private readonly maxIdleTime = 6;

  private readonly minWalkDistance = 80;
  private readonly maxWalkDistance = 250;

  constructor(
    private readonly pet: Pet,
    private readonly movement: MovementSystem,
  ) {
    this.startIdle();
  }

  update(deltaTime: number): void {
    // 나비를 추적하는 중
    if (this.state === "chasing") {
      this.movement.update(this.pet, deltaTime);

      if (!this.movement.isMoving()) {
        const callback = this.chaseCallback;
        this.chaseCallback = null;

        this.startIdle();
        callback?.();
      }

      return;
    }

    // 기존 랜덤 이동
    if (this.state === "walking") {
      this.movement.update(this.pet, deltaTime);

      if (!this.movement.isMoving()) {
        this.startIdle();
      }

      return;
    }

    // 대기 중
    this.remainingTime -= deltaTime;

    if (this.remainingTime <= 0) {
      this.startWalk();
    }
  }

  // 나비를 향해 이동 시작
  chase(
    targetX: number,
    onArrived: () => void,
  ): void {
    // 기존 랜덤 이동 중단
    this.movement.stop(this.pet);

    const position = this.pet.getPosition();

    const maxX = Math.max(
      0,
      window.innerWidth - this.pet.config.size,
    );

    const clampedX = Math.max(
      0,
      Math.min(targetX, maxX),
    );

    this.chaseCallback = onArrived;
    this.state = "chasing";

    this.movement.setTarget(
      clampedX,
      position.y,
    );

    this.pet.setState("walking");
  }

  // 추적 취소
  cancelChase(): void {
    if (this.state !== "chasing") return;

    this.chaseCallback = null;
    this.startIdle();
  }

  private startIdle(): void {
    this.state = "idle";

    this.movement.stop(this.pet);

    this.remainingTime = this.random(
      this.minIdleTime,
      this.maxIdleTime,
    );

    this.pet.setState("idle");
  }

  private startWalk(): void {
    const position = this.pet.getPosition();

    const direction = Math.random() < 0.5 ? -1 : 1;

    const distance = this.random(
      this.minWalkDistance,
      this.maxWalkDistance,
    );

    const targetX = position.x + direction * distance;

    const maxX = Math.max(
      0,
      window.innerWidth - this.pet.config.size,
    );

    const clampedX = Math.max(
      0,
      Math.min(targetX, maxX),
    );

    if (Math.abs(clampedX - position.x) < 1) {
      const oppositeX = position.x - direction * distance;

      this.movement.setTarget(
        Math.max(0, Math.min(oppositeX, maxX)),
        position.y,
      );
    } else {
      this.movement.setTarget(clampedX, position.y);
    }

    this.state = "walking";
    this.pet.setState("walking");
  }

  private random(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
