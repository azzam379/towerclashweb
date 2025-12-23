export abstract class Entity {
    public id: string = crypto.randomUUID();

    constructor(
        public x: number,
        public y: number,
        public radius: number
    ) { }

    abstract update(dt: number): void;
    abstract draw(ctx: any): void; // We'll pass the wrapper or context
}
