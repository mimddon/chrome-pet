import type { PetWorldCommand, PetWorldSnapshot, ButterflyState } from "../shared/worldTypes";
import type { PetDirection, PetState } from "../shared/petTypes";

// 창 크기에 관계없이 같은 경로와 속도를 공유하는 가상 화면.
const WIDTH = 904;
const HEIGHT = 604;
const SPEED = 80;

type Point = { x: number; y: number };
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export class PetWorld {
  private x = WIDTH / 2;
  private y = HEIGHT - 20;
  private direction: PetDirection = "right";
  private target: Point | null = null;
  private remainingTime = this.idleTime();
  private butterfly: ButterflyState | null = null;
  private catchTime = 0;
  private holder: string | null = null;
  private dragged = false;
  private elapsedTime = 0;
  private animationState: PetState = "idle";
  private animationStartedAt = 0;
  private butterflyStartedAt = 0;

  constructor(readonly instanceId: string, saved?: PetWorldSnapshot) {
    if (saved?.instanceId === instanceId &&
      Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      this.x = clamp(saved.x) * WIDTH;
      this.y = clamp(saved.y) * HEIGHT;
      this.direction = saved.direction === "left" ? "left" : "right";
    }
  }

  snapshot(): PetWorldSnapshot {
    const state = !this.holder && this.target ? "walking" : "idle";
    if (state !== this.animationState) {
      this.animationState = state;
      this.animationStartedAt = this.elapsedTime;
    }
    return {
      instanceId: this.instanceId,
      x: this.x / WIDTH,
      y: this.y / HEIGHT,
      direction: this.direction,
      state,
      animationTime: this.elapsedTime - this.animationStartedAt,
      butterfly: this.butterfly ? {
        ...this.butterfly,
        elapsedTime: this.elapsedTime - this.butterflyStartedAt,
      } : null,
    };
  }

  command(owner: string, command: PetWorldCommand): void {
    switch (command.action) {
      case "hold":
        if (!this.holder) {
          this.holder = owner;
          this.dragged = false;
        }
        break;
      case "drag":
        if (this.holder !== owner || !Number.isFinite(command.x) || !Number.isFinite(command.y)) return;
        this.dragged = true;
        this.target = null;
        this.butterfly = null;
        this.x = clamp(command.x) * WIDTH;
        this.y = clamp(command.y) * HEIGHT;
        break;
      case "release":
        this.release(owner);
        break;
      case "spawnButterfly": {
        if (this.holder || this.butterfly) return;
        const target = this.randomTarget(100, 250);
        this.target = target;
        this.butterflyStartedAt = this.elapsedTime;
        this.butterfly = {
          id: crypto.randomUUID(),
          x: target.x / WIDTH,
          y: target.y / HEIGHT,
          phase: "flying",
          elapsedTime: 0,
        };
        break;
      }
    }
  }

  release(owner: string): void {
    if (this.holder !== owner) return;
    this.holder = null;
    if (this.dragged) {
      this.target = null;
      this.remainingTime = this.idleTime();
    }
    this.dragged = false;
  }

  update(deltaTime: number): void {
    const delta = Math.max(0, Math.min(deltaTime, 0.05));
    this.elapsedTime += delta;
    if (this.holder) return;
    if (this.butterfly?.phase === "caught") {
      this.catchTime -= delta;
      if (this.catchTime <= 0) this.butterfly = null;
    }

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.min(SPEED * delta, distance);
      if (distance > 0) {
        this.x += dx / distance * step;
        this.y += dy / distance * step;
        if (dx !== 0) this.direction = dx > 0 ? "right" : "left";
      }
      if (distance <= step + 0.5) {
        this.target = null;
        this.remainingTime = this.idleTime();
        if (this.butterfly?.phase === "flying") {
          this.butterfly.phase = "caught";
          this.butterflyStartedAt = this.elapsedTime;
          this.catchTime = 0.35;
        }
      }
      return;
    }

    this.remainingTime -= delta;
    if (this.remainingTime <= 0) {
      const target = this.randomTarget(80, 250);
      if (Math.hypot(target.x - this.x, target.y - this.y) >= 10) {
        this.target = target;
      } else {
        this.remainingTime = this.idleTime();
      }
    }
  }

  private randomTarget(min: number, max: number): Point {
    const angle = Math.random() * Math.PI * 2;
    const distance = min + Math.random() * (max - min);
    return {
      x: clamp((this.x + Math.cos(angle) * distance) / WIDTH) * WIDTH,
      y: clamp((this.y + Math.sin(angle) * distance) / HEIGHT) * HEIGHT,
    };
  }

  private idleTime(): number {
    return 2 + Math.random() * 4;
  }
}
