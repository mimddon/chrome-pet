import { Pet } from "../pets/Pet";
import type { TreatState } from "../../shared/worldTypes";

export class TreatSystem {
  private placement: HTMLDivElement | null = null;
  private snack: HTMLDivElement | null = null;
  private reaction: HTMLDivElement | null = null;
  private snackAnimation: Animation | null = null;
  private reactionAnimation: Animation | null = null;
  private state: TreatState | null = null;
  private destroyed = false;

  constructor(
    private readonly pet: Pet,
    private readonly container: HTMLElement,
    private readonly place: (x: number, y: number) => void,
    private readonly onPlacementChanged: () => void,
  ) {}

  get isPlacing(): boolean {
    return this.placement !== null;
  }

  get hasTreat(): boolean {
    return this.state !== null;
  }

  startPlacement(): void {
    if (this.destroyed || this.isPlacing || this.hasTreat) return;

    // 페이지 위에 선택 영역을 두되 펫과 우클릭 메뉴는 그 위에서 조작할 수 있다.
    const overlay = document.createElement("div");
    this.placement = overlay;
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "auto",
      cursor: `url("${chrome.runtime.getURL("assets/treats/kibble.svg")}") 16 16, crosshair`,
      touchAction: "none",
      zIndex: "0",
    });
    const hint = document.createElement("div");
    hint.textContent = "간식을 놓을 곳을 클릭하세요 · Esc로 취소";
    hint.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 16px;border-radius:10px;background:#252837;color:#fff;font:13px/1.5 system-ui,sans-serif;pointer-events:none;white-space:nowrap;";
    overlay.append(hint);
    overlay.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    overlay.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    overlay.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.button !== 0 || !this.isPlacing) return;
      const size = this.pet.config.size;
      const x = Math.max(0, Math.min(1, (event.clientX - size / 2) / Math.max(1, window.innerWidth - size)));
      const y = Math.max(0, Math.min(1, (event.clientY - size / 2) / Math.max(1, window.innerHeight - size)));
      this.cancelPlacement();
      this.place(x, y);
    });
    this.container.append(overlay);
    document.addEventListener("keydown", this.onKeyDown, true);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("blur", this.onBlur);
    this.onPlacementChanged();
  }

  cancelPlacement(): void {
    if (!this.placement) return;
    this.placement.remove();
    this.placement = null;
    document.removeEventListener("keydown", this.onKeyDown, true);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("blur", this.onBlur);
    this.onPlacementChanged();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    this.cancelPlacement();
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.cancelPlacement();
  };

  private readonly onBlur = (): void => {
    this.cancelPlacement();
  };

  sync(state: TreatState | null): void {
    if (this.destroyed) return;
    const changed = this.state?.id !== state?.id || this.state?.phase !== state?.phase;
    this.state = state;
    if (state) this.cancelPlacement();
    if (!state) {
      this.removeSnack();
      this.removeReaction();
      return;
    }

    const size = this.pet.config.size;
    const x = state.x * Math.max(0, window.innerWidth - size) + size / 2;
    const y = state.y * Math.max(0, window.innerHeight - size) + size / 2;
    if (state.phase === "approaching" || state.phase === "eating") {
      if (!this.snack || changed) {
        this.removeSnack();
        this.snack = this.createSnack();
      }
      this.snack.style.left = `${x}px`;
      this.snack.style.top = `${y}px`;
      if (state.phase === "eating") {
        if (!this.snackAnimation) {
          this.snackAnimation = this.snack.animate([
            { transform: "translate(-50%, -50%) scale(1) rotate(-8deg)" },
            { transform: "translate(-50%, -50%) scale(.8) rotate(8deg)" },
            { transform: "translate(-50%, -50%) scale(1) rotate(-8deg)" },
          ], { duration: 250, iterations: Infinity, easing: "ease-in-out" });
        }
        this.snackAnimation.currentTime = state.elapsedTime * 1000;
      }
    } else {
      this.removeSnack();
    }

    if (state.phase === "happy") {
      if (changed) {
        this.removeReaction();
        this.reaction = document.createElement("div");
        this.reaction.textContent = "♡ +3";
        this.reaction.style.cssText = "position:fixed;transform:translate(-50%,0);font:bold 18px/1.5 system-ui,sans-serif;color:#ff7aab;text-shadow:0 2px 5px rgba(0,0,0,.5);white-space:nowrap;pointer-events:none;user-select:none;z-index:2147483647;";
        this.container.append(this.reaction);
        this.reactionAnimation = this.reaction.animate([
          { opacity: 1, transform: "translate(-50%,0) scale(.8)" },
          { opacity: 1, transform: "translate(-50%,-15px) scale(1.2)", offset: 0.3 },
          { opacity: 0, transform: "translate(-50%,-50px) scale(1)" },
        ], { duration: 1100, easing: "ease-out", fill: "forwards" });
      }
      if (this.reaction) {
        const position = this.pet.getPosition();
        this.reaction.style.left = `${position.x + size / 2}px`;
        this.reaction.style.top = `${position.y - 10}px`;
      }
      if (this.reactionAnimation) this.reactionAnimation.currentTime = state.elapsedTime * 1000;
    } else {
      this.removeReaction();
    }
  }

  private createSnack(): HTMLDivElement {
    const snack = document.createElement("div");
    snack.setAttribute("role", "img");
    snack.setAttribute("aria-label", "간식");
    snack.style.cssText = "position:fixed;width:32px;height:32px;transform:translate(-50%,-50%);pointer-events:none;user-select:none;z-index:2147483647;filter:drop-shadow(0 2px 3px rgba(0,0,0,.25));";
    const image = document.createElement("img");
    image.src = chrome.runtime.getURL("assets/treats/kibble.svg");
    image.alt = "";
    image.draggable = false;
    image.setAttribute("aria-hidden", "true");
    image.style.cssText = "display:block;width:32px;height:32px;pointer-events:none;user-select:none;";
    snack.append(image);
    this.container.append(snack);
    return snack;
  }

  private removeSnack(): void {
    this.snackAnimation?.cancel();
    this.snackAnimation = null;
    this.snack?.remove();
    this.snack = null;
  }

  private removeReaction(): void {
    this.reactionAnimation?.cancel();
    this.reactionAnimation = null;
    this.reaction?.remove();
    this.reaction = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.cancelPlacement();
    this.removeSnack();
    this.removeReaction();
    this.state = null;
  }
}
