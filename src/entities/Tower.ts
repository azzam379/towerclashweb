import { Entity } from './Entity';
import { CanvasLayer } from '../renderer/CanvasLayer';
import { AssetManager } from '../core/AssetManager';

export class Tower extends Entity {
    public unitCount: number = 10;
    public maxUnits: number = 50;
    public level: number = 1;
    public regenTimer: number = 0;
    public neighbors: Tower[] = []; // Lane system
    public isMaster: boolean = false;

    // Animation - Gameplay (Capture)
    public scale: number = 1;
    public captureState: 'NONE' | 'COLLAPSING' | 'REBUILDING' = 'NONE';
    public pendingOwner: number | null = null;

    // Animation - Interaction (Hover/Select)
    public interactionScale: number = 1.0;
    public targetInteractionScale: number = 1.0;

    public ownerId: number;

    constructor(
        x: number,
        y: number,
        ownerId: number, // 0: Neutral, 1: Player, 2: Enemy
    ) {
        super(x, y, 40); // Radius 40
        this.ownerId = ownerId;
    }

    update(dt: number) {
        // --- 1. Interaction Animation (Smooth Lerp) ---
        // Lerp factor (speed)
        const lerpSpeed = 10;
        this.interactionScale += (this.targetInteractionScale - this.interactionScale) * lerpSpeed * dt;

        // --- 2. Gameplay Capture Animation ---
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


    draw(renderer: CanvasLayer, assets?: AssetManager) {
        let color = '#ccc'; // Neutral
        let spriteName = 'tower_grey';

        if (this.ownerId === 1) {
            color = '#4facfe'; // Player (Blue)
            spriteName = this.isMaster ? 'master_tower_blue' : 'tower_blue';
        }
        if (this.ownerId === 2) {
            color = '#ff0844'; // Enemy (Red)
            spriteName = this.isMaster ? 'master_tower_red' : 'tower_red';
        }

        // Combine Scales
        const finalScale = this.scale * this.interactionScale;
        const ctx = renderer.ctx;

        // Save context for scaling
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(finalScale, finalScale);

        const img = assets?.getImage(spriteName);

        if (img) {
            // Draw Sprite
            const size = this.radius * 2.5; // Slightly larger than radius
            ctx.drawImage(img, -size / 2, -size / 2, size, size);

            // Interaction Highlight (Selection Ring instead of modifying color)
            // Just basic glow if interactionScale > 1 is enough usually, 
            // but we might want a selection circle behind.
            // Since we scaled context, we can just draw circle behind if we want.
        } else {
            // FALLBACK TO SHAPES
            ctx.fillStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#fff';

            if (this.isMaster) {
                // --- MASTER CASTLE VISUAL ---
                const w = this.radius * 1.8;
                const h = this.radius * 1.6;

                // Base
                ctx.fillRect(-w / 2, -h / 2, w, h);
                ctx.strokeRect(-w / 2, -h / 2, w, h);

                // Battlements (Top)
                const cw = w / 3;
                ctx.fillRect(-w / 2, -h / 2 - 10, cw, 10); // Left Turret
                ctx.strokeRect(-w / 2, -h / 2 - 10, cw, 10);

                ctx.fillRect(w / 2 - cw, -h / 2 - 10, cw, 10); // Right Turret
                ctx.strokeRect(w / 2 - cw, -h / 2 - 10, cw, 10);

                ctx.fillRect(-cw / 2, -h / 2 - 5, cw, 5); // Center small

                // Door
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(0, h / 2, w / 4, Math.PI, 0);
                ctx.fill();

                // Gold Border
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#FFD700';
                ctx.strokeRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);

            } else {
                // --- NORMAL TURRET VISUAL ---
                // Base Circle
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Inner Core (Darker)
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
                ctx.fill();

                // Top Canon/Spire
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.rect(-5, -this.radius * 1.2, 10, this.radius * 1.2);
                ctx.fill();
                ctx.stroke();
            }
        }

        // Unit Count
        // Draw Text (only if scale is reasonable to avoid glitchy text)
        if (finalScale > 0.5) {
            renderer.drawText(0, this.isMaster ? 40 : 5, Math.floor(this.unitCount).toString(), '#fff', this.isMaster ? 24 : 20);
        }

        ctx.restore();
    }

    addUnits(amount: number) {
        this.unitCount += amount;
    }

    removeUnits(amount: number) {
        this.unitCount -= amount;
    }
}
