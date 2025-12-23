import { Entity } from './Entity';
import { Tower } from './Tower';
import { CanvasLayer } from '../renderer/CanvasLayer';

export class Troop extends Entity {
    public speed: number = 100; // pixels per second
    public hasArrived: boolean = false;
    public targetTower: Tower; // Keep public for reading final destination if needed

    private path: Tower[];
    private currentTargetIdx: number = 0;

    constructor(
        x: number,
        y: number,
        path: Tower[],
        public ownerId: number
    ) {
        super(x, y, 5); // Radius 5
        this.path = path;
        // The path includes the starting tower at index 0?
        // Let's assume path is [nextHop, ..., finalDest]
        // Actually findPath usually returns [Start, A, B, End].
        // If path[0] is Start, we should start targeting path[1].
        this.targetTower = path[path.length - 1]; // Final destination
        this.currentTargetIdx = 0;
    }

    update(dt: number) {
        if (this.hasArrived) return;

        const currentTarget = this.path[this.currentTargetIdx];

        const dx = currentTarget.x - this.x;
        const dy = currentTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Arrival at current waypoint
        if (dist < 10) {
            this.currentTargetIdx++;
            if (this.currentTargetIdx >= this.path.length) {
                // Reached final destination
                this.hasArrived = true;
            }
            return;
        }

        // Normalize and move
        const vx = (dx / dist) * this.speed;
        const vy = (dy / dist) * this.speed;

        this.x += vx * dt;
        this.y += vy * dt;
    }

    draw(renderer: CanvasLayer) {
        let color = '#fff';
        if (this.ownerId === 1) color = '#a3d5ff'; // Light Blue
        if (this.ownerId === 2) color = '#ff8fa3'; // Light Red

        renderer.drawCircle(this.x, this.y, this.radius, color);
    }
}
