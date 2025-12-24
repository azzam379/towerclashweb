import { Tower } from '../entities/Tower';
import { GameManager } from './GameManager';

export class Bot {
    private timer: number = 0;
    private actionInterval: number = 2.0; // Acts every 2 seconds

    private game: GameManager;
    private myId: number;

    constructor(
        game: GameManager,
        myId: number
    ) {
        this.game = game;
        this.myId = myId;
    }

    update(dt: number) {
        this.timer += dt;
        if (this.timer >= this.actionInterval) {
            this.act();
            this.timer = 0;
            // Randomize next interval slightly to feel organic
            this.actionInterval = 2.0 + Math.random() * 2.0;
        }
    }

    private act() {
        const myTowers = this.game.getTowersByOwner(this.myId);
        if (myTowers.length === 0) return;

        // Filter towers that have enough units to attack
        const capableTowers = myTowers.filter(t => t.unitCount > 10);
        if (capableTowers.length === 0) return;

        // Pick a random source
        const source = capableTowers[Math.floor(Math.random() * capableTowers.length)];

        // Pick a target
        // AI Update: Only attack neighbors!
        const targets = source.neighbors;
        if (targets.length === 0) return;

        // Simple Heuristic:
        // 50% chance to attack weak neutral/enemy
        // 30% chance to reinforce weak self
        // 20% random
        const roll = Math.random();
        let target: Tower | null = null;

        if (roll < 0.5) {
            // Find weakest enemy/neutral
            target = targets
                .filter(t => t.ownerId !== this.myId)
                .sort((a, b) => a.unitCount - b.unitCount)[0];
        } else if (roll < 0.8) {
            // Find weakest self to reinforce
            target = targets
                .filter(t => t.ownerId === this.myId)
                .sort((a, b) => a.unitCount - b.unitCount)[0];
        }

        // Fallback to random if no specific target found or rolled high
        if (!target) {
            target = targets[Math.floor(Math.random() * targets.length)];
        }

        // Execute command via GameManager
        this.game.sendTroops(source, target);
    }
}
