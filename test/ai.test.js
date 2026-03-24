// test/ai.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AIPlayer } from '../src/ai.js';

const ai = new AIPlayer();

function makeState(overrides = {}) {
  return {
    player: { hp: 20, board: [], hand: [], deck: [] },
    ai: { hp: 20, board: [], hand: [], deck: [] },
    ...overrides,
  };
}

describe('takeTurn', () => {
  it('returns PLAY action for highest-power creature in hand', () => {
    const state = makeState({
      ai: {
        hp: 20, deck: [], board: [],
        hand: [
          { instanceId: 'elf',   type: 'creature', currentPower: 2, currentToughness: 2, id: 'forest-elf' },
          { instanceId: 'drake', type: 'creature', currentPower: 5, currentToughness: 3, id: 'fire-drake' },
        ],
      },
    });
    const actions = ai.takeTurn(state);
    const plays = actions.filter(a => a.type === 'PLAY');
    assert.ok(plays.length > 0, 'Should play at least one card');
    assert.equal(plays[0].payload, 'drake', 'Should play highest-power creature first');
  });

  it('returns ATTACK action with all creatures when AI has creatures on board', () => {
    const state = makeState({
      ai: {
        hp: 20, deck: [], hand: [],
        board: [
          { instanceId: 'wolf', type: 'creature', currentPower: 3, currentToughness: 1 },
        ],
      },
    });
    const actions = ai.takeTurn(state);
    const attack = actions.find(a => a.type === 'ATTACK');
    assert.ok(attack, 'Should have ATTACK action');
    assert.ok(attack.payload.includes('wolf'));
  });

  it('plays damage spell when player hp <= 8', () => {
    const state = makeState({
      player: { hp: 6, board: [], hand: [], deck: [] },
      ai: {
        hp: 20, deck: [], board: [],
        hand: [{ instanceId: 'fb', type: 'spell', damage: 3, id: 'fireball', name: 'Fireball' }],
      },
    });
    const actions = ai.takeTurn(state);
    const plays = actions.filter(a => a.type === 'PLAY');
    assert.ok(plays.some(a => a.payload === 'fb'), 'Should play fireball when player HP low');
  });

  it('skips damage spell when player hp > 8', () => {
    const state = makeState({
      player: { hp: 15, board: [], hand: [], deck: [] },
      ai: {
        hp: 20, deck: [], board: [],
        hand: [{ instanceId: 'fb', type: 'spell', damage: 3, id: 'fireball', name: 'Fireball' }],
      },
    });
    const actions = ai.takeTurn(state);
    const plays = actions.filter(a => a.type === 'PLAY');
    assert.equal(plays.find(a => a.payload === 'fb'), undefined, 'Should skip fireball');
  });

  it('skips heal and buff spells always', () => {
    const state = makeState({
      ai: {
        hp: 5, deck: [], board: [],
        hand: [
          { instanceId: 'herb', type: 'spell', heal: 3, id: 'healing-herb', name: 'Healing Herb' },
          { instanceId: 'wc',   type: 'spell', buff: 1, id: 'war-cry',      name: 'War Cry' },
        ],
      },
    });
    const actions = ai.takeTurn(state);
    const plays = actions.filter(a => a.type === 'PLAY');
    assert.equal(plays.length, 0, 'AI should skip heal and buff spells');
  });
});

describe('assignBlockers', () => {
  it('assigns highest-toughness AI creature to highest-power attacker', () => {
    const state = makeState({
      player: {
        hp: 20, deck: [], hand: [],
        board: [{ instanceId: 'drake-atk', currentPower: 5, currentToughness: 3 }],
      },
      ai: {
        hp: 20, deck: [], hand: [],
        board: [
          { instanceId: 'golem', currentPower: 4, currentToughness: 5 },
          { instanceId: 'wolf',  currentPower: 3, currentToughness: 1 },
        ],
      },
    });
    const attackerIds = ['drake-atk'];
    const map = ai.assignBlockers(state, attackerIds);
    assert.equal(map['drake-atk'], 'golem');
  });

  it('leaves excess attackers unblocked (null) when AI has fewer creatures', () => {
    const state = makeState({
      ai: {
        hp: 20, deck: [], hand: [],
        board: [{ instanceId: 'golem', currentPower: 4, currentToughness: 5 }],
      },
      player: {
        hp: 20, deck: [], hand: [],
        board: [
          { instanceId: 'atk1', currentPower: 5, currentToughness: 3 },
          { instanceId: 'atk2', currentPower: 2, currentToughness: 2 },
        ],
      },
    });
    const map = ai.assignBlockers(state, ['atk1', 'atk2']);
    assert.equal(map['atk1'], 'golem');
    assert.equal(map['atk2'], null);
  });

  it('does not block when AI board is empty', () => {
    const state = makeState({ ai: { hp: 20, deck: [], hand: [], board: [] } });
    const map = ai.assignBlockers(state, ['atk1']);
    assert.equal(map['atk1'], null);
  });
});
