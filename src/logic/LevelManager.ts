export interface LevelConfig {
    round: number;
    towers: TowerConfig[];
    connections: [number, number][]; // Array of index pairs
}

export interface TowerConfig {
    x: number;
    y: number;
    owner: number; // 0: Neutral, 1: Player, 2: Enemy
    units: number;
    isMaster: boolean;
}

export class LevelManager {
    static getLevel(round: number): LevelConfig {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const towers: TowerConfig[] = [];
        const connections: [number, number][] = [];

        // Base Difficulty Settings
        // Round 1 -> 20: Increases tower count, enemy strength
        // const towerCount = Math.min(15, 6 + Math.floor(round / 2));
        const enemyUnits = 30 + (round * 5);

        // --- 1. Master Towers (Always present) ---
        // Player (Bottom)
        towers.push({ x: cx, y: window.innerHeight - 100, owner: 1, units: 50, isMaster: true });
        // Enemy (Top)
        towers.push({ x: cx, y: 100, owner: 2, units: enemyUnits, isMaster: true });

        // --- 2. Neutral Towers Layout ---
        const layoutType = round % 3; // 0: Ring, 1: Grid, 2: Random/Scattered

        if (layoutType === 0) {
            // RING LAYOUT
            const rings = 1 + Math.floor(round / 5);
            for (let r = 0; r < rings; r++) {
                const radius = 150 + (r * 120);
                const count = 4 + r * 2;
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i + (r % 2 === 0 ? Math.PI / 4 : 0);
                    towers.push({
                        x: cx + Math.cos(angle) * radius,
                        y: cy + Math.sin(angle) * radius,
                        owner: 0,
                        units: 10 + round * 2,
                        isMaster: false
                    });
                }
            }
        } else if (layoutType === 1) {
            // FLANK/GRID LAYOUT
            const rows = 2 + Math.floor(round / 6);
            const cols = 3;
            const stepY = (window.innerHeight - 300) / rows;
            const stepX = 200;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    // Skip center column sometimes for "lanes" feel, but keep for now
                    const x = cx + (c - 1) * stepX;
                    const y = 200 + r * stepY;
                    towers.push({
                        x: x,
                        y: y,
                        owner: 0,
                        units: 10 + round * 2,
                        isMaster: false
                    });
                }
            }
        } else {
            // RANDOMISH SCATTER (with symmetry)
            const count = 5 + round;
            for (let i = 0; i < count; i++) {
                const xOff = (Math.random() - 0.5) * (window.innerWidth - 200);
                const yOff = (Math.random() - 0.5) * (window.innerHeight - 400);
                towers.push({
                    x: cx + xOff,
                    y: cy + yOff,
                    owner: 0,
                    units: 10,
                    isMaster: false
                });
            }
        }

        // --- 3. Connections (Proximity Base) ---
        // Connect towers if close enough to form a graph
        // This is a naive way, but works for procedural generation
        for (let i = 0; i < towers.length; i++) {
            for (let j = i + 1; j < towers.length; j++) {
                const t1 = towers[i];
                const t2 = towers[j];
                const dx = t1.x - t2.x;
                const dy = t1.y - t2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Max connection distance
                if (dist < 320) {
                    connections.push([i, j]);
                }
            }
        }

        // Ensure Master Towers are connected to SOMETHING
        // Player (0) and Enemy (1) must have neighbors.
        // If not, find closest and force connect
        [0, 1].forEach(masterIdx => {
            const hasConnection = connections.some(c => c[0] === masterIdx || c[1] === masterIdx);
            if (!hasConnection && towers.length > 2) {
                // Find closest
                let closestIdx = -1;
                let minD = Infinity;
                for (let i = 2; i < towers.length; i++) {
                    const dx = towers[masterIdx].x - towers[i].x;
                    const dy = towers[masterIdx].y - towers[i].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < minD) {
                        minD = d;
                        closestIdx = i;
                    }
                }
                if (closestIdx !== -1) {
                    connections.push([masterIdx, closestIdx]);
                }
            }
        });

        return { round, towers, connections };
    }
}
