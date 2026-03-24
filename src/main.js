// src/main.js
import { GameEngine } from './game.js';
import { AIPlayer } from './ai.js';
import { renderBoard, appendLog } from './renderer.js';

const game = new GameEngine();
const aiPlayer = new AIPlayer();

// ── Wire state changes ──────────────────────────────────────────────
game.onStateChange = (state) => {
  renderBoard(state);
  // Append any new log entries since last render
  const newEntries = state.log.slice(window._logLength ?? 0);
  for (const entry of newEntries) appendLog(entry);
  window._logLength = state.log.length;

  // Trigger AI turn automatically
  if (state.phase === 'ai-turn') {
    setTimeout(() => runAITurn(game.getState()), 600);
  }
};

// ── AI Turn Orchestration ───────────────────────────────────────────
function runAITurn(state) {
  if (state.phase === 'gameover') return;

  // AI draws a card
  game.aiDraw();
  const currentState = game.getState();

  // AI decides actions
  const actions = aiPlayer.takeTurn(currentState);

  for (const action of actions) {
    if (game.getState().phase === 'gameover') break;

    if (action.type === 'PLAY') {
      game.aiPlayCard(action.payload);
    } else if (action.type === 'ATTACK') {
      const attackerIds = action.payload;
      const attackers = game.getState().ai.board.filter(c => attackerIds.includes(c.instanceId));
      if (attackers.length === 0) continue;

      // Player auto-blocks with greedy algorithm (highest toughness vs highest power)
      const blockerMap = assignPlayerBlockers(game.getState(), attackerIds);
      game.resolveAICombat(attackers, blockerMap);
    }
  }

  if (game.getState().phase !== 'gameover') {
    game.advanceToPlayerTurn();
  }
}

// Player blocking against AI: greedy (highest toughness blocks highest power attacker)
function assignPlayerBlockers(state, aiAttackerIds) {
  const attackers = aiAttackerIds
    .map(id => state.ai.board.find(c => c.instanceId === id))
    .filter(Boolean)
    .sort((a, b) => (b.currentPower ?? 0) - (a.currentPower ?? 0));

  const blockers = [...state.player.board].sort((a, b) => (b.currentToughness ?? 0) - (a.currentToughness ?? 0));

  const map = {};
  for (let i = 0; i < attackers.length; i++) {
    map[attackers[i].instanceId] = blockers[i]?.instanceId ?? null;
  }
  return map;
}

// ── Button Handlers ─────────────────────────────────────────────────
document.getElementById('btn-play').addEventListener('click', () => {
  const input = document.getElementById('input-card').value.trim();
  const idx = parseInt(input, 10) - 1;
  const hand = game.getState().player.hand;
  if (isNaN(idx) || idx < 0 || idx >= hand.length) {
    appendLog('Invalid card number.');
    return;
  }
  game.playCard(hand[idx].instanceId);
  document.getElementById('input-card').value = '';
});

document.getElementById('btn-attack').addEventListener('click', () => {
  const input = document.getElementById('input-attack').value.trim();
  if (!input) {
    appendLog('Enter creature numbers to attack with (e.g. "1,2").');
    return;
  }
  const indices = input.split(',').map(s => parseInt(s.trim(), 10) - 1);
  const board = game.getState().player.board;
  const valid = indices.filter(i => i >= 0 && i < board.length);
  if (valid.length === 0) {
    appendLog('No valid creatures selected.');
    return;
  }
  const attackerIds = valid.map(i => board[i].instanceId);
  const attackers = game.declareAttack(attackerIds);
  const blockerMap = aiPlayer.assignBlockers(game.getState(), attackerIds);
  game.resolveCombat(attackers, blockerMap);

  if (game.getState().phase !== 'gameover') {
    game.endTurn(); // attack → ai-turn
  }
  document.getElementById('input-attack').value = '';
});

document.getElementById('btn-endturn').addEventListener('click', () => {
  game.endTurn();
});

document.getElementById('btn-restart').addEventListener('click', () => {
  window._logLength = 0;
  document.getElementById('game-log').innerHTML = '';
  game.startGame();
});

// ── Start ───────────────────────────────────────────────────────────
window._logLength = 0;
game.startGame();
