import type { PetFeature } from "../../shared/features";

export class PetSettings {
  private element: HTMLDivElement | null = null;

  constructor(
    private readonly rerollFeature: PetFeature,
    private readonly onConfirmReroll: () => void,
  ) {}

  open(confirmReroll = false): void {
    this.close();

    const overlay = document.createElement("div");
    this.element = overlay;

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0, 0.45)",
      fontFamily: "sans-serif",
      pointerEvents: "auto",
    });

    const panel = document.createElement("div");

    Object.assign(panel.style, {
      width: "320px",
      maxWidth: "calc(100vw - 32px)",
      padding: "20px",
      borderRadius: "16px",
      background: "#252837",
      color: "#fff",
      boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
    });

    const header = document.createElement("div");
    header.style.cssText = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:20px;
    `;

    const title = document.createElement("h2");
    title.textContent = "⚙️ 펫 설정";
    title.style.cssText = "margin:0;font-size:18px;";

    const closeButton = document.createElement("button");
    closeButton.textContent = "✕";
    closeButton.style.cssText = `
      border:0;
      background:transparent;
      color:#fff;
      cursor:pointer;
      font-size:18px;
    `;

    closeButton.addEventListener("click", () => this.close());

    header.append(title, closeButton);

    const section = document.createElement("div");
    section.style.cssText = `
      padding:14px;
      background:#303344;
      border-radius:12px;
    `;

    const sectionTitle = document.createElement("h3");
    sectionTitle.textContent = "펫 관리";
    sectionTitle.style.cssText = "margin:0 0 8px;font-size:14px;";

    const description = document.createElement("p");
    description.textContent = "새로운 랜덤 펫을 획득할 수 있어요.";
    description.style.cssText = `
      font-size:12px;
      color:#b5b7c7;
      margin:0 0 14px;
    `;

    section.append(sectionTitle, description);

    const rerollButton = document.createElement("button");
    rerollButton.textContent = `🎁 ${this.rerollFeature.label}`;

    Object.assign(rerollButton.style, {
      width: "100%",
      padding: "12px",
      border: "none",
      borderRadius: "10px",
      background: "#d99c62",
      color: "#241b17",
      fontWeight: "bold",
      cursor: "pointer",
    });

    rerollButton.addEventListener("click", () => {
      void Promise.resolve().then(this.rerollFeature.execute).catch((error) => {
        console.error("[Chrome Pet] 다시 뽑기 요청 실패", error);
      });
    });
    section.appendChild(rerollButton);

    panel.append(header, section);
    overlay.appendChild(panel);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        this.close();
      }
    });

    document.documentElement.appendChild(overlay);
    if (confirmReroll) this.showRerollConfirmation(panel);
  }

  confirmReroll(): void {
    this.open(true);
  }

  private showRerollConfirmation(panel: HTMLDivElement): void {
    panel.replaceChildren();

    const title = document.createElement("h2");
    title.textContent = `🎁 ${this.rerollFeature.label}`;
    title.style.cssText = `
      font-size:18px;
      text-align:center;
      margin:0 0 16px;
    `;

    const description = document.createElement("p");
    description.textContent =
      "새로운 펫을 뽑으시겠어요? 새 펫을 확정하면 기존 펫이 교체됩니다.";

    description.style.cssText = `
      font-size:13px;
      line-height:1.6;
      text-align:center;
      color:#b5b7c7;
      margin-bottom:20px;
    `;

    const buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;gap:10px;";

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "취소";

    const confirmButton = document.createElement("button");
    confirmButton.textContent = "다시 뽑기";

    for (const button of [cancelButton, confirmButton]) {
      Object.assign(button.style, {
        flex: "1",
        padding: "12px",
        border: "none",
        borderRadius: "10px",
        cursor: "pointer",
        fontWeight: "bold",
      });
    }

    cancelButton.style.background = "#414558";
    cancelButton.style.color = "#fff";

    confirmButton.style.background = "#d99c62";
    confirmButton.style.color = "#241b17";

    cancelButton.addEventListener("click", () => this.open());

    confirmButton.addEventListener("click", () => {
      this.close();
      this.onConfirmReroll();
    });

    buttons.append(cancelButton, confirmButton);
    panel.append(title, description, buttons);
  }

  close(): void {
    this.element?.remove();
    this.element = null;
  }

  destroy(): void {
    this.close();
  }
}
