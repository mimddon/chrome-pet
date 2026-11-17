
import type { PetAnimation, PetState } from "../../shared/petTypes";
import { getPetImageUrl } from "../../shared/petConfig";
import { Pet } from "./Pet";
import { PetRenderer } from "./PetRenderer";

interface AnimationDefinition {
  frames: string[];
  frameDuration: number;
  loop: boolean;
}

export class PetAnimator {
  private currentAnimation: PetAnimation = "idle";
  private currentFrame = 0;
  private elapsedTime = 0;

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
        frames: [getPetImageUrl(config, "idle")],
        frameDuration: 300,
        loop: false,
      },
      jump: {
        frames: [getPetImageUrl(config, "idle")],
        frameDuration: 150,
        loop: false,
      },
      sleep: {
        frames: [getPetImageUrl(config, "idle")],
        frameDuration: 500,
        loop: true,
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
      case "jumping":
        return "jump";
      case "sleeping":
        return "sleep";
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
  sync(elapsedTime: number): void {
    const nextAnimation = this.getAnimationForState(this.pet.getState());
    if (nextAnimation !== this.currentAnimation) this.play(nextAnimation);
    const animation = this.animations[this.currentAnimation];
    const frame = Math.floor(Math.max(0, elapsedTime) * 1000 / animation.frameDuration);
    this.currentFrame = animation.loop
      ? frame % animation.frames.length
      : Math.min(frame, animation.frames.length - 1);
    this.renderer.setImage(this.getCurrentFrameUrl());
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
