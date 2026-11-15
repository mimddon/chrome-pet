
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

    this.animations = {
      idle: {
        frames: [getPetImageUrl(config, "idle")],
        frameDuration: 300,
        loop: true,
      },
      walk: {
        // 걷기 이미지가 준비되기 전까지 idle 사용
        frames: [getPetImageUrl(config, "idle")],
        frameDuration: 150,
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
