
import { Pet } from "../pets/Pet";
import { MovementSystem } from "./MovementSystem";

type BehaviorState = "idle" | "walking";

export class BehaviorSystem {
  private state: BehaviorState = "idle";

  // 현재 행동이 끝나기까지 남은 시간 (초)
  private remainingTime = 0;

  // 대기 시간 범위
  private readonly minIdleTime = 2;
  private readonly maxIdleTime = 6;

  // 이동 거리 범위 (px)
  private readonly minWalkDistance = 80;
  private readonly maxWalkDistance = 250;

  constructor(
    private readonly pet: Pet,
    private readonly movement: MovementSystem,
  ) {
    this.startIdle();
  }

  update(deltaTime: number): void {
    // 이동 중이면 MovementSystem이 이동을 담당
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

    // 현재 위치를 기준으로 좌우 중 랜덤 선택
    const direction = Math.random() < 0.5 ? -1 : 1;

    const distance = this.random(
      this.minWalkDistance,
      this.maxWalkDistance,
    );

    // 이동할 X 좌표 계산
    const targetX = position.x + direction * distance;

    // 화면 경계 계산
    const maxX = Math.max(
      0,
      window.innerWidth - this.pet.config.size,
    );

    const clampedX = Math.max(0, Math.min(targetX, maxX));

    // 이동할 공간이 없으면 반대 방향으로 시도
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
