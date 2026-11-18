import type { PetWorldCommand, PetWorldSnapshot, ButterflyState, TreatState } from "../shared/worldTypes";
import {
  FALL_ASLEEP_SECONDS,
  LIE_DOWN_SECONDS,
  SIT_TAIL_CYCLE_SECONDS,
  STAND_UP_SECONDS,
  WAKE_UP_SECONDS,
} from "../shared/worldTypes";
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
  private sittingTime = 0;
  private sittingStartedAt = 0;
  private standingStartedAt: number | null = null;
  private sleepPhase: Extract<PetState,
    "lyingDown" | "fallingAsleep" | "sleeping" | "wakingUp" | "sleepToSit" | "sitToSleep"> | null = null;
  private phaseStartedAt = 0;
  private sleepingTime = 0;
  private tailCheckTime = 0;
  private tailWagTime: number | null = null;
  private tailWagDuration = 0;
  private butterfly: ButterflyState | null = null;
  private catchTime = 0;
  private holder: string | null = null;
  private dragged = false;
  private elapsedTime = 0;
  private animationState: PetState = "idle";
  private animationStartedAt = 0;
  private butterflyStartedAt = 0;
  private treat: TreatState | null = null;
  private treatStartedAt = 0;

  constructor(readonly instanceId: string, saved?: PetWorldSnapshot) {
    if (saved?.instanceId === instanceId &&
      Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      this.x = clamp(saved.x) * WIDTH;
      this.y = clamp(saved.y) * HEIGHT;
      this.direction = saved.direction === "left" ? "left" : "right";
    }
  }

  snapshot(): PetWorldSnapshot {
    const state = this.holder ? "idle"
      : this.sleepPhase ? this.sleepPhase
      : this.standingStartedAt !== null ? "standingUp"
      : this.target ? "walking"
      : this.sittingTime > 0 || this.treat?.phase === "eating" || this.treat?.phase === "rewarding"
        ? "sitting" : "idle";
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
      animationTime: this.elapsedTime - (this.sleepPhase ? this.phaseStartedAt
        : this.standingStartedAt ?? (this.sittingTime > 0 ? this.sittingStartedAt : this.animationStartedAt)),
      tailWagTime: state === "sitting" && this.sittingTime > 0 ? this.tailWagTime : null,
      butterfly: this.butterfly ? {
        ...this.butterfly,
        elapsedTime: this.elapsedTime - this.butterflyStartedAt,
      } : null,
      treat: this.treat ? {
        ...this.treat,
        elapsedTime: this.elapsedTime - this.treatStartedAt,
      } : null,
    };
  }

  command(owner: string, command: PetWorldCommand): void {
    switch (command.action) {
      case "hold":
        if (!this.holder) {
          this.stopSleeping();
          if (this.standingStartedAt !== null) {
            this.standingStartedAt = null;
            this.remainingTime = this.idleTime();
          }
          this.holder = owner;
          this.dragged = false;
          if (this.sittingTime > 0) {
            this.stopSitting();
            this.remainingTime = this.idleTime();
          }
        }
        break;
      case "drag":
        if (this.holder !== owner || !Number.isFinite(command.x) || !Number.isFinite(command.y)) return;
        this.dragged = true;
        this.target = null;
        this.butterfly = null;
        this.treat = null;
        this.x = clamp(command.x) * WIDTH;
        this.y = clamp(command.y) * HEIGHT;
        break;
      case "release":
        this.release(owner);
        break;
      case "placeTreat":
        if (this.holder || this.treat || !Number.isFinite(command.x) || !Number.isFinite(command.y)) return;
        if (this.sleepPhase && this.sleepPhase !== "wakingUp") {
          this.wakeForMovement();
        }
        if (this.sittingTime > 0) this.standUp();
        this.butterfly = null;
        this.catchTime = 0;
        this.target = { x: clamp(command.x) * WIDTH, y: clamp(command.y) * HEIGHT };
        this.treatStartedAt = this.elapsedTime;
        this.treat = {
          id: crypto.randomUUID(),
          x: this.target.x / WIDTH,
          y: this.target.y / HEIGHT,
          phase: "approaching",
          elapsedTime: 0,
        };
        break;
      case "spawnButterfly": {
        if (this.holder || this.butterfly || this.treat || this.sleepPhase) return;
        if (this.sittingTime > 0) this.standUp();
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

  // 먹기가 끝나는 프레임에만 간식 ID를 반환해 보상을 한 번 요청한다.
  update(deltaTime: number): string | null {
    const delta = Math.max(0, Math.min(deltaTime, 0.05));
    this.elapsedTime += delta;
    if (this.holder) {
      if (this.treat) this.treatStartedAt += delta;
      return null;
    }
    if (this.sleepPhase) {
      const duration = this.sleepPhase === "lyingDown" || this.sleepPhase === "sitToSleep" ? LIE_DOWN_SECONDS
        : this.sleepPhase === "fallingAsleep" ? FALL_ASLEEP_SECONDS
        : this.sleepPhase === "sleeping" ? this.sleepingTime : WAKE_UP_SECONDS;
      if (this.elapsedTime - this.phaseStartedAt >= duration) {
        this.phaseStartedAt += duration;
        switch (this.sleepPhase) {
          case "lyingDown":
          case "sitToSleep": this.sleepPhase = "fallingAsleep"; break;
          case "fallingAsleep": this.sleepPhase = "sleeping"; break;
          case "sleeping":
            this.phaseStartedAt -= duration;
            this.chooseActivity("sleeping");
            break;
          case "sleepToSit":
            this.sleepPhase = null;
            this.sittingStartedAt = this.phaseStartedAt - STAND_UP_SECONDS;
            this.tailCheckTime = this.tailWaitTime();
            break;
          case "wakingUp": this.stopSleeping(); break;
        }
      }
      return null;
    }
    if (this.standingStartedAt !== null) {
      if (this.elapsedTime - this.standingStartedAt >= STAND_UP_SECONDS) {
        this.standingStartedAt = null;
        if (!this.target) this.remainingTime = this.idleTime();
      }
      return null;
    }
    if (this.treat && this.treat.phase !== "approaching") {
      const elapsed = this.elapsedTime - this.treatStartedAt;
      if (this.treat.phase === "eating" && elapsed >= 0.9) {
        this.treat.phase = "rewarding";
        this.treatStartedAt = this.elapsedTime;
        return this.treat.id;
      }
      if (this.treat.phase === "happy" && elapsed >= 1.1) {
        this.treat = null;
        this.remainingTime = this.idleTime();
      }
      return null;
    }
    if (this.sittingTime > 0) {
      this.sittingTime = Math.max(0, this.sittingTime - delta);
      if (this.sittingTime === 0) {
        this.chooseActivity("sitting");
      } else {
        this.updateTail(delta);
      }
      return null;
    }
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
        if (this.treat?.phase === "approaching") {
          this.treat.phase = "eating";
          this.treatStartedAt = this.elapsedTime;
        }
      }
      return null;
    }

    this.remainingTime -= delta;
    if (this.remainingTime <= 0) this.chooseActivity("idle");
    return null;
  }

  private chooseActivity(posture: "idle" | "sitting" | "sleeping"): void {
    const activity = Math.random();
    if (activity < 0.3) {
      this.sittingTime = 10 + Math.random() * 10;
      if (posture === "sleeping") {
        this.sleepPhase = "sleepToSit";
        this.phaseStartedAt = this.elapsedTime;
      } else if (posture !== "sitting") {
        this.sittingStartedAt = this.elapsedTime;
        this.tailCheckTime = this.tailWaitTime();
      }
      return;
    }
    if (activity < 0.4) {
      const duration = 30 + Math.random() * 15;
      if (posture === "sleeping") {
        // Extend the current sleep so its pose and breathing cycle never restart.
        this.sleepingTime += duration;
      } else {
        this.stopSitting();
        this.sleepPhase = posture === "sitting" ? "sitToSleep" : "lyingDown";
        this.phaseStartedAt = this.elapsedTime;
        this.sleepingTime = duration;
      }
      return;
    }
    this.target = this.randomTarget(80, 250);
    if (posture === "sleeping") {
      this.sleepPhase = "wakingUp";
      this.phaseStartedAt = this.elapsedTime;
    } else if (posture === "sitting") {
      this.standUp();
    }
  }

  finishTreat(id: string, rewarded: boolean): void {
    if (this.treat?.id !== id || this.treat.phase !== "rewarding") return;
    if (rewarded) {
      this.treat.phase = "happy";
      this.treatStartedAt = this.elapsedTime;
    } else {
      this.treat = null;
      this.remainingTime = this.idleTime();
    }
  }

  private updateTail(deltaTime: number): void {
    if (this.tailWagTime !== null) {
      this.tailWagTime += deltaTime;
      if (this.tailWagTime >= this.tailWagDuration) {
        this.tailWagTime = null;
        this.tailCheckTime = this.tailWaitTime();
      }
      return;
    }

    this.tailCheckTime -= deltaTime;
    if (this.tailCheckTime > 0) return;
    if (Math.random() < 0.35) {
      this.tailWagTime = 0;
      this.tailWagDuration = (2 + Math.floor(Math.random() * 3)) * SIT_TAIL_CYCLE_SECONDS;
    } else {
      this.tailCheckTime = this.tailWaitTime();
    }
  }

  private stopSitting(): void {
    this.sittingTime = 0;
    this.tailCheckTime = 0;
    this.tailWagTime = null;
    this.tailWagDuration = 0;
  }

  private standUp(): void {
    this.stopSitting();
    this.standingStartedAt = this.elapsedTime;
  }

  private wakeForMovement(): void {
    const elapsed = this.elapsedTime - this.phaseStartedAt;
    const frame = Math.floor(elapsed / (this.sleepPhase === "sleepToSit" ? WAKE_UP_SECONDS / 7
      : this.sleepPhase === "fallingAsleep" ? FALL_ASLEEP_SECONDS / 3 : LIE_DOWN_SECONDS / 4) + 1e-6);
    const standFrame = this.sleepPhase === "sitToSleep" && frame < 2 ? frame
      : this.sleepPhase === "sleepToSit" && frame >= 5 ? 6 - Math.min(6, frame) : null;
    if (standFrame !== null) {
      this.sleepPhase = null;
      this.stopSitting();
      this.standingStartedAt = this.elapsedTime - standFrame * STAND_UP_SECONDS / 4;
      return;
    }
    const wakeFrame = this.sleepPhase === "lyingDown" ? 6 - Math.min(3, frame)
      : this.sleepPhase === "fallingAsleep" ? 2 - Math.min(2, frame)
      : this.sleepPhase === "sitToSleep" ? 6 - Math.min(3, frame)
      : this.sleepPhase === "sleepToSit" ? Math.min(4, frame) : 0;
    this.stopSitting();
    this.sleepPhase = "wakingUp";
    this.phaseStartedAt = this.elapsedTime - wakeFrame * WAKE_UP_SECONDS / 7;
  }

  private stopSleeping(): void {
    if (!this.sleepPhase) return;
    this.sleepPhase = null;
    if (!this.target) this.remainingTime = this.idleTime();
  }

  private tailWaitTime(): number {
    return 4 + Math.random() * 3;
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
    return 3 + Math.random() * 7;
  }
}
