// test/cards.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CARD_DEFINITIONS, createDeck } from '../src/cards.js';

describe('CARD_DEFINITIONS', () => {
  it('has exactly 10 unique cards', () => {
    assert.equal(CARD_DEFINITIONS.length, 10);
  });

  it('each creature has power and toughness', () => {
    const creatures = CARD_DEFINITIONS.filter(c => c.type === 'creature');
    for (const c of creatures) {
      assert.ok(typeof c.power === 'number', `${c.name} missing power`);
      assert.ok(typeof c.toughness === 'number', `${c.name} missing toughness`);
    }
  });
});

describe('createDeck', () => {
  it('returns 20 cards', () => {
    assert.equal(createDeck().length, 20);
  });

  it('returns instances, not shared references (mutating one does not affect another)', () => {
    const deck = createDeck();
    const first = deck.find(c => c.id === 'fire-drake');
    const second = deck.filter(c => c.id === 'fire-drake')[1];
    assert.notEqual(first, second);
    first.power = 99;
    assert.equal(second.power, 5); // original value unchanged
  });

  it('each card has a unique instanceId within a deck', () => {
    const deck = createDeck();
    const ids = new Set(deck.map(c => c.instanceId));
    assert.equal(ids.size, 20);
  });

  it('two decks have no overlapping instanceIds', () => {
    const deck1 = createDeck();
    const deck2 = createDeck();
    const ids1 = new Set(deck1.map(c => c.instanceId));
    for (const card of deck2) {
      assert.ok(!ids1.has(card.instanceId), `instanceId ${card.instanceId} collides across decks`);
    }
  });

  it('shuffles (two decks are not always identical order)', () => {
    // Run 5 times — probability of same order is (1/20!)^5 ≈ 0
    const orders = Array.from({ length: 5 }, () => createDeck().map(c => c.id).join(','));
    const unique = new Set(orders);
    assert.ok(unique.size > 1, 'Deck order never changes — shuffle is broken');
  });
});
