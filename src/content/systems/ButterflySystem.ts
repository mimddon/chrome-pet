
import { Pet } from "../pets/Pet";
import { BehaviorSystem } from "./BehaviorSystem";

export class ButterflySystem {
  private butterfly: HTMLDivElement | null = null;
  private flyingAnimation: Animation | null = null;

  private readonly butterflySize = 32;
  private readonly minDistance = 100;
  private readonly maxDistance = 250;

  constructor(
    private readonly pet: Pet,
    private readonly behavior: BehaviorSystem,
    private readonly container: HTMLElement,
  ) {}

  spawn(): void {
    // 중복 소환 방지
    if (this.butterfly) return;

    const position = this.pet.getPosition();
    const petSize = this.pet.config.size;

    const maxPetX = Math.max(
      0,
      window.innerWidth - petSize,
    );

    const maxPetY = Math.max(
      0,
      window.innerHeight - petSize,
    );

    // 랜덤 각도와 거리 계산
    const angle = Math.random() * Math.PI * 2;

    const distance =
      this.minDistance +
      Math.random() *
        (this.maxDistance - this.minDistance);

    // 펫이 이동할 목표 좌표
    const targetX = Math.max(
      0,
      Math.min(
        position.x + Math.cos(angle) * distance,
        maxPetX,
      ),
    );

    const targetY = Math.max(
      0,
      Math.min(
        position.y + Math.sin(angle) * distance,
        maxPetY,
      ),
    );

    // 나비를 목표 위치의 펫 중심 부근에 배치
    const butterflyX = Math.max(
      0,
      Math.min(
        targetX + petSize / 2 - this.butterflySize / 2,
        window.innerWidth - this.butterflySize,
      ),
    );

    const butterflyY = Math.max(
      0,
      Math.min(
        targetY + petSize / 2 - this.butterflySize / 2,
        window.innerHeight - this.butterflySize,
      ),
    );

    const butterfly = document.createElement("div");
    butterfly.textContent = "🦋";

    Object.assign(butterfly.style, {
      position: "fixed",
      left: `${butterflyX}px`,
      top: `${butterflyY}px`,
      width: `${this.butterflySize}px`,
      height: `${this.butterflySize}px`,
      lineHeight: `${this.butterflySize}px`,
      fontSize: "28px",
      textAlign: "center",
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "2147483647",
      transformOrigin: "center center",
      filter:
        "drop-shadow(0 2px 3px rgba(0,0,0,0.2))",
    });

    this.container.appendChild(butterfly);
    this.butterfly = butterfly;

    // 위아래로 떠다니는 나비 효과
    this.flyingAnimation = butterfly.animate(
      [
        {
          transform: "translateY(0px) rotate(-8deg)",
        },
        {
          transform: "translateY(-12px) rotate(8deg)",
        },
        {
          transform: "translateY(0px) rotate(-8deg)",
        },
      ],
      {
        duration: 1100,
        iterations: Infinity,
        easing: "ease-in-out",
      },
    );

    // X, Y 좌표 모두 전달
    this.behavior.chase(
      targetX,
      targetY,
      () => this.catchButterfly(),
    );
  }

  private catchButterfly(): void {
    if (!this.butterfly) return;

    this.removeButterfly();
  }

  private removeButterfly(): void {
    this.flyingAnimation?.cancel();
    this.flyingAnimation = null;

    this.butterfly?.remove();
    this.butterfly = null;
  }

  destroy(): void {
    this.behavior.cancelChase();
    this.removeButterfly();
  }
}
