import { Pet } from "./Pet";
import { getPetImageUrl } from "../../shared/petConfig";
import { getOwnedPet, increasePetAffection } from "../../storage/petStorage";
import { PetSettings } from "../ui/PetSettings";

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  grabbed: boolean;
  dragging: boolean;
};

export class PetRenderer {
  private readonly element: HTMLImageElement;
  private readonly container: HTMLElement;
  private readonly settings: PetSettings;

  private contextMenu: HTMLDivElement | null = null;
  private statusPanel: HTMLDivElement | null = null;
  private affectionText: HTMLParagraphElement | null = null;

  private lastPettingAt = 0;
  private pettingInProgress = false;
  private destroyed = false;
  private clickTimer: ReturnType<typeof setTimeout> | null = null;
  private grabTimer: ReturnType<typeof setTimeout> | null = null;
  private dragSession: DragSession | null = null;
  private suppressClick = false;
  private acceptedClicks = 0;

  // 오래된 애정도 조회 결과가 최신 값을 덮어쓰지 않도록 관리
  private affectionVersion = 0;

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    if (this.contextMenu && !this.contextMenu.contains(event.target as Node)) {
      this.closeContextMenu();
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.destroyed || this.dragSession || !event.isPrimary || event.button !== 0) {
      return;
    }

    this.element.setPointerCapture(event.pointerId);
    event.stopPropagation();

