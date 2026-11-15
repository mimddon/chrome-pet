
export class GameLoop {
  private running = false;
  private frameId: number | null = null;
  private lastTime = 0;

  constructor(
    private readonly update: (deltaTime: number) => void,
  ) {}

  private readonly tick = (time: number): void => {
    if (!this.running) return;

    const deltaTime = Math.min(
      (time - this.lastTime) / 1000,
      0.05,
    );

    this.lastTime = time;

    this.update(deltaTime);

    if (this.running) {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastTime = performance.now();

    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;

    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}
