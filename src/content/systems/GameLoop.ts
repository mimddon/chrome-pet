
export class GameLoop {
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private running = false;

  constructor(
    private readonly updateCallback: (deltaTime: number) => void,
  ) {}

  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastTime = performance.now();

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (currentTime: number): void => {
    if (!this.running) return;

    // 밀리초를 초 단위로 변환
    // 탭 복귀 시 갑자기 멀리 이동하는 현상 방지
    const deltaTime = Math.min(
      (currentTime - this.lastTime) / 1000,
      0.05,
    );

    this.lastTime = currentTime;

    this.updateCallback(deltaTime);

    this.animationFrameId = requestAnimationFrame(this.tick);
  };
}
