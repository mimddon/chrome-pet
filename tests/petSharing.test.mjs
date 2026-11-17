import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./loadSource.mjs";

const { createPetService } = await loadSource("src/background/petService.ts");
const { PetWorld } = await loadSource("src/background/PetWorld.ts");
const { watchOwnedPet } = await loadSource("src/storage/petStorage.ts");
const { createWorldHost } = await loadSource("src/background/worldHost.ts");
const { isPetMutationRequest } = await loadSource("src/storage/petMessages.ts");
const { PetAnimator } = await loadSource("src/content/pets/PetAnimator.ts");
const STORAGE_KEY = "chromePet.currentPet";

function createStore(initial) {
  let value = structuredClone(initial);
  return {
    async read() { return structuredClone(value); },
    async write(pet) { value = structuredClone(pet); },
  };
}

const adopt = (entryId = "cat-basic") => ({ type: "chrome-pet:mutate", action: "adopt", entryId });
const petting = (pet) => ({ type: "chrome-pet:mutate", action: "pet", instanceId: pet.instanceId, amount: 1 });
const replace = (pet, entryId = "dog-basic") => ({
  type: "chrome-pet:mutate", action: "replace", instanceId: pet.instanceId, entryId,
});

test("동시에 여러 탭에서 쓰다듬어도 모든 증가분을 저장한다", async () => {
  const store = createStore();
  const execute = createPetService(store);
  const pet = await execute(adopt());
  await Promise.all(Array.from({ length: 50 }, () => execute(petting(pet))));
  const saved = await store.read();
  assert.equal(saved.affection, 50);
  assert.equal(saved.revision, 51);
});

test("동시 최초 뽑기는 먼저 확정된 한 마리만 저장한다", async () => {
  const execute = createPetService(createStore());
  const [first, second] = await Promise.all([execute(adopt()), execute(adopt("dog-basic"))]);
  assert.deepEqual(second, first);
});

test("교체 뒤에 도착한 이전 펫의 쓰다듬기와 교체 요청은 거절한다", async () => {
  const store = createStore();
  const execute = createPetService(store);
  const first = await execute(adopt());
  const results = await Promise.allSettled([
    execute(replace(first)), execute(petting(first)), execute(replace(first, "cat-white")),
  ]);
  assert.deepEqual(results.map((result) => result.status), ["fulfilled", "rejected", "rejected"]);
  assert.equal((await store.read()).id, "dog-basic");
  assert.equal((await store.read()).affection, 0);
});

test("같은 종류를 다시 뽑아도 인스턴스를 구분하고 이전 요청을 차단한다", async () => {
  const execute = createPetService(createStore());
  const first = await execute(adopt());
  const next = await execute(replace(first, first.id));
  assert.equal(next.id, first.id);
  assert.notEqual(next.instanceId, first.instanceId);
  await assert.rejects(execute(petting(first)));
});

test("기존 펫의 애정도를 보존하고 워커 재시작 후에도 이어서 저장한다", async () => {
  const store = createStore({
    id: "cat-black", species: "cat", skin: "black", name: "검은 고양이",
    affection: 42, level: 2, experience: 3, obtainedAt: "2026-01-01",
  });
  const firstService = createPetService(store);
  const pet = await firstService(adopt());
  assert.equal(pet.affection, 42);
  assert.equal(pet.instanceId, "legacy:cat-black:2026-01-01");
  await firstService(petting(pet));
  const restarted = createPetService(store);
  assert.equal((await restarted(petting(pet))).affection, 44);
});

test("저장 실패 후에도 큐가 복구되고 다음 요청을 처리한다", async () => {
  const store = createStore();
  let fail = true;
  const execute = createPetService({
    read: store.read,
    async write(pet) {
      if (fail) { fail = false; throw new Error("disk unavailable"); }
      await store.write(pet);
    },
  });
  await assert.rejects(execute(adopt()));
  assert.equal((await execute(adopt())).id, "cat-basic");
});

test("NaN, 무한대, 음수와 알 수 없는 변경 요청은 허용하지 않는다", () => {
  for (const amount of [NaN, Infinity, -1, 0, 1.5]) {
    assert.equal(isPetMutationRequest({ ...petting({ instanceId: "pet" }), amount }), false);
  }
  assert.equal(isPetMutationRequest({ type: "chrome-pet:mutate", action: "delete" }), false);
  assert.equal(isPetMutationRequest(petting({ instanceId: "pet" })), true);
});

