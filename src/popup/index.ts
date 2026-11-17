import { createPetFeatures } from "../shared/features";
import type { PetFeature, PetFeatureLocation, PetFeatureRequest, PetFeatureResponse } from "../shared/features";
import { setPetEnabled, watchPetEnabled } from "../storage/petVisibility";

const menu = document.querySelector<HTMLElement>("#menu")!;
const title = document.querySelector<HTMLElement>("#title")!;
const back = document.querySelector<HTMLButtonElement>("#back")!;
const error = document.querySelector<HTMLElement>("#error")!;
let busy = false;
let petEnabled: boolean | null = null;
let currentLocation: PetFeatureLocation = "popup";

const features = createPetFeatures({
  openPetSettings: () => renderMenu("popupSettings"),
  rerollPet: requestReroll,
  enablePet: () => setPetEnabled(true),
  disablePet: () => setPetEnabled(false),
});

function renderMenu(location: PetFeatureLocation): void {
  currentLocation = location;
  menu.replaceChildren();
  error.hidden = true;
  back.hidden = location === "popup";
  title.textContent = location === "popup" ? "Chrome Pet" : "설정";

  for (const feature of features.filter((feature) => feature.displayIn.includes(location))) {
    if (feature.id === "enablePet" && petEnabled !== false) continue;
    if (feature.id === "disablePet" && petEnabled !== true) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = feature.label;
    button.dataset.featureId = feature.id;
    button.addEventListener("click", () => { void executeFeature(feature); });
    menu.append(button);
  }
  updateButtonStates();
}

function updateButtonStates(): void {
  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    button.disabled = busy || (button.dataset.featureId === "rerollPet" && petEnabled !== true);
  });
}

async function executeFeature(feature: PetFeature): Promise<void> {
  if (busy) return;
  busy = true;
  error.hidden = true;
  updateButtonStates();
  try {
    await feature.execute();
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : "기능을 실행하지 못했습니다.";
    error.hidden = false;
  } finally {
    busy = false;
    updateButtonStates();
  }
}

async function requestReroll(): Promise<void> {
  if (!petEnabled) throw new Error("펫을 켠 뒤 다시 뽑기를 시도해 주세요.");
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
const unsubscribe = watchPetEnabled((enabled) => {
  petEnabled = enabled;
  renderMenu(currentLocation);
}, () => {
  error.textContent = "펫 표시 설정을 불러오지 못했습니다. 팝업을 다시 열어 주세요.";
  error.hidden = false;
});
window.addEventListener("pagehide", unsubscribe, { once: true });
