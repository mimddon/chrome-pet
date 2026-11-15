
import { Pet } from "../pets/Pet";
import { BehaviorSystem } from "./BehaviorSystem";

export class ButterflySystem {
  private butterfly: HTMLDivElement | null = null;
  private flyingAnimation: Animation | null = null;

  constructor(
    private readonly pet: Pet,
    private readonly behavior: BehaviorSystem,
    private readonly container: HTMLElement,
  ) {}

  // 펫 근처에 나비 소환
  spawn(): void {
    // 이미 나비가 있으면 중복 소환하지 않음
    if (this.butterfly) return;

    const position = this.pet.getPosition();
    const petSize = this.pet.config.size;

    const minDistance = 100;
    const maxDistance = 250;

    const distance =
      minDistance +
      Math.random() * (maxDistance - minDistance);

    const maxPetX = Math.max(
      0,
      window.innerWidth - petSize,
    );

    // 좌우 중 이동 가능한 공간을 우선 선택
    const canGoLeft = position.x >= minDistance;
    const canGoRight =
      maxPetX - position.x >= minDistance;

    let direction: number;

    if (canGoLeft && canGoRight) {
      direction = Math.random() < 0.5 ? -1 : 1;
    } else if (canGoRight) {
      direction = 1;
    } else if (canGoLeft) {
      direction = -1;
    } else {
      direction = maxPetX - position.x >= position.x
        ? 1
        : -1;
    }

    const targetX = Math.max(
      0,
      Math.min(
        position.x + direction * distance,
        maxPetX,
      ),
    );

    // 나비는 펫이 도착할 위치의 위쪽에 표시
    const butterflyX = Math.max(
      0,
      Math.min(
        targetX + petSize / 2 - 16,
        window.innerWidth - 32,
      ),
    );

    const butterflyY = Math.max(
      0,
      Math.min(
        position.y - 45,
        window.innerHeight - 40,
      ),
    );

    const butterfly = document.createElement("div");
    butterfly.textContent = "🦋";

    Object.assign(butterfly.style, {
      position: "fixed",
      left: `${butterflyX}px`,
      top: `${butterflyY}px`,
      width: "32px",
      height: "32px",
      lineHeight: "32px",
      fontSize: "28px",
      textAlign: "center",
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "2147483647",
      transformOrigin: "center center",
      filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.2))",
    });

    this.container.appendChild(butterfly);
    this.butterfly = butterfly;

    // 나비가 위아래로 떠다니는 효과
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

    console.log("[Chrome Pet] 나비 등장");

    // 기존 이동을 중단하고 나비에게 접근
    this.behavior.chase(targetX, () => {
      this.catchButterfly();
    });
  }

  // 펫이 나비 위치에 도착
  private catchButterfly(): void {
    if (!this.butterfly) return;

    console.log("[Chrome Pet] 나비에게 도착!");

    this.removeButterfly();

    // 추후 여기에서 경험치 증가,
    // 점프 모션, 나비 잡기 성공 이펙트 등을 연결
  }

  private removeButterfly(): void {
    this.flyingAnimation?.cancel();
    this.flyingAnimation = null;

    this.butterfly?.remove();
    this.butterfly = null;
  }

  // 시스템 종료
  destroy(): void {
    this.behavior.cancelChase();
    this.removeButterfly();
  }
}
