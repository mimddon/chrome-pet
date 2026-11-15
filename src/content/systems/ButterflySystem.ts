
import { Pet } from "../pets/Pet";
import { BehaviorSystem } from "./BehaviorSystem";

export class ButterflySystem {
  private butterfly: HTMLDivElement | null = null;
  private flyingAnimation: Animation | null = null;

  private readonly butterflySize = 32;
  private readonly minDistance = 100;
  private readonly maxDistance = 250;

  // 성공 이펙트 중 중복 소환 방지
  private catching = false;
  private destroyed = false;

  private readonly effects = new Set<HTMLElement>();

  constructor(
    private readonly pet: Pet,
    private readonly behavior: BehaviorSystem,
    private readonly container: HTMLElement,
  ) {}

  // 나비 생성
  spawn(): void {
    if (this.butterfly || this.catching || this.destroyed) {
      return;
    }

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

    // 나비 생성 방향 및 거리
    const angle = Math.random() * Math.PI * 2;

    const distance =
      this.minDistance +
      Math.random() *
        (this.maxDistance - this.minDistance);

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

    // 나비가 둥둥 떠다니는 효과
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

    // 나비 위치로 이동
    this.behavior.chase(
      targetX,
      targetY,
      () => this.catchButterfly(),
    );
  }

  // 나비 잡기 성공
  private catchButterfly(): void {
    if (!this.butterfly || this.catching || this.destroyed) {
      return;
    }

    this.catching = true;

    const butterfly = this.butterfly;

    // 기존 날갯짓 애니메이션 종료
    this.flyingAnimation?.cancel();
    this.flyingAnimation = null;

    const rect = butterfly.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 나비가 작아지면서 사라지는 효과
    const vanish = butterfly.animate(
      [
        {
          opacity: 1,
          transform: "scale(1) rotate(0deg)",
        },
        {
          opacity: 0,
          transform: "scale(0.2) rotate(180deg)",
        },
      ],
      {
        duration: 350,
        easing: "ease-in",
        fill: "forwards",
      },
    );

    // 별 이펙트
    this.showSparkles(centerX, centerY);

    // Catch! 메시지
    this.showSuccessMessage(centerX, centerY - 30);

    console.log("[Chrome Pet] Catch!");

    void vanish.finished
      .catch(() => undefined)
      .then(() => {
        if (this.destroyed) return;

        this.removeButterfly();
        this.catching = false;
      });
  }

  // 반짝이는 별 이펙트
  private showSparkles(
    centerX: number,
    centerY: number,
  ): void {
    const sparkleCount = 8;

    for (let i = 0; i < sparkleCount; i++) {
      const angle =
        (Math.PI * 2 * i) / sparkleCount;

      const distance = 35 + Math.random() * 25;

      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const sparkle = document.createElement("div");

      sparkle.textContent = i % 2 === 0 ? "✦" : "✧";

      Object.assign(sparkle.style, {
        position: "fixed",
        left: `${centerX}px`,
        top: `${centerY}px`,
        color: i % 2 === 0 ? "#ffe17b" : "#ffffff",
        fontSize: `${14 + Math.random() * 10}px`,
        fontWeight: "bold",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: "2147483647",
      });

      this.container.appendChild(sparkle);
      this.effects.add(sparkle);

      const animation = sparkle.animate(
        [
          {
            opacity: 1,
            transform: "translate(-50%, -50%) scale(0.5)",
          },
          {
            opacity: 1,
            transform:
              `translate(calc(-50% + ${dx * 0.6}px), ` +
              `calc(-50% + ${dy * 0.6}px)) scale(1.2)`,
            offset: 0.5,
          },
          {
            opacity: 0,
            transform:
              `translate(calc(-50% + ${dx}px), ` +
              `calc(-50% + ${dy}px)) scale(0.3)`,
          },
        ],
        {
          duration: 700,
          easing: "ease-out",
          fill: "forwards",
        },
      );

      void animation.finished
        .catch(() => undefined)
        .then(() => {
          sparkle.remove();
          this.effects.delete(sparkle);
        });
    }
  }

  // Catch! 성공 메시지
  private showSuccessMessage(
    x: number,
    y: number,
  ): void {
    const message = document.createElement("div");

    message.textContent = "Catch!";

    Object.assign(message.style, {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      transform: "translateX(-50%)",
      color: "#ffda70",
      fontSize: "20px",
      fontWeight: "900",
      letterSpacing: "1px",
      fontFamily: "sans-serif",
      textShadow:
        "0 2px 6px rgba(0,0,0,0.65)",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "2147483647",
    });

    this.container.appendChild(message);
    this.effects.add(message);

    const animation = message.animate(
      [
        {
          opacity: 0,
          transform: "translate(-50%, 8px) scale(0.8)",
        },
        {
          opacity: 1,
          transform: "translate(-50%, -12px) scale(1.1)",
          offset: 0.25,
        },
        {
          opacity: 1,
          transform: "translate(-50%, -25px) scale(1)",
          offset: 0.65,
        },
        {
          opacity: 0,
          transform: "translate(-50%, -55px) scale(0.9)",
        },
      ],
      {
        duration: 1300,
        easing: "ease-out",
        fill: "forwards",
      },
    );

    void animation.finished
      .catch(() => undefined)
      .then(() => {
        message.remove();
        this.effects.delete(message);
      });
  }

  // 나비 제거
  private removeButterfly(): void {
    this.flyingAnimation?.cancel();
    this.flyingAnimation = null;

    this.butterfly?.remove();
    this.butterfly = null;
  }

  // 펫 제거 시 정리
  destroy(): void {
    this.destroyed = true;

    this.behavior.cancelChase();
    this.removeButterfly();

    for (const effect of this.effects) {
      effect.remove();
    }

    this.effects.clear();
  }
}
