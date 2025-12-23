import './style.css'
import { GameManager } from './logic/GameManager'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="game-container"></div>
`

const container = document.getElementById('game-container');
if (container) {
  const game = new GameManager(container);
  game.start();
}