
import type { PetAnimation, PetState } from "../../shared/petTypes";
import { getPetImageUrl } from "../../shared/petConfig";
import {
  FALL_ASLEEP_SECONDS,
  LIE_DOWN_SECONDS,
  SIT_TAIL_CYCLE_SECONDS,
  STAND_UP_SECONDS,
  WAKE_UP_SECONDS,
} from "../../shared/worldTypes";
import type { Pet } from "./Pet";
import type { PetRenderer } from "./PetRenderer";

interface AnimationDefinition {
  frames: string[];
  frameDuration: number;
  loop: boolean;
}

export class PetAnimator {
  private currentAnimation: PetAnimation = "idle";
  private currentFrame = 0;
  private elapsedTime = 0;
  private readonly tailFrames: string[];

  private readonly animations: Record<
    PetAnimation,
    AnimationDefinition
  >;

  constructor(
    private readonly pet: Pet,
    private readonly renderer: PetRenderer,
  ) {
    const config = pet.config;
    const walkFrames = [1, 2, 3, 4].map((frame) =>
      chrome.runtime.getURL(`assets/pets/${config.species}/${config.skin}/walk-${frame}.png`),
    );
    const sitFrames = [1, 2, 3, 4].map((frame) =>
      chrome.runtime.getURL(`assets/pets/${config.species}/${config.skin}/sit-${frame}.png`),
    );
    const lieFrames = [1, 2, 3, 4].map((frame) =>
      chrome.runtime.getURL(`assets/pets/${config.species}/${config.skin}/lie-${frame}.png`),
    );
    const dozeFrames = [1, 2, 3].map((frame) =>
      chrome.runtime.getURL(`assets/pets/${config.species}/${config.skin}/doze-${frame}.png`),
    );
    const wakeFrames = [...dozeFrames].reverse().concat([...lieFrames].reverse());
    this.tailFrames = ["sit-4", "sit-tail-left", "sit-4", "sit-tail-right", "sit-4"].map((frame) =>
      chrome.runtime.getURL(`assets/pets/${config.species}/${config.skin}/${frame}.png`),
    );

    this.animations = {
      idle: {
        frames: [getPetImageUrl(config, "idle")],
        frameDuration: 300,
        loop: true,
      },
      walk: {
        frames: walkFrames,
        frameDuration: 200,
        loop: true,
      },
      sit: {
        frames: sitFrames,
        frameDuration: 200,
        loop: false,
      },
      stand: {
        frames: [...sitFrames].reverse(),
        frameDuration: STAND_UP_SECONDS * 1000 / sitFrames.length,
        loop: false,
      },
      jump: {
        frames: [getPetImageUrl(config, "idle")],
        frameDuration: 150,
        loop: false,
      },
      lie: {
        frames: lieFrames,
        frameDuration: LIE_DOWN_SECONDS * 1000 / lieFrames.length,
        loop: false,
      },
      doze: {
        frames: dozeFrames,
        frameDuration: FALL_ASLEEP_SECONDS * 1000 / dozeFrames.length,
        loop: false,
      },
      sleep: {
        frames: [getPetImageUrl(config, "sleep")],
        frameDuration: 500,
        loop: true,
      },
      wake: {
        frames: wakeFrames,
        frameDuration: WAKE_UP_SECONDS * 1000 / wakeFrames.length,
        loop: false,
      },
      sleepToSit: {
        frames: [...dozeFrames].reverse().concat(lieFrames[3]!, lieFrames[2]!, sitFrames[2]!, sitFrames[3]!),
        frameDuration: WAKE_UP_SECONDS * 1000 / 7,
        loop: false,
      },
      sitToSleep: {
        frames: [sitFrames[3]!, sitFrames[2]!, lieFrames[2]!, lieFrames[3]!],
        frameDuration: LIE_DOWN_SECONDS * 1000 / 4,
        loop: false,
      },
      pet: {
        frames: [getPetImageUrl(config, "idle")],
        frameDuration: 200,
        loop: false,
      },
    };

    this.renderer.setImage(this.getCurrentFrameUrl());
  }

