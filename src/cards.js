// src/cards.js

export const CARD_DEFINITIONS = [
  { id: 'forest-elf',   name: 'Forest Elf',   type: 'creature', power: 2, toughness: 2, flavor: 'Swift and silent.' },
  { id: 'stone-golem',  name: 'Stone Golem',  type: 'creature', power: 4, toughness: 5, flavor: 'Unmovable.' },
  { id: 'fire-drake',   name: 'Fire Drake',   type: 'creature', power: 5, toughness: 3, flavor: 'Burns all in its path.' },
  { id: 'shadow-wolf',  name: 'Shadow Wolf',  type: 'creature', power: 3, toughness: 1, flavor: 'Strikes from darkness.' },
  { id: 'iron-knight',  name: 'Iron Knight',  type: 'creature', power: 2, toughness: 4, flavor: 'Steadfast defender.' },
  { id: 'fireball',     name: 'Fireball',     type: 'spell',    damage: 3,              flavor: 'Direct. Decisive.' },
  { id: 'lightning',    name: 'Lightning',    type: 'spell',    damage: 2,              flavor: 'Speed of light.' },
  { id: 'healing-herb', name: 'Healing Herb', type: 'spell',    heal: 3,                flavor: 'Nature mends.' },
  { id: 'plague-mist',  name: 'Plague Mist',  type: 'spell',    aoe: 1,                 flavor: 'Touches all.' },
  { id: 'war-cry',      name: 'War Cry',      type: 'spell',    buff: 1,                flavor: 'Rally the troops.' },
];

let _deckCounter = 0;

export function createDeck() {
  const deckId = _deckCounter++; // unique per deck, prevents cross-deck instanceId collisions
  const deck = [];
  for (const def of CARD_DEFINITIONS) {
    for (let i = 0; i < 2; i++) {
      deck.push({ ...def, instanceId: `${deckId}-${def.id}-${i}` });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