    const session: DragSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: 0,
      offsetY: 0,
      grabbed: false,
      dragging: false,
    };
    this.dragSession = session;
    this.suppressClick = false;
    this.grabTimer = setTimeout(() => {
      this.grabTimer = null;
      if (this.destroyed || this.dragSession !== session) return;

      // The pet keeps walking during the hold, so anchor to its position now.
      const position = this.pet.getPosition();
      session.grabbed = true;
      session.startX = session.pointerX;
      session.startY = session.pointerY;
      session.offsetX = session.pointerX - position.x;
      session.offsetY = session.pointerY - position.y;
      this.suppressClick = true;
      this.acceptedClicks = 0;
      this.clearClickTimer();
      this.closeContextMenu();
      this.element.style.cursor = "grabbing";
      this.interaction.onGrab();
    }, 300);

    window.addEventListener("blur", this.onWindowBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragSession?.pointerId) return;
    event.stopPropagation();

    if ((event.buttons & 1) === 0) {
      this.finishInteraction(true);
      return;
    }

    this.updateDragPosition(event);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragSession?.pointerId) return;
    event.stopPropagation();
    this.updateDragPosition(event);
    this.finishInteraction();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.dragSession?.pointerId) {
      this.finishInteraction(true);
    }
  };

  private readonly onWindowBlur = (): void => {
    this.finishInteraction(true);
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.finishInteraction(true);
  };

  constructor(
    private readonly pet: Pet,
    container: HTMLElement,
    private readonly interaction: {
      onGrab: () => void;
      onDragStart: () => void;
      onRelease: (dragged: boolean) => void;
    },
  ) {
    this.container = container;

    // 설정창 및 다시 뽑기 이벤트
    this.settings = new PetSettings(() => {
      this.element.dispatchEvent(
        new CustomEvent("chrome-pet:reroll", {
          bubbles: true,
          composed: true,
        }),
      );
    });

    // 펫 이미지 생성
    this.element = document.createElement("img");

    this.element.src = getPetImageUrl(pet.config, "idle");
    this.element.alt = `${pet.config.species} pet`;
    this.element.draggable = false;

    Object.assign(this.element.style, {
      position: "fixed",
      width: `${pet.config.size}px`,
      height: `${pet.config.size}px`,
      objectFit: "contain",
      imageRendering: "pixelated",
      pointerEvents: "auto",
      cursor: "grab",
      userSelect: "none",
      touchAction: "none",
      zIndex: "2147483647",
      left: "0",
      top: "0",
      transformOrigin: "center center",
      willChange: "transform",
    });

    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("pointermove", this.onPointerMove);
    this.element.addEventListener("pointerup", this.onPointerUp);
    this.element.addEventListener("pointercancel", this.onPointerCancel);
    this.element.addEventListener("lostpointercapture", this.onPointerCancel);

    // 좌클릭 → 쓰다듬기
    this.element.addEventListener("click", (event) => {
      event.stopPropagation();
      if (this.destroyed || (this.suppressClick && event.detail !== 0) || this.dragSession) {
        this.acceptedClicks = 0;
        event.preventDefault();
        return;
      }

      // Count only real clicks; the browser's click count can include a drag.
      if (event.detail <= 1) this.acceptedClicks = 0;
      this.acceptedClicks++;
      if (this.clickTimer !== null && this.acceptedClicks >= 2) {
        this.handleDoubleClick();
        return;
      }

      this.clearClickTimer();
      this.clickTimer = setTimeout(() => {
        this.clickTimer = null;
        void this.handlePetting();
      }, 250);
    });

    // Preserve the OS double-click window even if the 250ms petting timer expired.
    this.element.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.destroyed && !this.dragSession && !this.suppressClick && this.acceptedClicks >= 2) {
        this.handleDoubleClick();
      }
    });

    // 우클릭 → 메뉴 열기
    this.element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (this.destroyed || this.dragSession?.dragging) return;
      this.finishInteraction(true);
      this.showContextMenu(event.clientX, event.clientY);
    });

    container.appendChild(this.element);
    this.render();
  }

  private updateDragPosition(event: PointerEvent): void {
    const session = this.dragSession;
    if (!session) return;

    session.pointerX = event.clientX;
    session.pointerY = event.clientY;
    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
    if (!session.grabbed) {
      if (distance >= 5) {
        this.clearGrabTimer();
        this.suppressClick = true;
        this.acceptedClicks = 0;
        this.clearClickTimer();
      }
      return;
    }

    if (!session.dragging) {
      if (distance < 5) return;

      session.dragging = true;
      this.interaction.onDragStart();
    }

    const maxX = Math.max(0, window.innerWidth - this.pet.config.size);
    const maxY = Math.max(0, window.innerHeight - this.pet.config.size);
    this.pet.setPosition(
      Math.max(0, Math.min(event.clientX - session.offsetX, maxX)),
      Math.max(0, Math.min(event.clientY - session.offsetY, maxY)),
    );
  }

  private finishInteraction(cancelled = false): void {
    const session = this.dragSession;
    if (!session) return;

    this.clearGrabTimer();
    this.dragSession = null;
    if (cancelled) {
      this.suppressClick = true;
      this.acceptedClicks = 0;
      this.clearClickTimer();
    }

    window.removeEventListener("blur", this.onWindowBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    if (this.element.hasPointerCapture(session.pointerId)) {
      this.element.releasePointerCapture(session.pointerId);
    }

    this.element.style.cursor = "grab";
    if (session.grabbed) this.interaction.onRelease(session.dragging);
    this.render();
  }

  private clearGrabTimer(): void {
    if (this.grabTimer !== null) {
      clearTimeout(this.grabTimer);
      this.grabTimer = null;
    }
  }

  private clearClickTimer(): void {
    if (this.clickTimer !== null) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }
  }

  private handleDoubleClick(): void {
    this.clearClickTimer();
    this.acceptedClicks = 0;
    this.element.dispatchEvent(
      new CustomEvent("chrome-pet:butterfly", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ========================================
  // 펫 렌더링
  // ========================================

  render(): void {
    const { x, y } = this.pet.getPosition();

    const flipX = this.pet.getDirection() === "left" ? -1 : 1;

    this.element.style.transform = `translate3d(${x}px, ${y}px, 0) scaleX(${flipX})`;
  }

  setImage(url: string): void {
    if (this.element.src !== url) {
      this.element.src = url;
    }
  }

  private getPetName(): string {
    const { species, skin } = this.pet.config;

    const names: Record<string, string> = {
      "cat/basic": "기본 고양이",
      "cat/black": "검은 고양이",
      "cat/white": "흰 고양이",
      "dog/basic": "기본 강아지",
    };

    return names[`${species}/${skin}`] ?? `${species} / ${skin}`;
  }

  // ========================================
  // 쓰다듬기
  // ========================================

  private async handlePetting(): Promise<void> {
    if (this.destroyed || this.dragSession || this.pettingInProgress) {
      return;
    }

    const now = Date.now();

    // 0.7초 쿨타임
    if (now - this.lastPettingAt < 700) {
      return;
    }

    this.pettingInProgress = true;

    try {
      const affection = await increasePetAffection(1);

      if (this.destroyed) return;

      this.lastPettingAt = Date.now();

      // 최신 애정도 버전 증가
      this.affectionVersion++;

      // 상태창이 열려 있다면 즉시 갱신
      this.updateAffectionDisplay(affection);

      // 쓰다듬기 반응
      this.playPettingAnimation(affection);
      this.showPettingEffect(affection);
    } catch (error) {
      console.error("[Chrome Pet] 쓰다듬기 실패", error);
    } finally {
      this.pettingInProgress = false;
    }
  }

  // 상태창 애정도 실시간 갱신
  private updateAffectionDisplay(affection: number): void {
    if (!this.affectionText?.isConnected) {
      return;
    }

    this.affectionText.textContent = `💗 애정도 ${affection.toLocaleString()}`;
  }

  // 쓰다듬기 애니메이션
  private playPettingAnimation(affection: number): void {
    this.element.animate(
      [
        { filter: "brightness(1)" },
        { filter: "brightness(1.35)" },
        { filter: "brightness(1)" },
      ],
      {
        duration: affection >= 80 ? 550 : 350,
        easing: "ease-in-out",
      },
    );
  }

  // 쓰다듬기 이펙트
  private showPettingEffect(affection: number): void {
    const rect = this.element.getBoundingClientRect();

    const effect = document.createElement("div");
    effect.textContent = "♡ +1";

    Object.assign(effect.style, {
      position: "fixed",
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.top - 10}px`,
      transform: "translate(-50%, 0)",
      fontSize: affection >= 900 ? "20px" : "15px",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      color: "#ff7aab",
      textShadow: "0 2px 5px rgba(0,0,0,0.5)",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "2147483647",
    });

    this.container.appendChild(effect);

    effect.animate(
      [
        {
          opacity: 1,
          transform: "translate(-50%, 0)",
        },
        {
          opacity: 0,
          transform: "translate(-50%, -55px)",
        },
      ],
      {
        duration: 1000,
        easing: "ease-out",
        fill: "forwards",
      },
    );

    setTimeout(() => {
      effect.remove();
    }, 1000);
  }

  // ========================================
  // 우클릭 메뉴
  // ========================================

  private showContextMenu(x: number, y: number): void {
    this.closeContextMenu();

    const menu = document.createElement("div");
    this.contextMenu = menu;

    const menuWidth = 190;
    const menuHeight = 160;

    const left = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8));

    const top = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8));

    Object.assign(menu.style, {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${menuWidth}px`,
      padding: "8px",
      background: "#252837",
      border: "1px solid #414558",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      color: "#fff",
      fontFamily: "sans-serif",
      fontSize: "13px",
      zIndex: "2147483647",
      pointerEvents: "auto",
    });

    const items = [
      {
        label: "🐾 쓰다듬기",
        action: "pet",
      },
      {
        label: "📊 상태 확인",
        action: "status",
      },
      {
        label: "⚙️ 설정",
        action: "settings",
      },
    ] as const;

    for (const item of items) {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = item.label;

      Object.assign(button.style, {
        display: "block",
        width: "100%",
        padding: "10px",
        background: "transparent",
        border: "none",
        borderRadius: "6px",
        color: "#fff",
        textAlign: "left",
        cursor: "pointer",
        fontSize: "13px",
        fontFamily: "inherit",
      });

      button.addEventListener("mouseenter", () => {
        button.style.background = "#3c4054";
      });

      button.addEventListener("mouseleave", () => {
        button.style.background = "transparent";
      });

      button.addEventListener("click", () => {
        this.closeContextMenu();

        switch (item.action) {
          case "pet":
            void this.handlePetting();
            break;

          case "status":
            this.showStatusPanel();
            break;

          case "settings":
            this.settings.open();
            break;
        }
      });

      menu.appendChild(button);
    }

    this.container.appendChild(menu);

    document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
  }

  // ========================================
  // 상태 확인
  // ========================================

  private showStatusPanel(): void {
    // 기존 상태창 제거
    this.statusPanel?.remove();
    this.affectionText = null;

    const panel = document.createElement("div");
    this.statusPanel = panel;

    Object.assign(panel.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "300px",
      maxWidth: "calc(100vw - 32px)",
      padding: "20px",
      background: "#252837",
      border: "1px solid #414558",
      borderRadius: "16px",
      boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
      color: "#fff",
      fontFamily: "sans-serif",
      textAlign: "center",
      zIndex: "2147483647",
      pointerEvents: "auto",
    });

    // 제목
    const title = document.createElement("h2");
    title.textContent = "🐾 나의 펫";

    title.style.cssText = "margin:0 0 12px;font-size:18px;";

    // 펫 이미지
    const image = document.createElement("img");

    image.src = getPetImageUrl(this.pet.config, "idle");

    image.alt = this.getPetName();

    Object.assign(image.style, {
      display: "block",
      width: "128px",
      height: "128px",
      objectFit: "contain",
      imageRendering: "pixelated",
      margin: "0 auto",
    });

    // 펫 이름
    const name = document.createElement("h3");
    name.textContent = this.getPetName();

    name.style.cssText = "margin:8px 0;font-size:16px;";

    // 펫 정보
    const details = document.createElement("p");

    details.textContent =
      `종류: ${this.pet.config.species} · ` + `스킨: ${this.pet.config.skin}`;

    details.style.cssText = "font-size:12px;color:#b5b7c7;";

    // 애정도 표시
    const affectionText = document.createElement("p");
    affectionText.textContent = "💗 애정도 불러오는 중...";

    affectionText.style.cssText = `
      font-size:16px;
      font-weight:bold;
      color:#ff91b5;
      margin:16px 0;
    `;

    // 실시간 갱신 대상 등록
    this.affectionText = affectionText;

    // 준비 중인 기능
    const notice = document.createElement("p");

    notice.textContent = "레벨 · 경험치 기능 준비 중";

    notice.style.cssText = "font-size:12px;color:#b5b7c7;margin:12px 0;";

    // 닫기 버튼
    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.textContent = "닫기";

    Object.assign(closeButton.style, {
      width: "100%",
      padding: "10px",
      background: "#d99c62",
      color: "#241b17",
      border: "none",
      borderRadius: "8px",
      fontWeight: "bold",
      cursor: "pointer",
    });

    closeButton.addEventListener("click", () => {
      panel.remove();

      if (this.statusPanel === panel) {
        this.statusPanel = null;
        this.affectionText = null;
      }
    });

    panel.append(
      title,
      image,
      name,
      details,
      affectionText,
      notice,
      closeButton,
    );

    this.container.appendChild(panel);

    // 조회를 시작한 시점의 버전 저장
    const requestVersion = this.affectionVersion;

    // 현재 저장된 애정도 조회
    void getOwnedPet()
      .then((owned) => {
        if (
          !panel.isConnected ||
          this.destroyed ||
          this.statusPanel !== panel
        ) {
          return;
        }

        // 조회 도중 쓰다듬기가 발생했다면
        // 오래된 결과로 화면을 덮어쓰지 않음
        if (requestVersion !== this.affectionVersion) {
          return;
        }

        const affection = owned?.affection ?? 0;

        this.updateAffectionDisplay(affection);
      })
      .catch((error) => {
        console.error("[Chrome Pet] 애정도 조회 실패", error);

        if (
          panel.isConnected &&
          this.statusPanel === panel &&
          requestVersion === this.affectionVersion
        ) {
          affectionText.textContent = "애정도를 불러오지 못했습니다.";
        }
      });
  }

  // ========================================
  // 정리
  // ========================================

  private closeContextMenu(): void {
    document.removeEventListener(
      "pointerdown",
      this.onDocumentPointerDown,
      true,
    );

    this.contextMenu?.remove();
    this.contextMenu = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.finishInteraction(true);
    this.clearClickTimer();
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerCancel);
    this.element.removeEventListener("lostpointercapture", this.onPointerCancel);

    this.closeContextMenu();

    this.statusPanel?.remove();
    this.statusPanel = null;
    this.affectionText = null;

    this.settings.destroy();
    this.element.remove();
  }
}
