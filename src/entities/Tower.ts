import { Entity } from './Entity';
import { CanvasLayer } from '../renderer/CanvasLayer';

export class Tower extends Entity {
    public unitCount: number = 10;
    public maxUnits: number = 50;
    public level: number = 1;
    public regenTimer: number = 0;
    public neighbors: Tower[] = []; // Lane system
    public isMaster: boolean = false;

    // Animation
    public scale: number = 1;
    public captureState: 'NONE' | 'COLLAPSING' | 'REBUILDING' = 'NONE';
    public pendingOwner: number | null = null;

    constructor(
        x: number,
        y: number,
        public ownerId: number, // 0: Neutral, 1: Player, 2: Enemy
    ) {
        super(x, y, 40); // Radius 40
    }

    update(dt: number) {
        // Animation Logic
        if (this.captureState === 'COLLAPSING') {
            this.scale -= dt * 2; // Collapse speed
            if (this.scale <= 0) {
                this.scale = 0;
                this.ownerId = this.pendingOwner!;
                this.captureState = 'REBUILDING';
            }
            return; // Don't regen while animating
        } else if (this.captureState === 'REBUILDING') {
            this.scale += dt * 2;
            if (this.scale >= 1) {
                this.scale = 1;
                this.captureState = 'NONE';
                // Trigger Game Over checks usually handled by Manager, 
                // but Manager checks state so we are good.
            }
            return; // Don't regen while animating
        }

        // Regenerate units if not neutral (or even neutrals can regen if we want)
        // Usually neutrals don't regen, or regen very slowly
        if (this.ownerId !== 0) {
            this.regenTimer += dt;
            if (this.regenTimer >= 1.0) { // 1 unit per second
                if (this.unitCount < this.maxUnits) {
                    this.unitCount++;
                }
                this.regenTimer = 0;
            }
        }

        // Over-capacity Decay Logic
        if (this.unitCount > this.maxUnits) {
            const decayRate = 2; // Lose 2 units per second if over capacity
            this.unitCount -= decayRate * dt;
            // Don't decay below max
            if (this.unitCount < this.maxUnits) {
                this.unitCount = this.maxUnits;
            }
        }
    }

    draw(renderer: CanvasLayer) {
        let color = '#ccc'; // Neutral
        if (this.ownerId === 1) color = '#4facfe'; // Player (Blue)
        if (this.ownerId === 2) color = '#ff0844'; // Enemy (Red)

        // Save context for scaling
        renderer.ctx.save();
        renderer.ctx.translate(this.x, this.y);
        renderer.ctx.scale(this.scale, this.scale);
        renderer.ctx.translate(-this.x, -this.y);

        if (this.isMaster) {
            // Draw Square for Master
            const size = this.radius * 2.2;
            renderer.ctx.fillStyle = color;
            renderer.ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);

            renderer.ctx.lineWidth = 4;
            renderer.ctx.strokeStyle = '#FFD700'; // Gold border
            renderer.ctx.strokeRect(this.x - size / 2, this.y - size / 2, size, size);
        } else {
            renderer.drawCircle(this.x, this.y, this.radius, color);
            renderer.drawStrokeCircle(this.x, this.y, this.radius, '#fff', 3);
        }

        // Draw Text (only if scale is reasonable to avoid glitchy text)
        if (this.scale > 0.5) {
            renderer.drawText(this.x, this.y, Math.floor(this.unitCount).toString(), '#fff', this.isMaster ? 24 : 20);
        }

        renderer.ctx.restore();
    }

    addUnits(amount: number) {
        this.unitCount += amount;
    }

    removeUnits(amount: number) {
        this.unitCount -= amount;
    }
}
