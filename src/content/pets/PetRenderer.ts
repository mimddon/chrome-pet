
import { Pet } from "./Pet";
import { getPetImageUrl } from "../../shared/petConfig";

export class PetRenderer {
  private readonly element: HTMLImageElement;

  constructor(
    private readonly pet: Pet,
    container: HTMLElement,
  ) {
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
      pointerEvents: "none",
      userSelect: "none",
      zIndex: "2147483647",
      left: "0",
      top: "0",
      transformOrigin: "center center",
      willChange: "transform",
    });

    container.appendChild(this.element);

    this.render();
  }

  // 펫 위치와 방향을 실제 화면에 반영
  render(): void {
    const { x, y } = this.pet.getPosition();

    // 기본 이미지는 오른쪽을 바라본다고 가정
    const flipX = this.pet.getDirection() === "left" ? -1 : 1;

    this.element.style.transform =
      `translate3d(${x}px, ${y}px, 0) scaleX(${flipX})`;
  }

  // 애니메이션 시스템에서 이미지 교체 시 사용
  setImage(url: string): void {
    if (this.element.src !== url) {
      this.element.src = url;
    }
  }

  // 펫 제거
  destroy(): void {
    this.element.remove();
  }
}
