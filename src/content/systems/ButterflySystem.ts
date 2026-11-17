
import { Pet } from "../pets/Pet";
import type { ButterflyState } from "../../shared/worldTypes";

export class ButterflySystem {
  private butterfly: HTMLDivElement | null = null;
  private flyingAnimation: Animation | null = null;

  private readonly butterflySize = 32;
  private butterflyId: string | null = null;
  private lastCaughtId: string | null = null;

  // 성공 이펙트 중 중복 소환 방지
  private catching = false;
  private destroyed = false;

  private readonly effects = new Set<HTMLElement>();

  constructor(
    private readonly pet: Pet,
    private readonly container: HTMLElement,
  ) {}

  // 위치와 잡기 판정은 공유 월드에서 받고 여기서는 연출만 재생한다.
  sync(state: ButterflyState | null): void {
    if (this.destroyed) return;
    if (!state) {
      this.removeButterfly();
      this.catching = false;
      return;
    }
    if (state.id === this.lastCaughtId) return;
    const petSize = this.pet.config.size;
    const x = state.x * Math.max(0, window.innerWidth - petSize);
    const y = state.y * Math.max(0, window.innerHeight - petSize);
    if (this.butterflyId !== state.id) {
      this.removeButterfly();
      this.catching = false;
      this.butterflyId = state.id;
      this.createButterfly();
    }
    if (this.butterfly) {
      this.butterfly.style.left = `${Math.max(0, Math.min(x + petSize / 2 - this.butterflySize / 2, window.innerWidth - this.butterflySize))}px`;
      this.butterfly.style.top = `${Math.max(0, Math.min(y + petSize / 2 - this.butterflySize / 2, window.innerHeight - this.butterflySize))}px`;
    }
    if (state.phase === "caught") {
      this.lastCaughtId = state.id;
      this.catchButterfly(state.elapsedTime * 1000);
    } else if (this.flyingAnimation) {
      this.flyingAnimation.currentTime = state.elapsedTime * 1000;
    }
  }

  private createButterfly(): void {
    const butterfly = document.createElement("div");
    butterfly.textContent = "🦋";

    Object.assign(butterfly.style, {
      position: "fixed",
      left: "0",
      top: "0",
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

  }

  // 나비 잡기 성공
  private catchButterfly(elapsedTime: number): void {
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
    vanish.currentTime = Math.min(350, elapsedTime);

    // 별 이펙트
    this.showSparkles(centerX, centerY, elapsedTime);

    // Catch! 메시지
    this.showSuccessMessage(centerX, centerY - 30, elapsedTime);

    console.log("[Chrome Pet] Catch!");

    void vanish.finished
      .catch(() => undefined)
      .then(() => {
        if (this.destroyed || this.butterfly !== butterfly) return;

        this.removeButterfly();
        this.catching = false;
      });
  }

  // 반짝이는 별 이펙트
  private showSparkles(
    centerX: number,
    centerY: number,
    elapsedTime: number,
  ): void {
    const sparkleCount = 8;

    for (let i = 0; i < sparkleCount; i++) {
      const angle =
        (Math.PI * 2 * i) / sparkleCount;

      const distance = 35 + (i * 17) % 25;

      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const sparkle = document.createElement("div");

      sparkle.textContent = i % 2 === 0 ? "✦" : "✧";

      Object.assign(sparkle.style, {
        position: "fixed",
        left: `${centerX}px`,
        top: `${centerY}px`,
        color: i % 2 === 0 ? "#ffe17b" : "#ffffff",
        fontSize: `${14 + (i * 7) % 10}px`,
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
      animation.currentTime = elapsedTime;

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
    elapsedTime: number,
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
    animation.currentTime = elapsedTime;

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

    this.butterfly?.getAnimations().forEach((animation) => animation.cancel());
    this.butterfly?.remove();
    this.butterfly = null;
    this.butterflyId = null;
  }

  cancel(): void {
    this.removeButterfly();
    this.catching = false;

    for (const effect of this.effects) {
      effect.getAnimations().forEach((animation) => animation.cancel());
      effect.remove();
    }

    this.effects.clear();
  }

  // 펫 제거 시 정리
  destroy(): void {
    this.destroyed = true;
    this.cancel();
  }
}
