// src/renderer.js

const INNER = 13; // interior width of card box
const SEP   = '─'.repeat(INNER);

function stars(power) {
  const n = Math.min(Math.max(power, 0), 5);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function center(s) {
  const pad = Math.max(0, INNER - s.length);
  const l   = Math.floor(pad / 2);
  return ' '.repeat(l) + s + ' '.repeat(pad - l);
}

// 4 art lines per card (strings; will be centered in INNER chars)
const CARD_ART = {
  'forest-elf':    [ 'O',        '/|\\',     '>+---->', '/ \\'       ],
  'stone-golem':   [ '[#####]',  '|#   #|',  '|# X #|', '[#####]'   ],
  'fire-drake':    [ '/\\_/\\',  '( ^ ^ )',  '> ~~~ <', '/|___|\\' ],
  'shadow-wolf':   [ '/\\ /\\',  '( o  o )', ' \\~~/ ', ' v--v '    ],
  'iron-knight':   [ '[_____]',  '| [+] |',  '||   ||', '[=====]'   ],
  'fireball':      [ '* . * . *','  \\|/ ',  ' FIRE ', '  /|\\ '    ],
  'lightning':     [ '###\\',    '   \\\\',  '  ////', '###/'       ],
  'healing-herb':  [ '( ) ( )',  ' \\||| ',  '  |||  ', ' _|||_ '   ],
  'plague-mist':   [ '~~ ~~ ~~', ' ~~~~~~ ', '~*~~~~*', ' ~~~~~~ '  ],
  'war-cry':       [ '! ! ! !',  ' !!!!!! ', '!+RAGE+!', ' !!!!!! ' ],
};

const FALLBACK_ART = {
  creature: [ '/\\_/\\', '( o o )', ' > - < ', '\\_____/' ],
  spell:    [ '* * * *', ' *   * ', '*     *', ' * * * ' ],
};

export function renderCard(card) {
  const art = CARD_ART[card.id] ?? FALLBACK_ART[card.type] ?? ['', '', '', ''];

  // Name line: 1 space + name padded to fill INNER
  const nameLine = ` ${card.name.slice(0, INNER - 1).padEnd(INNER - 1)}`;

  // Stats / info line
  let infoLine;
  if (card.type === 'creature') {
    const pw = String(card.currentPower    ?? card.power    ?? 0);
    const th = String(card.currentToughness ?? card.toughness ?? 0);
    infoLine = ` ${stars(card.currentPower ?? card.power ?? 0)} ${pw}/${th}`.padEnd(INNER);
  } else {
    const fx = card.damage ? `-${card.damage} HP`
      : card.heal          ? `+${card.heal} HP`
      : card.aoe           ? `aoe -${card.aoe}`
      : card.buff          ? `+${card.buff} PWR`
      : '???';
    infoLine = ` SPELL  ${fx}`.padEnd(INNER);
  }

  return [
    `┌${SEP}┐`,
    `│${nameLine}│`,
    `├${SEP}┤`,
    `│${center(art[0])}│`,
    `│${center(art[1])}│`,
    `│${center(art[2])}│`,
    `│${center(art[3])}│`,
    `├${SEP}┤`,
    `│${infoLine}│`,
    `└${SEP}┘`,
  ].join('\n');
}

export function renderHandCard(card, index) {
  if (card.type === 'creature') {
    return `[${index + 1}] ${card.name} ${card.power}/${card.toughness}`;
  }
  const fx = card.damage ? `-${card.damage}HP`
    : card.heal          ? `+${card.heal}HP`
    : card.aoe           ? `AOE-${card.aoe}`
    : card.buff          ? `+${card.buff}PWR`
    : '?';
  return `[${index + 1}] ${card.name} (${fx})`;
}

export function renderBoard(state) {
  document.getElementById('enemy-hp').textContent   = `♥ ${state.ai.hp} HP  [ENEMY]`;
  document.getElementById('player-hp').textContent  = `♥ ${state.player.hp} HP  [YOU]`;
  document.getElementById('turn-num').textContent   = `TURN ${state.turn}`;

  document.getElementById('ai-hand').textContent =
    `AI HAND: ${state.ai.hand.length > 0
      ? '[■] '.repeat(state.ai.hand.length).trim()
      : '(empty)'}`;

  renderZone('ai-board',     state.ai.board,     false);
  renderZone('player-board', state.player.board, true);
  renderPlayerHand(state.player.hand);

  const phaseLabels = {
    play:     'PHASE: Play cards',
    attack:   'PHASE: Declare attackers',
    'ai-turn':'PHASE: AI thinking...',
    gameover: 'GAME OVER',
  };
  document.getElementById('phase-label').textContent = phaseLabels[state.phase] ?? '';

  const overlay = document.getElementById('gameover-overlay');
  if (state.phase === 'gameover') {
    overlay.style.display = 'flex';
    const msg = document.getElementById('gameover-msg');
    msg.textContent = state.winner === 'player' ? 'YOU WIN' : 'YOU LOSE';
    msg.style.color = state.winner === 'player' ? '#ddd5c5' : '#c86858';
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

  const cardLines = cards.map(c => renderCard(c).split('\n'));
  const height    = cardLines[0].length;
  const rows      = [];
  for (let row = 0; row < height; row++) {
    rows.push(cardLines.map(cl => cl[row]).join('  '));
  }

  if (selectable) {
    // Index labels below player cards; each card is (INNER+2) chars wide
    const cardW = INNER + 2;
    const labels = cards.map((_, i) => `[${i + 1}]`.padEnd(cardW)).join('  ');
    rows.push(labels);
  }

  el.textContent = rows.join('\n');
}

function renderPlayerHand(hand) {
  const el = document.getElementById('player-hand');
  if (hand.length === 0) {
    el.textContent = 'YOUR HAND: (empty)';
    return;
  }
  el.textContent = `YOUR HAND:  ${hand.map((c, i) => renderHandCard(c, i)).join('   ')}`;
}

export function appendLog(message) {
  const log  = document.getElementById('game-log');
  const line = document.createElement('div');
  line.textContent = `> ${message}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}
