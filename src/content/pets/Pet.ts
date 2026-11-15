
import type {
  PetConfig,
  PetDirection,
  PetPosition,
  PetState,
} from "../../shared/petTypes";

export class Pet {
  readonly config: PetConfig;

  private position: PetPosition;
  private direction: PetDirection = "right";
  private state: PetState = "idle";

  constructor(config: PetConfig, initialPosition: PetPosition) {
    this.config = config;
    this.position = { ...initialPosition };
  }

  // 현재 위치
  getPosition(): PetPosition {
    return { ...this.position };
  }

  // 위치 변경
  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  // 현재 방향
  getDirection(): PetDirection {
    return this.direction;
  }

  // 방향 변경
  setDirection(direction: PetDirection): void {
    this.direction = direction;
  }

  // 현재 행동 상태
  getState(): PetState {
    return this.state;
  }

  // 행동 상태 변경
  setState(state: PetState): void {
    this.state = state;
  }

  // 좌표를 기준으로 이동
  move(dx: number, dy: number): void {
    this.position.x += dx;
    this.position.y += dy;

    if (dx > 0) {
      this.direction = "right";
    } else if (dx < 0) {
      this.direction = "left";
    }

    if (dx !== 0 || dy !== 0) {
      this.state = "walking";
    }
  }

  // 이동 중지
  stop(): void {
    this.state = "idle";
  }
}