function event() {
  const listeners = new Set();
  return {
    addListener(listener) { listeners.add(listener); },
    removeListener(listener) { listeners.delete(listener); },
    emit(...args) { for (const listener of [...listeners]) listener(...args); },
    get size() { return listeners.size; },
  };
}

function installChrome(t, chrome) {
  const previous = globalThis.chrome;
  globalThis.chrome = chrome;
  t.after(() => {
    if (previous === undefined) delete globalThis.chrome;
    else globalThis.chrome = previous;
  });
}

test("초기 조회보다 변경 알림이 먼저 도착해도 옛 데이터로 덮어쓰지 않는다", async (t) => {
  const onChanged = event();
  let resolveRead;
  installChrome(t, {
    storage: {
      local: { get: () => new Promise((resolve) => { resolveRead = resolve; }) },
      onChanged,
    },
  });
  const execute = createPetService(createStore());
  const initial = await execute(adopt());
  const latest = await execute(petting(initial));
  const observed = [];
  const unsubscribe = watchOwnedPet((pet) => observed.push(pet));
  onChanged.emit({ [STORAGE_KEY]: { newValue: latest } }, "local");
  resolveRead({ [STORAGE_KEY]: initial });
  await new Promise(setImmediate);
  assert.deepEqual(observed, [latest]);
  unsubscribe();
  assert.equal(onChanged.size, 0);
  onChanged.emit({ [STORAGE_KEY]: { newValue: initial } }, "local");
  assert.equal(observed.length, 1);
});

test("구독 해제 후 초기 조회가 끝나도 콜백을 호출하지 않는다", async (t) => {
  let resolveRead;
  installChrome(t, {
    storage: { local: { get: () => new Promise((resolve) => { resolveRead = resolve; }) }, onChanged: event() },
  });
  const observed = [];
  const unsubscribe = watchOwnedPet((pet) => observed.push(pet));
  unsubscribe();
  resolveRead({});
  await new Promise(setImmediate);
  assert.deepEqual(observed, []);
});

test("한 월드에서 계산한 위치·방향·이동 상태를 모든 화면에 사용한다", () => {
  const world = new PetWorld("pet");
  world.update(6); // 긴 지연도 한 프레임 분량만 진행한다.
  for (let i = 0; i < 200; i++) world.update(0.05);
  const snapshot = world.snapshot();
  for (const [width, height] of [[1200, 800], [500, 300]]) {
    const x = snapshot.x * (width - 96);
    const y = snapshot.y * (height - 96);
    assert.ok(x >= 0 && x <= width - 96);
    assert.ok(y >= 0 && y <= height - 96);
    assert.equal(x / (width - 96), snapshot.x);
    assert.equal(y / (height - 96), snapshot.y);
  }
});

test("드래그 소유권을 공유하고 다른 탭의 동시 드래그는 무시한다", () => {
  const world = new PetWorld("pet");
  world.command("tab-a", { action: "hold" });
  world.command("tab-a", { action: "drag", x: 0.2, y: 0.3 });
  world.command("tab-b", { action: "hold" });
  world.command("tab-b", { action: "drag", x: 0.9, y: 0.9 });
  world.command("tab-b", { action: "release" });
  assert.equal(world.snapshot().x, 0.2);
  assert.equal(world.snapshot().y, 0.3);
  for (let i = 0; i < 200; i++) world.update(0.05);
  assert.equal(world.snapshot().x, 0.2);
  world.release("tab-a");
  world.command("tab-b", { action: "hold" });
  world.command("tab-b", { action: "drag", x: 1, y: 0 });
  assert.equal(world.snapshot().x, 1);
  assert.equal(world.snapshot().y, 0);
});

test("나비 소환·추적·잡기 판정을 같은 월드에서 처리한다", () => {
  const world = new PetWorld("pet");
  world.command("tab-a", { action: "spawnButterfly" });
  const butterfly = world.snapshot().butterfly;
  assert.equal(butterfly.phase, "flying");
  world.command("tab-b", { action: "spawnButterfly" });
  assert.equal(world.snapshot().butterfly.id, butterfly.id);
  let caught = false;
  for (let i = 0; i < 100; i++) {
    world.update(0.05);
    if (world.snapshot().butterfly?.phase === "caught") caught = true;
  }
  assert.equal(caught, true);
  assert.equal(world.snapshot().butterfly, null);
});

test("서비스 워커 재시작 시 같은 펫의 위치만 복원한다", () => {
  const saved = { instanceId: "pet", x: 0.1, y: 0.8, direction: "left" };
  const restored = new PetWorld("pet", saved);
  assert.equal(restored.snapshot().x, saved.x);
  assert.equal(restored.snapshot().direction, "left");
  assert.notEqual(new PetWorld("new-pet", saved).snapshot().x, saved.x);
});

