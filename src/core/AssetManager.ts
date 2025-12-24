export class AssetManager {
    public images: Record<string, HTMLImageElement> = {};

    constructor() { }

    async loadAll(): Promise<void> {
        const assets = [
            'master_tower_blue',
            'master_tower_red',
            'tower_blue',
            'tower_red',
            'tower_grey'
        ];

        const promises = assets.map(name => {
            return new Promise<void>((resolve) => {
                const img = new Image();
                img.src = `/assets/${name}.png`; // Assumes files are in public/assets/
                img.onload = () => {
                    this.images[name] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load asset: ${name}`);
                    // Fallback or reject? Let's resolve to allow game to start with missing assets (check logic later)
                    resolve();
                };
            });
        });

        await Promise.all(promises);
    }

    getImage(name: string): HTMLImageElement | undefined {
        return this.images[name];
    }
}
