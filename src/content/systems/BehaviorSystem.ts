
import { Pet } from "../pets/Pet";
import { MovementSystem } from "./MovementSystem";

type BehaviorState = "idle" | "walking" | "chasing";

export class BehaviorSystem {
  private state: BehaviorState = "idle";
  private remainingTime = 0;
  private chaseCallback: (() => void) | null = null;
  private paused = false;

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
    if (this.paused) return;

    // 나비 추적 중
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

    // 랜덤 이동 중
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

  pause(): void {
    this.paused = true;
    this.pet.stop();
  }

  resume(resetToIdle = false): void {
    this.paused = false;

    if (resetToIdle) {
      this.chaseCallback = null;
      this.startIdle();
    } else {
      this.pet.setState(this.state === "idle" ? "idle" : "walking");
    }
  }

  // 나비를 향해 X, Y 양쪽으로 이동
  chase(
    targetX: number,
    targetY: number,
    onArrived: () => void,
  ): void {
    this.movement.stop(this.pet);

    const target = this.clampPosition(
      targetX,
      targetY,
    );

    this.chaseCallback = onArrived;
    this.state = "chasing";

    this.movement.setTarget(
      target.x,
      target.y,
    );

    this.pet.setState("walking");
  }

  // 나비 추적 취소
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

  // X, Y 양쪽으로 랜덤 이동
  private startWalk(): void {
    const position = this.pet.getPosition();

    const angle = Math.random() * Math.PI * 2;

    const distance = this.random(
      this.minWalkDistance,
      this.maxWalkDistance,
    );

    const targetX =
      position.x + Math.cos(angle) * distance;

    const targetY =
      position.y + Math.sin(angle) * distance;

    const target = this.clampPosition(
      targetX,
      targetY,
    );

    // 목표가 현재 위치와 너무 가까우면 잠시 대기
    if (
      Math.hypot(
        target.x - position.x,
        target.y - position.y,
      ) < 10
    ) {
      this.startIdle();
      return;
    }

    this.movement.setTarget(
      target.x,
      target.y,
    );

    this.state = "walking";
    this.pet.setState("walking");
  }

  // 화면 경계 제한
  private clampPosition(
    x: number,
    y: number,
  ): { x: number; y: number } {
    const maxX = Math.max(
      0,
      window.innerWidth - this.pet.config.size,
    );

    const maxY = Math.max(
      0,
      window.innerHeight - this.pet.config.size,
    );

    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }

  private random(
    min: number,
    max: number,
  ): number {
    return min + Math.random() * (max - min);
  }
}
