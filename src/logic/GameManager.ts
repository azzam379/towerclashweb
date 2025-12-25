import { GameLoop } from '../core/GameLoop';
import { CanvasLayer } from '../renderer/CanvasLayer';
import { Tower } from '../entities/Tower';
import { Troop } from '../entities/Troop';
import { Bot } from './Bot';
import { LevelManager } from './LevelManager';

import { AssetManager } from '../core/AssetManager';

export class GameManager {
    private renderer: CanvasLayer;
    private loop: GameLoop;
    public assets: AssetManager; // Public so Towers can access it via GameManager reference (if they had one)
    // Actually Towers are drawn by GameManager passing renderer. 
    // We should pass assets to Tower.draw() or similar.

    private towers: Tower[] = [];
    private troops: Troop[] = [];
    private bot: Bot;

    // Campaign State
    private currentRound: number = 1;
    private maxRounds: number = 20;

    // Interaction state
    private selectedTowers: Tower[] = [];
    private isDragging: boolean = false;
    private dragLine: { x: number, y: number } | null = null;

    // UI
    private uiOverlay: HTMLDivElement;
    private pauseBtn: HTMLButtonElement;
    private isPaused: boolean = false;

    constructor(container: HTMLElement) {
        // Setup Pause Button
        this.pauseBtn = document.createElement('button');
        this.pauseBtn.innerText = 'PAUSE';
        this.pauseBtn.style.position = 'absolute';
        this.pauseBtn.style.top = '10px';
        this.pauseBtn.style.right = '10px';
        this.pauseBtn.style.zIndex = '5';
        this.pauseBtn.style.padding = '10px 20px';
        this.pauseBtn.style.fontSize = '16px';
        this.pauseBtn.style.fontWeight = 'bold';
        this.pauseBtn.style.backgroundColor = 'white';
        this.pauseBtn.style.border = '2px solid #333';
        this.pauseBtn.style.borderRadius = '5px';
        this.pauseBtn.style.cursor = 'pointer';

        this.pauseBtn.onclick = () => this.togglePause();
        container.appendChild(this.pauseBtn);

        // Setup UI Layer
        this.uiOverlay = document.createElement('div');
        this.uiOverlay.style.position = 'absolute';
        this.uiOverlay.style.top = '0';
        this.uiOverlay.style.left = '0';
        this.uiOverlay.style.width = '100%';
        this.uiOverlay.style.height = '100%';
        this.uiOverlay.style.display = 'none';
        this.uiOverlay.style.flexDirection = 'column';
        this.uiOverlay.style.justifyContent = 'center';
        this.uiOverlay.style.alignItems = 'center';
        this.uiOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
        this.uiOverlay.style.color = 'white';
        this.uiOverlay.style.fontFamily = 'Arial, sans-serif';
        this.uiOverlay.style.zIndex = '10';
        container.appendChild(this.uiOverlay);

        this.renderer = new CanvasLayer(container);
        this.assets = new AssetManager();

        this.loop = new GameLoop(
            (dt) => this.update(dt),
            () => this.draw()
        );

        this.bot = new Bot(this, 2);
        this.setupInput();

        // Async Load
        this.assets.loadAll().then(() => {
            this.loadLevel(this.currentRound);
            this.loop.start();
        });
    }

