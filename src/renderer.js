// src/renderer.js

function stars(power) {
  const count = Math.min(power, 5);
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

export function renderCard(card) {
  // Returns a multi-line ASCII art string for a creature card
  const name1 = card.name.slice(0, 9).padEnd(9);
  const name2 = card.name.length > 9 ? card.name.slice(9, 18).padEnd(9) : '         ';
  const pw = String(card.currentPower ?? card.power ?? 0).padStart(2);
  const th = String(card.currentToughness ?? card.toughness ?? 0).padEnd(2);
  return [
    '┌─────────┐',
    `│${name1}│`,
    `│${name2}│`,
    `│  ${stars(card.currentPower ?? card.power ?? 0)}  │`,
    `│         │`,
    '├─────────┤',
    `│ ${pw} / ${th} │`,   // single-space padding = 9 chars interior (matches card width)
    '└─────────┘',
  ].join('\n');
}

export function renderHandCard(card, index) {
  if (card.type === 'creature') {
    return `[${index + 1}: ${card.name} ${card.power}/${card.toughness}]`;
  }
  const effect = card.damage ? `-${card.damage}HP`
    : card.heal ? `+${card.heal}HP`
    : card.aoe  ? `AOE-${card.aoe}`
    : card.buff ? `+${card.buff}PWR`
    : '?';
  return `[${index + 1}: ${card.name} (${effect})]`;
}

export function renderBoard(state) {
  // --- Header ---
  document.getElementById('ai-hp').textContent = `♥ ${state.ai.hp} HP`;
  document.getElementById('player-hp').textContent = `♥ ${state.player.hp} HP`;
  document.getElementById('turn-num').textContent = `TURN ${state.turn}`;

  // --- AI hand (hidden, show count) ---
  document.getElementById('ai-hand').textContent =
    `AI HAND: ${state.ai.hand.length > 0 ? '[■] '.repeat(state.ai.hand.length).trim() : '(empty)'}`;

  // --- AI board ---
  renderZone('ai-board', state.ai.board, false);

  // --- Player board ---
  renderZone('player-board', state.player.board, true);

  // --- Player hand ---
  renderPlayerHand(state.player.hand, state.phase);

  // --- Phase label ---
  const phaseLabels = {
    play:     'PHASE: Play cards',
    attack:   'PHASE: Declare attackers',
    'ai-turn':'PHASE: AI thinking...',
    gameover: `GAME OVER — ${state.winner === 'player' ? 'YOU WIN!' : 'YOU LOSE!'}`,
  };
  document.getElementById('phase-label').textContent = phaseLabels[state.phase] ?? '';

  // --- Buttons ---
  updateButtons(state.phase);

  // --- Game over overlay ---
  const overlay = document.getElementById('gameover-overlay');
  if (state.phase === 'gameover') {
    overlay.style.display = 'flex';
    document.getElementById('gameover-msg').textContent =
      state.winner === 'player' ? '⚔ YOU WIN ⚔' : '☠ YOU LOSE ☠';
  } else {
    overlay.style.display = 'none';
  }
}

function renderZone(elementId, cards, selectable) {
  const el = document.getElementById(elementId);
  if (cards.length === 0) {
    el.textContent = '(empty)';
    return;
  }
  // Render cards side by side by splitting each card into lines and zip-merging
  const cardLines = cards.map(c => renderCard(c).split('\n'));
  const height = cardLines[0].length;
  const rows = [];
  for (let row = 0; row < height; row++) {
    rows.push(cardLines.map(cl => cl[row]).join('  '));
  }

  if (selectable) {
    // Add index labels below for player board
    const labels = cards.map((c, i) => `[${i + 1}]`.padEnd(11)).join('  ');
    rows.push(labels);
  }

  el.textContent = rows.join('\n');
}

function renderPlayerHand(hand, phase) {
  const el = document.getElementById('player-hand');
  if (hand.length === 0) {
    el.textContent = 'YOUR HAND: (empty)';
    return;
  }
  const cards = hand.map((c, i) => renderHandCard(c, i)).join('  ');
  el.textContent = `YOUR HAND: ${cards}`;
}

function updateButtons(phase) {
  document.getElementById('btn-play').disabled   = phase !== 'play';
  document.getElementById('btn-attack').disabled = phase !== 'attack';
  document.getElementById('btn-endturn').disabled = phase !== 'play' && phase !== 'attack';
}

export function appendLog(message) {
  const log = document.getElementById('game-log');
  const line = document.createElement('div');
  line.textContent = `> ${message}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}
