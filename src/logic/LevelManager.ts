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
        const h = window.innerHeight;

        let towers: TowerConfig[] = [];
        let connections: [number, number][] = [];

        // Helper to add symmetrical connections
        const connect = (i: number, j: number) => connections.push([i, j]);

        if (round === 1) {
            // LEVEL 1: The Duel (1v1 Line)
            towers = [
                { x: cx, y: h - 150, owner: 1, units: 30, isMaster: true }, // Player
                { x: cx, y: 150, owner: 2, units: 30, isMaster: true },     // Enemy
                { x: cx, y: h / 2, owner: 0, units: 10, isMaster: false }   // Middle
            ];
            connections = [[0, 2], [2, 1]];
        } else if (round === 2) {
            // LEVEL 2: The Triangle
            towers = [
                { x: cx, y: h - 150, owner: 1, units: 40, isMaster: true }, // Player
                { x: cx, y: 150, owner: 2, units: 40, isMaster: true },     // Enemy
                { x: cx - 200, y: h / 2, owner: 0, units: 15, isMaster: false },
                { x: cx + 200, y: h / 2, owner: 0, units: 15, isMaster: false }
            ];
            // Diamond shape
            connections = [[0, 2], [0, 3], [2, 1], [3, 1], [2, 3]];
        } else if (round === 3) {
            // LEVEL 3: The Cross
            towers = [
                { x: cx, y: h - 100, owner: 1, units: 50, isMaster: true },
                { x: cx, y: 100, owner: 2, units: 50, isMaster: true },
                { x: cx, y: cy, owner: 0, units: 20, isMaster: false },
                { x: cx - 250, y: cy, owner: 0, units: 30, isMaster: false }, // Valuable flank
                { x: cx + 250, y: cy, owner: 0, units: 30, isMaster: false }
            ];
            connections = [[0, 2], [2, 1], [2, 3], [2, 4], [0, 3], [0, 4], [1, 3], [1, 4]];
        } else if (round === 4) {
            // LEVEL 4: The Zig Zag
            towers = [
                { x: cx, y: h - 100, owner: 1, units: 60, isMaster: true },
                { x: cx, y: 100, owner: 2, units: 60, isMaster: true },
                { x: cx - 150, y: h - 250, owner: 0, units: 20, isMaster: false },
                { x: cx + 150, y: cy, owner: 0, units: 20, isMaster: false },
                { x: cx - 150, y: 250, owner: 0, units: 20, isMaster: false }
            ];
            connections = [[0, 2], [2, 3], [3, 4], [4, 1], [0, 3], [1, 3]];
        } else if (round === 5) {
            // LEVEL 5: The Circle of Death
            towers.push({ x: cx, y: h - 150, owner: 1, units: 60, isMaster: true });
            towers.push({ x: cx, y: 150, owner: 2, units: 60, isMaster: true });

            const radius = 250;
            for (let i = 0; i < 6; i++) {
                const ang = (Math.PI * 2 / 6) * i;
                towers.push({
                    x: cx + Math.cos(ang) * radius,
                    y: cy + Math.sin(ang) * radius,
                    owner: 0,
                    units: 25,
                    isMaster: false
                });
            }
            // Connect Ring
            connect(2, 3); connect(3, 4); connect(4, 5); connect(5, 6); connect(6, 7); connect(7, 2);
            // Connect Masters
            connect(0, 3); connect(0, 4); // Player to bottom ring
            connect(1, 6); connect(1, 7); // Enemy to top ring (approx)
            connect(2, 5); // Cross cut
        }
        else {
            // 6-20: Deterministic Procedural
            // We pass 'round' to ensure it's the same every time 
            return this.generateProcedural(round);
        }

        return { round, towers, connections };
    }

    private static generateProcedural(round: number): LevelConfig {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const towers: TowerConfig[] = [];
        const connections: [number, number][] = [];

        // --- 1. Master Towers ---
        towers.push({ x: cx, y: window.innerHeight - 100, owner: 1, units: 50, isMaster: true });
        towers.push({ x: cx, y: 100, owner: 2, units: 30 + round * 5, isMaster: true });

        // --- 2. Neutral Towers ---
        const rings = 1 + Math.floor(round / 4);
        for (let r = 0; r < rings; r++) {
            const radius = 200 + (r * 150);
            const count = 4 + r * 2;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                towers.push({
                    x: cx + Math.cos(angle) * radius,
                    y: cy + Math.sin(angle) * radius,
                    owner: 0,
                    units: 10 + round * 2,
                    isMaster: false
                });
            }
        }

        // --- 3. Connections ---
        for (let i = 0; i < towers.length; i++) {
            for (let j = i + 1; j < towers.length; j++) {
                const dx = towers[i].x - towers[j].x;
                const dy = towers[i].y - towers[j].y;
                if (Math.sqrt(dx * dx + dy * dy) < 350) connections.push([i, j]);
            }
        }

        return { round, towers, connections };
    }
}
