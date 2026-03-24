// test/game.test.js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/game.js';

let game;
beforeEach(() => {
  game = new GameEngine();
  game.startGame();
});

describe('startGame', () => {
  it('sets player and AI hp to 20', () => {
    const s = game.getState();
    assert.equal(s.player.hp, 20);
    assert.equal(s.ai.hp, 20);
  });

  it('deals 3 cards to each hand', () => {
    const s = game.getState();
    assert.equal(s.player.hand.length, 3);
    assert.equal(s.ai.hand.length, 3);
  });

  it('leaves 17 cards in each deck', () => {
    const s = game.getState();
    assert.equal(s.player.deck.length, 17);
    assert.equal(s.ai.deck.length, 17);
  });

  it('sets phase to play', () => {
    assert.equal(game.getState().phase, 'play');
  });

  it('sets turn to 1', () => {
    assert.equal(game.getState().turn, 1);
  });
});

describe('playCard — creature', () => {
  it('moves creature from hand to board', () => {
    const s = game.getState();
    const creature = s.player.hand.find(c => c.type === 'creature');
    if (!creature) return; // skip if no creature in starting hand (rare)
    game.playCard(creature.instanceId);
    const after = game.getState();
    assert.equal(after.player.hand.find(c => c.instanceId === creature.instanceId), undefined);
    assert.ok(after.player.board.find(c => c.instanceId === creature.instanceId));
  });

  it('sets currentToughness and currentPower on creature', () => {
    const s = game.getState();
    const creature = s.player.hand.find(c => c.type === 'creature');
    if (!creature) return;
    game.playCard(creature.instanceId);
    const boardCard = game.getState().player.board.find(c => c.instanceId === creature.instanceId);
    assert.equal(boardCard.currentToughness, creature.toughness);
    assert.equal(boardCard.currentPower, creature.power);
  });
});

describe('playCard — damage spell', () => {
  it('deals damage to AI hp', () => {
    const s = game.getState();
    const fb = { id: 'fireball', instanceId: 'fireball-test', name: 'Fireball', type: 'spell', damage: 3, flavor: '' };
    s.player.hand.push(fb);
    game.playCard('fireball-test');
    assert.equal(game.getState().ai.hp, 17);
  });
});

describe('playCard — heal spell', () => {
  it('restores player HP (capped at 20)', () => {
    const s = game.getState();
    s.player.hp = 15;
    const herb = { id: 'healing-herb', instanceId: 'herb-test', name: 'Healing Herb', type: 'spell', heal: 3, flavor: '' };
    s.player.hand.push(herb);
    game.playCard('herb-test');
    assert.equal(game.getState().player.hp, 18);
  });

  it('does not exceed 20 HP', () => {
    const s = game.getState();
    const herb = { id: 'healing-herb', instanceId: 'herb-test2', name: 'Healing Herb', type: 'spell', heal: 3, flavor: '' };
    s.player.hand.push(herb);
    game.playCard('herb-test2');
    assert.equal(game.getState().player.hp, 20);
  });
});

describe('playCard — phase guard', () => {
  it('does nothing if phase is not play', () => {
    const s = game.getState();
    s.phase = 'attack';
    const handSizeBefore = s.player.hand.length;
    const card = s.player.hand[0];
    game.playCard(card.instanceId);
    assert.equal(game.getState().player.hand.length, handSizeBefore);
  });
});

describe('endTurn from play phase', () => {
  it('advances phase to attack', () => {
    game.endTurn();
    assert.equal(game.getState().phase, 'attack');
  });
});

describe('endTurn from attack phase', () => {
  it('advances phase to ai-turn', () => {
    game.endTurn(); // play → attack
    game.endTurn(); // attack → ai-turn
    assert.equal(game.getState().phase, 'ai-turn');
  });
});

describe('advanceToPlayerTurn', () => {
  it('increments turn counter', () => {
    game.advanceToPlayerTurn();
    assert.equal(game.getState().turn, 2);
  });

  it('player draws a card from deck', () => {
    const deckBefore = game.getState().player.deck.length;
    const handBefore = game.getState().player.hand.length;
    game.advanceToPlayerTurn();
    assert.equal(game.getState().player.deck.length, deckBefore - 1);
    assert.equal(game.getState().player.hand.length, handBefore + 1);
  });

  it('sets phase to play', () => {
    game.advanceToPlayerTurn();
    assert.equal(game.getState().phase, 'play');
  });

  it('does not crash if deck is empty', () => {
    game.getState().player.deck = [];
    assert.doesNotThrow(() => game.advanceToPlayerTurn());
  });
});
