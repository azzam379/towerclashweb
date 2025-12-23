export class GameLoop {
    private lastTime: number = 0;
    private accumulator: number = 0;
    private readonly step: number = 1 / 60;
    private isRunning: boolean = false;

    private update: (dt: number) => void;
    private draw: () => void;

    constructor(
        update: (dt: number) => void,
        draw: () => void
    ) {
        this.update = update;
        this.draw = draw;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    stop() {
        this.isRunning = false;
    }

    private loop(timestamp: number) {
        if (!this.isRunning) return;

        let deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap deltaTime to prevent spiraling death on lag spikes
        if (deltaTime > 0.25) deltaTime = 0.25;

        this.accumulator += deltaTime;

        // Fixed timestep update
        while (this.accumulator >= this.step) {
            this.update(this.step);
            this.accumulator -= this.step;
        }

        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }
}
