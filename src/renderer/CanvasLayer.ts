export class CanvasLayer {
    private canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;

    constructor(container: HTMLElement) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
        container.appendChild(this.canvas);
        this.resize();

        window.addEventListener('resize', () => this.resize());
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        // Draw background
        this.ctx.fillStyle = '#1e1e1e';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawCircle(x: number, y: number, radius: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawStrokeCircle(x: number, y: number, radius: number, color: string, lineWidth: number = 2) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawText(x: number, y: number, text: string, color: string = '#fff', fontSize: number = 20) {
        this.ctx.fillStyle = color;
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x, y);
    }

    drawLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number = 2) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }
}