  // 펫의 행동 상태를 애니메이션 종류로 변환
  private getAnimationForState(state: PetState): PetAnimation {
    switch (state) {
      case "walking":
        return "walk";
      case "sitting":
        return "sit";
      case "standingUp":
        return "stand";
      case "jumping":
        return "jump";
      case "lyingDown":
        return "lie";
      case "fallingAsleep":
        return "doze";
      case "sleeping":
        return "sleep";
      case "wakingUp":
        return "wake";
      case "sleepToSit":
        return "sleepToSit";
      case "sitToSleep":
        return "sitToSleep";
      case "idle":
      default:
        return "idle";
    }
  }

  // 매 프레임 실행 (deltaTime: 초)
  update(deltaTime: number): void {
    const nextAnimation = this.getAnimationForState(
      this.pet.getState(),
    );

    if (nextAnimation !== this.currentAnimation) {
      this.play(nextAnimation);
    }

    const animation = this.animations[this.currentAnimation];

    this.elapsedTime += Math.max(0, deltaTime) * 1000;

    if (animation.frames.length > 1) {
      while (this.elapsedTime >= animation.frameDuration) {
        this.elapsedTime -= animation.frameDuration;

        if (this.currentFrame < animation.frames.length - 1) {
          this.currentFrame++;
        } else if (animation.loop) {
          this.currentFrame = 0;
        } else {
          this.elapsedTime = 0;
          break;
        }
      }
    }

    this.renderer.setImage(this.getCurrentFrameUrl());
  }

  // 새로 열린 탭도 공유 월드의 같은 애니메이션 프레임부터 표시한다.
  sync(elapsedTime: number, tailWagTime: number | null = null): void {
    const nextAnimation = this.getAnimationForState(this.pet.getState());
    if (nextAnimation !== this.currentAnimation) this.play(nextAnimation);
    const animation = this.animations[this.currentAnimation];
    // Timestamp subtraction can land just before an exact frame boundary.
    const frame = Math.floor(Math.max(0, elapsedTime) * 1000 / animation.frameDuration + 1e-6);
    this.currentFrame = animation.loop
      ? frame % animation.frames.length
      : Math.min(frame, animation.frames.length - 1);
    if (this.currentAnimation === "sit" && this.currentFrame === animation.frames.length - 1 &&
      tailWagTime !== null && Number.isFinite(tailWagTime)) {
      const tailFrame = Math.floor(Math.max(0, tailWagTime) / SIT_TAIL_CYCLE_SECONDS * this.tailFrames.length);
      this.renderer.setImage(this.tailFrames[tailFrame % this.tailFrames.length]!);
    } else {
      this.renderer.setImage(this.getCurrentFrameUrl());
    }
  }

  // 특정 애니메이션 재생
  play(animation: PetAnimation): void {
    if (this.currentAnimation === animation) return;

    this.currentAnimation = animation;
    this.currentFrame = 0;
    this.elapsedTime = 0;

    this.renderer.setImage(this.getCurrentFrameUrl());
  }

  // 애니메이션 프레임 등록
  setFrames(
    animation: PetAnimation,
    frames: string[],
    frameDuration: number,
    loop = true,
  ): void {
    if (frames.length === 0 || frameDuration <= 0) return;

    this.animations[animation] = {
      frames: [...frames],
      frameDuration,
      loop,
    };

    if (this.currentAnimation === animation) {
      this.currentFrame = 0;
      this.elapsedTime = 0;
      this.renderer.setImage(this.getCurrentFrameUrl());
    }
  }

  private getCurrentFrameUrl(): string {
    const animation = this.animations[this.currentAnimation];
    return animation.frames[this.currentFrame] ?? animation.frames[0]!;
  }
}
