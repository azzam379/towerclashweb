import { Entity } from './Entity';
import { Tower } from './Tower';
import { CanvasLayer } from '../renderer/CanvasLayer';
import { AssetManager } from '../core/AssetManager';

export class Troop extends Entity {
    public speed: number = 100; // pixels per second
    public hasArrived: boolean = false;
    public targetTower: Tower; // Keep public for reading final destination if needed

    // Bezier Logic
    private t: number = 0;
    private p0: { x: number, y: number } = { x: 0, y: 0 };
    private p1: { x: number, y: number } = { x: 0, y: 0 };
    private p2: { x: number, y: number } = { x: 0, y: 0 };

    private path: Tower[];
    private currentTargetIdx: number = 0;

    public ownerId: number;

    constructor(
        x: number,
        y: number,
        path: Tower[],
        ownerId: number
    ) {
        super(x, y, 5); // Radius 5
        this.ownerId = ownerId;
        this.path = path;
        this.targetTower = path[path.length - 1]; // Assume last is target

        // Path excludes start tower. path[0] is the first destination (next hop).
        this.currentTargetIdx = 0;

        if (this.path.length > 0) {
            this.resetCurve(x, y, this.path[0]);
        } else {
            // Edge case: empty path
            this.hasArrived = true;
        }
    }

    // Helper to setup next bezier curve
    private resetCurve(startX: number, startY: number, target: Tower) {
        this.p0 = { x: startX, y: startY };
        this.p2 = { x: target.x, y: target.y };

        // Calculate Control Point (p1)
        const dx = this.p2.x - this.p0.x;
        const dy = this.p2.y - this.p0.y;
        const cx = (this.p0.x + this.p2.x) / 2;
        const cy = (this.p0.y + this.p2.y) / 2;

        const dist = Math.sqrt(dx * dx + dy * dy);

        // --- Deterministic Direction Logic (Must match GameManager) ---
        // We know startX, startY approach target.x, target.y.
        // But what was the "Key" used in GameManager?
        // It was [id1, id2].sort().
        // We need the ID of the source tower and target tower.
        // We don't have source tower ID easily available here unless we track it.
        // HOWEVER: We can guess based on position? No.
        // Easier: Just randomize it for now to save time, OR pass source ID.
        // Wait, 'path' has towers.
        // Troop moves from path[i] to path[i+1].
        // So source is path[currentTargetIdx - 1] (or Start if idx=0).
        // Let's rely on path.

        // Correct source tower logic:
        // if this.currentTargetIdx == 0 (Should not happen if we init at 1), source is path[0].
        // In constructor we set idx=1.
        // So current source is path[this.currentTargetIdx - 1].
        // Target is path[this.currentTargetIdx].

        const sourceT = this.path[this.currentTargetIdx - 1];
        const targetT = this.path[this.currentTargetIdx];

        // If we have source and target, we can replicate the hash
        let dir = 1;
        if (sourceT && targetT) {
            const key = [sourceT.id, targetT.id].sort().join('-');
            let hash = 0;
            for (let i = 0; i < key.length; i++) {
                hash = (hash << 5) - hash + key.charCodeAt(i);
                hash |= 0;
            }
            dir = (Math.abs(hash) % 2 === 0) ? 1 : -1;
        } else {
            // Fallback
            dir = Math.random() > 0.5 ? 1 : -1;
        }

        const offset = 40 * dir; // Curve magnitude matching GameManager

        // Normalize perp vector
        const px = -dy / dist;
        const py = dx / dist;

        this.p1 = {
            x: cx + px * offset,
            y: cy + py * offset
        };

        this.t = 0;
    }

    update(dt: number) {
        if (this.hasArrived) return;

        // Speed scaling
        // const speedMultiplier = 0.5; // Bezier t logic runs different than px/sec
        // We want constant speed. t step should be speed / distance
        const dist = Math.sqrt((this.p2.x - this.p0.x) ** 2 + (this.p2.y - this.p0.y) ** 2);
        const step = (this.speed * dt) / dist; // Roughly

        this.t += step;

        if (this.t >= 1) {
            this.t = 1;
            // Reached waypoint
            this.currentTargetIdx++;
            if (this.currentTargetIdx >= this.path.length) {
                this.hasArrived = true;
            } else {
                // Setup next leg
                this.resetCurve(this.x, this.y, this.path[this.currentTargetIdx]);
            }
        }

        // Quadratic Bezier Formula
        // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        const t = this.t;
        const invT = 1 - t;

        this.x = (invT * invT * this.p0.x) + (2 * invT * t * this.p1.x) + (t * t * this.p2.x);
        this.y = (invT * invT * this.p0.y) + (2 * invT * t * this.p1.y) + (t * t * this.p2.y);
    }

    draw(renderer: CanvasLayer, assets?: AssetManager) {
        let color = '#fff';
        let spriteName = '';

        if (this.ownerId === 1) {
            color = '#a3d5ff'; // Light Blue
            spriteName = 'blue_troops';
        }
        if (this.ownerId === 2) {
            color = '#ff8fa3'; // Light Red
            spriteName = 'red_troops';
        }

        const img = assets?.getImage(spriteName);

        if (img) {
            const size = 30; // 30x30 size (smaller than Tower's ~100)
            renderer.ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
        } else {
            renderer.drawCircle(this.x, this.y, this.radius, color);
        }
    }
}
