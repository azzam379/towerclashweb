export abstract class Entity {
    public id: string = crypto.randomUUID();

    public x: number;
    public y: number;
    public radius: number;

    constructor(x: number, y: number, radius: number) {
        this.id = crypto.randomUUID();
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    abstract update(dt: number): void;
    abstract draw(ctx: any): void; // We'll pass the wrapper or context
}
