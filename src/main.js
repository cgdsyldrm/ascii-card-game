// src/main.js
import { GameEngine } from './game.js';
import { AIPlayer } from './ai.js';
import { renderBoard, appendLog } from './renderer.js';

const game = new GameEngine();
const aiPlayer = new AIPlayer();
const cmdInput = document.getElementById('cmd');

// ── Wire state changes ──────────────────────────────────────────────
game.onStateChange = (state) => {
  renderBoard(state);
  const newEntries = state.log.slice(window._logLength ?? 0);
  for (const entry of newEntries) appendLog(entry);
  window._logLength = state.log.length;

  if (state.phase === 'ai-turn') {
    cmdInput.disabled = true;
    setTimeout(() => runAITurn(game.getState()), 700);
  } else {
    cmdInput.disabled = false;
    cmdInput.focus();
  }
};

// ── AI Turn Orchestration ───────────────────────────────────────────
function runAITurn(state) {
  if (state.phase === 'gameover') return;

  game.aiDraw();
  const currentState = game.getState();
  const actions = aiPlayer.takeTurn(currentState);

  for (const action of actions) {
    if (game.getState().phase === 'gameover') break;

    if (action.type === 'PLAY') {
      game.aiPlayCard(action.payload);
    } else if (action.type === 'ATTACK') {
      const attackerIds = action.payload;
      const attackers = game.getState().ai.board.filter(c => attackerIds.includes(c.instanceId));
      if (attackers.length === 0) continue;
      const blockerMap = assignPlayerBlockers(game.getState(), attackerIds);
      game.resolveAICombat(attackers, blockerMap);
    }
  }

  if (game.getState().phase !== 'gameover') {
    game.advanceToPlayerTurn();
  }
}

// Player auto-blocks against AI (highest toughness blocks highest power attacker)
function assignPlayerBlockers(state, aiAttackerIds) {
  const attackers = aiAttackerIds
    .map(id => state.ai.board.find(c => c.instanceId === id))
    .filter(Boolean)
    .sort((a, b) => (b.currentPower ?? 0) - (a.currentPower ?? 0));

  const blockers = [...state.player.board]
    .sort((a, b) => (b.currentToughness ?? 0) - (a.currentToughness ?? 0));

  const map = {};
  for (let i = 0; i < attackers.length; i++) {
    map[attackers[i].instanceId] = blockers[i]?.instanceId ?? null;
  }
  return map;
}

// ── Command Parser ──────────────────────────────────────────────────
cmdInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const raw = cmdInput.value.trim();
  cmdInput.value = '';

  const state = game.getState();

  // Game over: any Enter restarts
  if (state.phase === 'gameover') {
    window._logLength = 0;
    document.getElementById('game-log').innerHTML = '';
    game.startGame();
    return;
  }

  if (!raw) return;

  const [cmd, ...args] = raw.toLowerCase().split(/\s+/);

  switch (cmd) {
    case 'help':
      appendLog('Commands:');
      appendLog('  play <n>         — play card #n from your hand');
      appendLog('  attack <n> [n…]  — attack with creature(s) #n');
      appendLog('  end              — end your turn');
      appendLog('  help             — show this message');
      break;

    case 'play': {
      const idx = parseInt(args[0], 10) - 1;
      const hand = state.player.hand;
      if (isNaN(idx) || idx < 0 || idx >= hand.length) {
        appendLog(`Invalid card. Your hand has ${hand.length} card(s).`);
        break;
      }
      if (state.phase !== 'play') {
        appendLog('You can only play cards during the play phase.');
        break;
      }
      game.playCard(hand[idx].instanceId);
      break;
    }

    case 'attack': {
      if (state.phase !== 'attack') {
        appendLog('Type "end" first to move to the attack phase, or you may already be past it.');
        break;
      }
      if (args.length === 0) {
        appendLog('Usage: attack <n> [n…]  e.g. "attack 1 2"');
        break;
      }
      const board = state.player.board;
      const indices = args.map(s => parseInt(s, 10) - 1);
      const valid = indices.filter(i => i >= 0 && i < board.length);
      if (valid.length === 0) {
        appendLog(`No valid creatures. Your board has ${board.length} creature(s).`);
        break;
      }
      const attackerIds = valid.map(i => board[i].instanceId);
      const attackers = game.declareAttack(attackerIds);
      const blockerMap = aiPlayer.assignBlockers(game.getState(), attackerIds);
      game.resolveCombat(attackers, blockerMap);
      if (game.getState().phase !== 'gameover') {
        game.endTurn();
      }
      break;
    }

    case 'end':
      if (state.phase !== 'play' && state.phase !== 'attack') {
        appendLog('Nothing to end right now.');
        break;
      }
      game.endTurn();
      break;

    default:
      appendLog(`Unknown command: "${raw}". Type "help" for commands.`);
  }
});

// ── Start ───────────────────────────────────────────────────────────
window._logLength = 0;
game.startGame();
appendLog('Type "help" for available commands.');

// Re-focus input whenever the page regains focus or a key is pressed
window.addEventListener('focus', () => cmdInput.focus());
document.addEventListener('click', () => cmdInput.focus());
document.addEventListener('keydown', (e) => {
  if (document.activeElement !== cmdInput) cmdInput.focus();
});
