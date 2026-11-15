
import {
  drawRandomPet,
  getPetProbabilities,
} from "../../shared/gacha/petGacha";
import type { PetPoolEntry } from "../../shared/gacha/petPool";
import { getPetImageUrl } from "../../shared/petConfig";
import {
  saveOwnedPet,
  replaceOwnedPet,
  type OwnedPet,
} from "../../storage/petStorage";
import { GACHA_STYLES } from "./gachaStyles";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type GachaMode = "first" | "reroll";

export function showGachaModal(
  mode?: "first",
): Promise<OwnedPet>;

export function showGachaModal(
  mode: "reroll",
): Promise<OwnedPet | null>;

export function showGachaModal(
  mode: GachaMode = "first",
): Promise<OwnedPet | null> {
  const existingModal = document.getElementById(
    "chrome-pet-gacha-root",
  );

  if (existingModal) {
    return Promise.reject(
      new Error("펫 뽑기 화면이 이미 열려 있습니다."),
    );
  }

  const isReroll = mode === "reroll";

  const host = document.createElement("div");
  host.id = "chrome-pet-gacha-root";

  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    pointerEvents: "auto",
  });

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = GACHA_STYLES;
  shadow.append(style);

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  overlay.innerHTML = `
    <section
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-label="${isReroll ? "펫 다시 뽑기" : "첫 번째 펫 뽑기"}"
    >
      <div class="heading">
        🐾 ${isReroll ? "새로운 친구 만나기" : "새로운 친구 찾기"}
      </div>

      <p class="subtitle" id="hint">
        이 수상한 상자 안에 누가 있을까?
      </p>

      <div class="stage">
        <div class="dust dust-left">✦</div>
        <div class="dust dust-right">✧</div>

        <img class="box-art" alt="낡은 종이박스" />

        <div class="poof">펑!</div>

        <img class="pet-art" alt="" />
      </div>

      <div class="result" aria-live="polite"></div>

      <button class="draw" type="button">
        상자 열어보기
      </button>

      <div class="odds"></div>
    </section>
  `;

  shadow.append(overlay);
  document.documentElement.append(host);

  const panel = shadow.querySelector<HTMLElement>(".panel")!;
  const box = shadow.querySelector<HTMLImageElement>(".box-art")!;
  const petImage = shadow.querySelector<HTMLImageElement>(".pet-art")!;
  const result = shadow.querySelector<HTMLElement>(".result")!;
  const drawButton = shadow.querySelector<HTMLButtonElement>(".draw")!;
  const hint = shadow.querySelector<HTMLElement>("#hint")!;
  const odds = shadow.querySelector<HTMLElement>(".odds")!;

  box.src = chrome.runtime.getURL(
    "assets/gacha/cardboard-box.svg",
  );

  odds.textContent = getPetProbabilities()
    .map(
      (pet) =>
        `${pet.name} ${pet.probability.toFixed(1)}%`,
    )
    .join(" · ");

  // 다시 뽑기일 때만 취소 버튼 표시
  let cancelButton: HTMLButtonElement | null = null;

  if (isReroll) {
    cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "취소";

    Object.assign(cancelButton.style, {
      display: "block",
      margin: "12px auto 0",
      padding: "10px 24px",
      background: "transparent",
      border: "1px solid #777",
      borderRadius: "8px",
      color: "#777",
      cursor: "pointer",
      fontSize: "13px",
    });

    panel.appendChild(cancelButton);
  }

  return new Promise<OwnedPet | null>((resolve) => {
    let busy = false;
    let finished = false;
    let selectedPet: PetPoolEntry | null = null;
    let revealed = false;

    const finish = (pet: OwnedPet | null): void => {
      if (finished) return;

      finished = true;
      host.remove();
      resolve(pet);
    };

    // 취소하면 기존 펫 유지
    cancelButton?.addEventListener("click", () => {
      if (busy) return;
      finish(null);
    });

    drawButton.addEventListener("click", async () => {
      if (busy || finished) return;

      busy = true;
      drawButton.disabled = true;

      try {
        // 이미 새 펫이 공개된 상태라면 확정 처리
        if (revealed) {
          if (!selectedPet) {
            throw new Error("선택된 펫이 없습니다.");
          }

          // 저장은 확정 버튼을 누를 때만 실행
          const owned = isReroll
            ? await replaceOwnedPet(selectedPet)
            : await saveOwnedPet(selectedPet);

          finish(owned);
          return;
        }

        // 최초 뽑기 / 다시 뽑기 모두 랜덤 추첨
        selectedPet = drawRandomPet();

        drawButton.textContent = "상자가 꿈틀꿈틀...";
        hint.textContent = "안에서 무슨 소리가 나는데...?";

        if (cancelButton) {
          cancelButton.disabled = true;
        }

        overlay.classList.add("shaking");
        await delay(1200);

        if (finished) return;

        overlay.classList.remove("shaking");
        overlay.classList.add("bursting");

        await delay(450);

        if (finished) return;

        petImage.src = getPetImageUrl({
          species: selectedPet.species,
          skin: selectedPet.skin,
          size: 96,
        });

        petImage.alt = selectedPet.name;

        box.style.display = "none";
        overlay.classList.add("revealed");

        result.textContent = `${selectedPet.name} 등장!`;

        hint.textContent = isReroll
          ? "이 친구로 교체할까?"
          : "새 친구가 생겼어!";

        revealed = true;

        drawButton.textContent = isReroll
          ? "이 펫으로 교체하기"
          : "함께 놀러가기";

        if (cancelButton) {
          cancelButton.disabled = false;
        }
      } catch (error) {
        console.error("[Chrome Pet] 펫 뽑기 실패", error);

        if (revealed) {
          // 저장 실패 시 선택 결과를 유지하고 재시도
          hint.textContent = "저장에 실패했어. 다시 시도해 줘.";

          drawButton.textContent = isReroll
            ? "교체 다시 시도"
            : "저장 다시 시도";
        } else {
          selectedPet = null;

          overlay.classList.remove(
            "shaking",
            "bursting",
            "revealed",
          );

          box.style.display = "";
          result.textContent = "";
          hint.textContent =
            "뽑기에 실패했어. 다시 시도해 줘.";
          drawButton.textContent = "다시 시도";
        }

        if (cancelButton) {
          cancelButton.disabled = false;
        }
      } finally {
        busy = false;

        if (!finished) {
          drawButton.disabled = false;
        }
      }
    });
  });
}