test("서로 다른 시점에 열린 탭도 같은 애니메이션 프레임을 표시한다", (t) => {
  installChrome(t, { runtime: { getURL: (path) => `chrome-extension://test/${path}` } });
  const pet = { config: { species: "cat", skin: "basic" }, getState: () => "walking" };
  const frames = [];
  const createAnimator = (index) => {
    const animator = new PetAnimator(pet, { setImage: (image) => { frames[index] = image; } });
    animator.setFrames("walk", ["frame-0", "frame-1", "frame-2"], 100);
    return animator;
  };
  const first = createAnimator(0);
  first.sync(0.15);
  const second = createAnimator(1);
  first.sync(0.25);
  second.sync(0.25);
  assert.deepEqual(frames, ["frame-2", "frame-2"]);
});

test("두 탭이 같은 스냅샷과 효과를 받고 연결 종료 시 드래그 잠금을 해제한다", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const onConnect = event();
  installChrome(t, {
    runtime: { id: "extension", onConnect },
    storage: { session: { async get() { return {}; }, async set() {} } },
  });
  const host = createWorldHost();
  const execute = createPetService(createStore());
  const pet = await execute(adopt());
  host.setPet(pet);
  await new Promise(setImmediate);
  function connect() {
    const messages = [];
    const port = {
      name: "chrome-pet:world", sender: { id: "extension" },
      onMessage: event(), onDisconnect: event(),
      postMessage(message) { messages.push(structuredClone(message)); },
    };
    onConnect.emit(port);
    port.onMessage.emit({ type: "presence", visible: true });
    return { port, messages };
  }
  const first = connect();
  const second = connect();
  const command = (client, value, instanceId = pet.instanceId) => client.port.onMessage.emit({
    type: "command", instanceId, command: value,
  });
  command(first, { action: "hold" });
  command(first, { action: "drag", x: 0.25, y: 0.75 });
  assert.deepEqual(first.messages.at(-1), second.messages.at(-1));
  assert.equal(second.messages.at(-1).snapshot.x, 0.25);
  command(second, { action: "drag", x: 0, y: 0 }, "stale-pet");
  assert.equal(second.messages.at(-1).snapshot.x, 0.25);
  first.port.onDisconnect.emit();
  command(second, { action: "hold" });
  command(second, { action: "drag", x: 1, y: 0 });
  assert.equal(second.messages.at(-1).snapshot.x, 1);
  host.notifyPetting({ ...pet, affection: 5 });
  assert.deepEqual(second.messages.at(-1), { type: "petting", instanceId: pet.instanceId, affection: 5 });
  second.port.onDisconnect.emit();
  await new Promise(setImmediate);
});

test("실제 백그라운드 메시지 경로에서 동시 저장과 월드 갱신을 처리한다", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let stored;
  const handlers = [];
  const onConnect = event();
  installChrome(t, {
    runtime: {
      id: "extension", onConnect,
      onMessage: { addListener(handler) { handlers.push(handler); } },
    },
    storage: {
      local: {
        async get(key) { return { [key]: structuredClone(stored) }; },
        async set(data) { stored = structuredClone(data[STORAGE_KEY]); },
      },
      session: { async get() { return {}; }, async set() {} },
    },
  });
  await loadSource("src/background/index.ts");
  const messages = [];
  const port = {
    name: "chrome-pet:world", sender: { id: "extension" },
    onMessage: event(), onDisconnect: event(),
    postMessage(message) { messages.push(structuredClone(message)); },
  };
  onConnect.emit(port);
  port.onMessage.emit({ type: "presence", visible: true });
  const request = (message) => new Promise((resolve) => {
    assert.equal(handlers[0](message, { id: "extension" }, resolve), true);
  });
  const adopted = await request(adopt());
  assert.equal(adopted.ok, true);
  await Promise.all(Array.from({ length: 10 }, () => request(petting(adopted.pet))));
  assert.equal(stored.affection, 10);
  assert.equal(messages.filter((message) => message.type === "petting").length, 10);
  const replaced = await request(replace(adopted.pet));
  assert.equal(replaced.ok, true);
  assert.equal(messages.at(-1).snapshot.instanceId, replaced.pet.instanceId);
  assert.equal((await request(petting(adopted.pet))).ok, false);
  port.onDisconnect.emit();
  await new Promise(setImmediate);
});
