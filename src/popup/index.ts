import { createPetFeatures } from "../shared/features";
import type { PetFeature, PetFeatureLocation, PetFeatureRequest, PetFeatureResponse } from "../shared/features";

const menu = document.querySelector<HTMLElement>("#menu")!;
const title = document.querySelector<HTMLElement>("#title")!;
const back = document.querySelector<HTMLButtonElement>("#back")!;
const error = document.querySelector<HTMLElement>("#error")!;
let busy = false;

const features = createPetFeatures({
  openPetSettings: () => renderMenu("popupSettings"),
  rerollPet: requestReroll,
});

function renderMenu(location: PetFeatureLocation): void {
  menu.replaceChildren();
  error.hidden = true;
  back.hidden = location === "popup";
  title.textContent = location === "popup" ? "Chrome Pet" : "설정";

  for (const feature of features.filter((feature) => feature.displayIn.includes(location))) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = feature.label;
    button.addEventListener("click", () => { void executeFeature(feature); });
    menu.append(button);
  }
}

async function executeFeature(feature: PetFeature): Promise<void> {
  if (busy) return;
  busy = true;
  error.hidden = true;
  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = true; });
  try {
    await feature.execute();
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : "기능을 실행하지 못했습니다.";
    error.hidden = false;
  } finally {
    busy = false;
    document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = false; });
  }
}

async function requestReroll(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) throw new Error("현재 페이지를 찾을 수 없습니다.");

  const message: PetFeatureRequest = { type: "chrome-pet:execute-feature", featureId: "rerollPet" };
  let response: PetFeatureResponse | undefined;
  try {
    response = await chrome.tabs.sendMessage(tab.id, message, { frameId: 0 });
  } catch {
    throw new Error("일반 웹페이지에서 페이지를 새로고침한 뒤 다시 시도해 주세요.");
  }
  if (!response) throw new Error("페이지를 새로고침한 뒤 다시 시도해 주세요.");
  if (!response.ok) throw new Error(response.error);
  window.close();
}

back.addEventListener("click", () => renderMenu("popup"));
renderMenu("popup");
