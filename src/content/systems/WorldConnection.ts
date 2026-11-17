import { WORLD_PORT_NAME, type PetWorldCommand, type WorldServerMessage, type WorldClientMessage } from "../../shared/worldTypes";

export class WorldConnection {
  private port: chrome.runtime.Port | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly heartbeat: ReturnType<typeof setInterval>;

  constructor(private readonly receive: (message: WorldServerMessage) => void) {
    document.addEventListener("visibilitychange", () => this.sendPresence());
    window.addEventListener("pageshow", () => this.sendPresence());
    window.addEventListener("pagehide", () => {
      this.send({ type: "presence", visible: false });
    });
    this.heartbeat = setInterval(() => {
      if (document.hidden) return;
      if (!this.port) this.connect();
      this.send({ type: "heartbeat" });
    }, 10_000);
    this.connect();
  }

  command(instanceId: string, command: PetWorldCommand): void {
    this.send({ type: "command", instanceId, command });
  }

  private sendPresence(): void {
    if (!this.port) this.connect();
    this.send({ type: "presence", visible: !document.hidden });
  }

  private send(message: WorldClientMessage): void {
    try {
      this.port?.postMessage(message);
    } catch {
      this.port = null;
    }
  }

  private connect(): void {
    if (this.port) return;
    try {
      const port = chrome.runtime.connect({ name: WORLD_PORT_NAME });
      this.port = port;
      port.onMessage.addListener((message: WorldServerMessage) => this.receive(message));
      port.onDisconnect.addListener(() => {
        // 읽어 두어 연결 해제 시 Chrome의 lastError 경고를 소비한다.
        void chrome.runtime.lastError;
        if (this.port !== port) return;
        this.port = null;
        if (this.reconnectTimer !== null) return;
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 1000);
      });
      this.send({ type: "presence", visible: !document.hidden });
    } catch {
      // 확장 재로드로 컨텍스트가 무효화된 경우 새로고침이 필요하다.
      clearInterval(this.heartbeat);
    }
  }
}
