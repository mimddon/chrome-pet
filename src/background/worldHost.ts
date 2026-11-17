import { PetWorld } from "./PetWorld";
import { WORLD_PORT_NAME, type PetWorldSnapshot, type WorldClientMessage, type WorldServerMessage } from "../shared/worldTypes";
import type { OwnedPet } from "../storage/petState";
import { watchPetEnabled } from "../storage/petVisibility";

const WORLD_STORAGE_KEY = "chromePet.world";

export function createWorldHost(rewardTreat: (instanceId: string) => Promise<void>): {
  setPet: (pet: OwnedPet) => void;
  notifyPetting: (pet: OwnedPet) => void;
} {
  const clients = new Map<chrome.runtime.Port, { id: string; visible: boolean }>();
  let world: PetWorld | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastTime = performance.now();
  let lastSave = 0;
  let saved: PetWorldSnapshot | undefined;
  let ready = false;
  let petEnabled = false;
  let pendingPet: OwnedPet | null = null;
  let saveQueue: Promise<unknown> = Promise.resolve();

  function post(port: chrome.runtime.Port, message: WorldServerMessage): void {
    try {
      port.postMessage(message);
    } catch {
      disconnect(port);
    }
  }

  function broadcast(): void {
    if (!world) return;
    const message: WorldServerMessage = { type: "snapshot", snapshot: world.snapshot() };
    for (const port of clients.keys()) post(port, message);
  }

  function persist(): void {
    if (!world) return;
    const snapshot = world.snapshot();
    saveQueue = saveQueue.catch(() => undefined)
      .then(() => chrome.storage.session.set({ [WORLD_STORAGE_KEY]: snapshot }))
      .catch((error: unknown) => console.error("[Chrome Pet] 위치 저장 실패", error));
  }

  function updateTimer(): void {
    const active = petEnabled && ready && world && [...clients.values()].some((client) => client.visible);
    if (active && timer === null) {
      lastTime = performance.now();
      timer = setInterval(() => {
        const now = performance.now();
        const completedTreat = world?.update((now - lastTime) / 1000);
        lastTime = now;
        if (completedTreat && world) {
          const completedWorld = world;
          const complete = (rewarded: boolean): void => {
            if (world !== completedWorld) return;
            completedWorld.finishTreat(completedTreat, rewarded);
            broadcast();
            persist();
          };
          void rewardTreat(completedWorld.instanceId).then(
            () => complete(true),
            (error: unknown) => {
              console.error("[Chrome Pet] 간식 보상 저장 실패", error);
              complete(false);
            },
          );
        }
        broadcast();
        if (now - lastSave >= 2000) {
          lastSave = now;
          persist();
        }
      }, 50);
    } else if (!active && timer !== null) {
      clearInterval(timer);
      timer = null;
      persist();
    }
  }

  function disconnect(port: chrome.runtime.Port): void {
    const client = clients.get(port);
    if (!client) return;
    world?.release(client.id);
    clients.delete(port);
    updateTimer();
    broadcast();
  }

  function setPet(pet: OwnedPet): void {
    if (pendingPet && pet.revision < pendingPet.revision) return;
    pendingPet = pet;
    if (!ready) return;
    if (world?.instanceId === pet.instanceId) return;
    world = new PetWorld(pet.instanceId, saved);
    saved = undefined;
    persist();
    updateTimer();
    broadcast();
  }

  watchPetEnabled((enabled) => {
    petEnabled = enabled;
    if (!enabled) {
      for (const client of clients.values()) world?.release(client.id);
    }
    updateTimer();
    if (enabled) broadcast();
  });

  // session 저장소는 브라우저 재시작 때 초기화되며 서비스 워커 재시작에는 유지된다.
  void chrome.storage.session.get(WORLD_STORAGE_KEY).then(
    (data) => { saved = data[WORLD_STORAGE_KEY] as PetWorldSnapshot | undefined; },
    (error: unknown) => { console.error("[Chrome Pet] 위치 복원 실패", error); },
  ).then(() => {
    ready = true;
    if (pendingPet) setPet(pendingPet);
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== WORLD_PORT_NAME || port.sender?.id !== chrome.runtime.id) return;
    const client = { id: crypto.randomUUID(), visible: false };
    clients.set(port, client);
    port.onDisconnect.addListener(() => disconnect(port));
    port.onMessage.addListener((value: unknown) => {
      if (!value || typeof value !== "object") return;
      const message = value as WorldClientMessage;
      if (message.type === "presence" && typeof message.visible === "boolean") {
        client.visible = message.visible;
        if (!client.visible) world?.release(client.id);
        updateTimer();
        broadcast();
      } else if (message.type === "command" && petEnabled && client.visible &&
        message.instanceId === world?.instanceId && message.command &&
        ["hold", "drag", "release", "spawnButterfly", "placeTreat"].includes(message.command.action)) {
        world.command(client.id, message.command);
        broadcast();
        if (message.command.action !== "drag") persist();
      }
      // visible 탭의 heartbeat 메시지가 서비스 워커의 수명을 갱신한다.
    });
    if (world) post(port, { type: "snapshot", snapshot: world.snapshot() });
  });

  return {
    setPet,
    notifyPetting(pet) {
      if (!petEnabled) return;
      for (const port of clients.keys()) {
        post(port, { type: "petting", instanceId: pet.instanceId, affection: pet.affection });
      }
    },
  };
}