    private togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseBtn.innerText = this.isPaused ? 'RESUME' : 'PAUSE';
        this.pauseBtn.style.backgroundColor = this.isPaused ? '#ffd700' : 'white';
    }

    start() {
        // Handled in constructor
    }

    private loadLevel(round: number) {
        // Reset Paused State
        this.isPaused = false;
        this.pauseBtn.innerText = 'PAUSE';

        // Hide UI
        this.uiOverlay.style.display = 'none';
        this.uiOverlay.innerHTML = '';
        if (this.loop['isRunning'] === false) this.loop.start(); // Ensure running

        // Cleanup old state
        this.towers = [];
        this.troops = [];
        this.selectedTowers = [];

        const config = LevelManager.getLevel(round);

        // create towers
        config.towers.forEach(t => {
            const tower = new Tower(t.x, t.y, t.owner);
            tower.unitCount = t.units;
            tower.isMaster = t.isMaster;
            this.towers.push(tower);
        });

        // connect towers
        config.connections.forEach(([i1, i2]) => {
            if (this.towers[i1] && this.towers[i2]) {
                const t1 = this.towers[i1];
                const t2 = this.towers[i2];
                if (!t1.neighbors.includes(t2)) t1.neighbors.push(t2);
                if (!t2.neighbors.includes(t1)) t2.neighbors.push(t1);
            }
        });

        console.log(`Loaded Round ${round}`);
    }

    // Public API for Bot
    public getAllTowers(): Tower[] { return this.towers; }

    public getTowersByOwner(ownerId: number): Tower[] { return this.towers.filter(t => t.ownerId === ownerId); }

    public sendTroops(source: Tower, target: Tower) {
        // Enforce Lane logic, but check explicit Path first
        let path: Tower[] | null = null;
        if (source.neighbors.includes(target)) {
            path = [target];
        } else {
            path = this.findPath(source, target);
        }

        if (!path) return;

        const count = Math.floor(source.unitCount / 2); // Send half
        if (count <= 0) return;

        source.removeUnits(count);

        for (let i = 0; i < count; i++) {
            const offset = (Math.random() - 0.5) * 20;
            setTimeout(() => {
                // Check pause in timeout? 
                // Timeouts run outside game loop. Better to just spawn logic in update.
                // For now, this is simpler, lets just check isPaused here too, 
                // OR accept that spawn timers are "real time" not "game time".
                // Actually, if paused, we probably shouldn't spawn? 
                // FIX: use a spawn queue in update() for robustness later. 
                // Current setTimeout is acceptable for MVP.
                this.troops.push(new Troop(source.x + offset, source.y + offset, [...path!], source.ownerId));
            }, i * 50);
        }
    }

    private findPath(start: Tower, end: Tower): Tower[] | null {
        const queue: Tower[] = [start];
        const cameFrom = new Map<Tower, Tower>();
        const visited = new Set<Tower>();
        visited.add(start);

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current === end) {
                const path: Tower[] = [];
                let curr = end;
                while (curr !== start) {
                    path.unshift(curr);
                    curr = cameFrom.get(curr)!;
                }
                return path;
            }
            for (const next of current.neighbors) {
                if (!visited.has(next)) {
                    // Valid traversal: target OR same owner
                    if (next === end || next.ownerId === start.ownerId) {
                        visited.add(next);
                        cameFrom.set(next, current);
                        queue.push(next);
                    }
                }
            }
        }
        return null;
    }

    private setupInput() {
        window.addEventListener('mousedown', (e) => this.handleInputStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => this.handleInputMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', (e) => this.handleInputEnd(e.clientX, e.clientY));
    }

    private getTowerAt(x: number, y: number): Tower | null {
        for (const tower of this.towers) {
            const dx = tower.x - x;
            const dy = tower.y - y;
            if (dx * dx + dy * dy < tower.radius * tower.radius) {
                return tower;
            }
        }
        return null;
    }

    private handleInputStart(x: number, y: number) {
        if (this.isPaused) return;
        const tower = this.getTowerAt(x, y);
        if (tower && tower.ownerId === 1) {
            this.selectedTowers = [tower];
            this.isDragging = true;
            this.dragLine = { x, y };
            // Pulse selection
            tower.targetInteractionScale = 1.2;
        }
    }

    private handleInputMove(x: number, y: number) {
        if (this.isPaused) return;

        // --- 1. Hover/Drag Feedback Loop ---
        // Reset scales for non-selected
        this.towers.forEach(t => {
            let targetScale = 1.0;
            // Keep selected ones bumped
            if (this.selectedTowers.includes(t)) targetScale = 1.2;
            t.targetInteractionScale = targetScale;
        });

        const tower = this.getTowerAt(x, y);

        if (this.isDragging) {
            this.dragLine = { x, y };
            // Dragging Logic
            if (tower) {
                // If we are over a tower while dragging
                // 1. If it's your own (reinforce) -> Highlight
                // 2. If it's enemy (attack) -> Highlight (maybe Red tint? Scale is fine for now)

                // Add to selection if dragging over multiple owned towers
                if (tower.ownerId === 1 && !this.selectedTowers.includes(tower)) {
                    this.selectedTowers.push(tower);
                    tower.targetInteractionScale = 1.2;
                }

                // Highlight target (snap effect visual)
                // Note: If we are dragging FROM it, it's already 1.2
                // If it's a target, make it 1.2 too.
                tower.targetInteractionScale = 1.2;
            }
        } else {
            // Just hovering (not dragging)
            if (tower && tower.ownerId === 1) {
                // Hover effect for player towers
                tower.targetInteractionScale = 1.1;
                document.body.style.cursor = 'pointer';
            } else {
                document.body.style.cursor = 'default';
            }
        }
    }

    private handleInputEnd(x: number, y: number) {
        if (this.isPaused) return;
        if (this.isDragging && this.selectedTowers.length > 0) {
            const target = this.getTowerAt(x, y);

            // INPUT FIX: Allow sending to self (reinforce) or other selected towers
            if (target) {
                this.selectedTowers.forEach(source => {
                    if (source !== target) { // Don't send to self
                        this.sendTroops(source, target);
                    }
                });
                // Snap Animation?
                target.targetInteractionScale = 1.4; // Big pulse on release
                setTimeout(() => target.targetInteractionScale = 1.0, 100);
            }
        }
        this.isDragging = false;

        // Reset scales
        this.selectedTowers.forEach(t => t.targetInteractionScale = 1.0);
        this.selectedTowers = [];
        this.dragLine = null;
        document.body.style.cursor = 'default';
    }

    private update(dt: number) {
        if (this.isPaused) return;

        this.bot.update(dt);

        // Update Towers (handle capture animation state)
        this.towers.forEach(t => {
            t.update(dt);

            // Check Animation Finished events
            if (t.captureState === 'NONE' && t.isMaster) {
                // Only check triggers if stable
                // Actually, trigger happens when REBUILDING finishes? 
                // No, we need to detect the *moment* rebuilding finishes.
                // But update() sets it to NONE immediately. 
                // We'll rely on handleTroopArrival to start the process.
                // The Victory/Defeat should trigger when the tower FLIPS owner.
                // Which happens at the bottom of the slump (COLLAPSING -> REBUILDING).

                // Wait, if we trigger Victory instantly when it flips (at scale 0), 
                // the user won't see the rebuild animation.
                // We should trigger Victory when Rebuild completes?
                // Let's check logic below.
            }

            // Hacky check: we need to know when an animation *just* finished
            // Ideally Tower emits an event, but let's poll here.

            // Actually, we can check checking the game over condition constantly
            // But we only want to show the screen once.
        });

        // Logic for Delayed Game Over
        // We do this by checking if any Master tower has changed hands fully (is stable and wrong owner)
        // But we need to make sure we don't trigger while it's animating.

        // Note: The original map has specific indices for master towers? 
        // Better to check by ID or just logic.
        // If Player Master is missing (Captured by Enemy -> Owner 2)
        // Wait... "isMaster" property stays true.
        // So we look for: Is there a Master Tower owned by Player?

        // Actually, simpler:
        // When capture happens (in update loop logic inside Tower?), we set flags.
        // But Tower is an Entity, doesn't know about Game rules.

        // Let's refine:
        // We iterate towers. If we find a Master Tower that WAS player and is NOW enemy, and animation is done...
        // Use a flag in GameManager? "isGameOver".

        // Let's stick to the previous plan: Trigger in update when scale reaches 1 if we can. 
        // Simpler: Check if ALL master towers of a team are gone?
        // Or specific one? We only have 1 master per side usually.
        // Let's assume 1 vs 1.

        const hasPlayerMaster = this.towers.some(t => t.isMaster && t.ownerId === 1);
        const hasEnemyMaster = this.towers.some(t => t.isMaster && t.ownerId === 2);

        // We only trigger game over if animation is NOT playing on them?
        // If a tower is swapping, it has `ownerId` flipped at scale 0.
        // So `hasPlayerMaster` will become false halfway through animation.
        // If we trigger then, we miss the rebuild.

        // We need to wait until no master towers are 'REBUILDING' or 'COLLAPSING'.
        const busy = this.towers.some(t => t.isMaster && t.captureState !== 'NONE');

        if (!busy) {
            if (!hasPlayerMaster && !this.uiOverlay.innerHTML.includes("DEFEAT")) {
                this.handleDefeat();
            } else if (!hasEnemyMaster && !this.uiOverlay.innerHTML.includes("VICTORY")) {
                this.handleVictory();
            }
        }


        for (let i = this.troops.length - 1; i >= 0; i--) {
            const troop = this.troops[i];
            troop.update(dt);

            if (troop.hasArrived) {
                this.handleTroopArrival(troop);
                this.troops.splice(i, 1);
            }
        }
    }

    private handleTroopArrival(troop: Troop) {
        const target = troop.targetTower;
        // Interaction Logic
        if (target.ownerId === troop.ownerId) {
            // Reinforce
            // If animating, do we add units? Maybe not? 
            if (target.captureState === 'NONE') {
                target.addUnits(1);
            }
        } else {
            // Attack
            if (target.captureState === 'NONE') {
                target.removeUnits(1);
                if (target.unitCount < 0) {
                    target.unitCount = Math.abs(target.unitCount);

                    // Capture!
                    const newOwner = troop.ownerId;

                    if (target.isMaster) {
                        // Master Tower Animation Trigger
                        target.captureState = 'COLLAPSING';
                        target.pendingOwner = newOwner;
                        // Owner doesn't change yet!
                    } else {
                        // Normal Capture
                        target.ownerId = newOwner;
                    }
                }
            }
        }
    }

    private handleVictory() {
        this.loop.stop();
        this.currentRound++;

        this.uiOverlay.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px; color: #4facfe; text-shadow: 0 0 10px #4facfe;">VICTORY!</h1>
            <p style="font-size: 24px;">Level ${this.currentRound - 1} Complete</p>
            <button id="nextBtn" style="
                margin-top: 30px; 
                padding: 15px 30px; 
                font-size: 24px; 
                background: #4facfe; 
                border: none; 
                color: white; 
                border-radius: 8px; 
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(79, 172, 254, 0.4);
            ">Next Level</button>
        `;
        this.uiOverlay.style.display = 'flex';

        if (this.currentRound > this.maxRounds) {
            this.uiOverlay.innerHTML = `<h1>CAMPAIGN MASTER!</h1><button id="nextBtn">Restart Campaign</button>`;
            this.currentRound = 1;
        }

        const btn = this.uiOverlay.querySelector('#nextBtn');
        if (btn) btn.addEventListener('click', () => {
            this.loadLevel(this.currentRound);
        });
    }

    private handleDefeat() {
        this.loop.stop();

        this.uiOverlay.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px; color: #ff0844; text-shadow: 0 0 10px #ff0844;">DEFEAT!</h1>
            <p style="font-size: 24px;">Your Master Tower has fallen.</p>
            <button id="retryBtn" style="
                margin-top: 30px; 
                padding: 15px 30px; 
                font-size: 24px; 
                background: #ff0844; 
                border: none; 
                color: white; 
                border-radius: 8px; 
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(255, 8, 68, 0.4);
            ">Retry Level</button>
        `;
        this.uiOverlay.style.display = 'flex';

        const btn = this.uiOverlay.querySelector('#retryBtn');
        if (btn) btn.addEventListener('click', () => {
            this.loadLevel(this.currentRound);
        });
    }

    private draw() {
        this.renderer.clear();

        // Draw Lanes (Curved)
        this.renderer.ctx.lineWidth = 10;
        this.renderer.ctx.lineCap = 'round';

        const drawnConnections = new Set<string>();

        this.towers.forEach(t => {
            t.neighbors.forEach(n => {
                const key = [t.id, n.id].sort().join('-');

                if (!drawnConnections.has(key)) {
                    drawnConnections.add(key);

                    // Fixed Curve Logic (deterministic based on IDs)
                    const dx = n.x - t.x;
                    const dy = n.y - t.y;
                    const cx = (t.x + n.x) / 2;
                    const cy = (t.y + n.y) / 2;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Generate a "seed" from IDs (String Hash)
                    let hash = 0;
                    const str = key; // key is sorted ID combination
                    for (let i = 0; i < str.length; i++) {
                        hash = (hash << 5) - hash + str.charCodeAt(i);
                        hash |= 0; // Convert to 32bit integer
                    }

                    // Use hash to determine direction
                    const dir = (Math.abs(hash) % 2 === 0) ? 1 : -1;

                    const offset = 40 * dir;
                    const px = -dy / dist;
                    const py = dx / dist;
                    const cpX = cx + px * offset;
                    const cpY = cy + py * offset;

                    this.renderer.ctx.beginPath();
                    this.renderer.ctx.moveTo(t.x, t.y);
                    this.renderer.ctx.quadraticCurveTo(cpX, cpY, n.x, n.y);
                    this.renderer.ctx.strokeStyle = '#333';
                    this.renderer.ctx.lineWidth = 8;
                    this.renderer.ctx.stroke();

                    // Road Markings (Dashed)
                    this.renderer.ctx.strokeStyle = '#555';
                    this.renderer.ctx.lineWidth = 2;
                    this.renderer.ctx.setLineDash([10, 15]);
                    this.renderer.ctx.stroke();
                    this.renderer.ctx.setLineDash([]);
                }
            });
        });

        // Draw Drag Lines
        if (this.isDragging && this.dragLine && this.selectedTowers.length > 0) {
            this.renderer.ctx.save();
            this.renderer.ctx.lineWidth = 4;
            this.renderer.ctx.lineCap = 'round';
            this.renderer.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.selectedTowers.forEach(source => {
                this.renderer.ctx.beginPath();
                this.renderer.ctx.moveTo(source.x, source.y);
                this.renderer.ctx.lineTo(this.dragLine!.x, this.dragLine!.y);
                this.renderer.ctx.stroke();
            });
            this.renderer.ctx.restore();
        }

        // Highlight Selected
        this.selectedTowers.forEach(t => {
            this.renderer.drawStrokeCircle(t.x, t.y, t.radius + 5, 'yellow', 4);
        });

        // Entities
        this.towers.forEach(t => t.draw(this.renderer, this.assets));
        this.troops.forEach(t => t.draw(this.renderer, this.assets));

        // Draw HUD
        this.renderer.drawText(window.innerWidth / 2, 50, `Round ${this.currentRound} / ${this.maxRounds}`, '#fff', 30);
    }
}
