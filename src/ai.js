// src/ai.js

export class AIPlayer {
  takeTurn(state) {
    const actions = [];
    const aiHand = state.ai.hand;
    const playerHp = state.player.hp;

    // 1. Play highest-power creature
    const creatures = aiHand
      .filter(c => c.type === 'creature')
      .sort((a, b) => (b.currentPower ?? b.power ?? 0) - (a.currentPower ?? a.power ?? 0));
    if (creatures.length > 0) {
      actions.push({ type: 'PLAY', payload: creatures[0].instanceId });
    }

    // 2. Play damage spells only if player HP <= 8
    if (playerHp <= 8) {
      const dmgSpells = aiHand.filter(c => c.type === 'spell' && c.damage);
      for (const spell of dmgSpells) {
        actions.push({ type: 'PLAY', payload: spell.instanceId });
      }
    }
    // (heal, buff, aoe, war-cry: always skipped by AI)

    // 3. Attack with all creatures on board
    const attackers = state.ai.board.map(c => c.instanceId);
    if (attackers.length > 0) {
      actions.push({ type: 'ATTACK', payload: attackers });
    }

    return actions;
  }

  assignBlockers(state, attackerIds) {
    // Sort attackers by power descending using player board data
    const attackerData = attackerIds
      .map(id => state.player.board.find(c => c.instanceId === id))
      .filter(Boolean)
      .sort((a, b) => (b.currentPower ?? b.power ?? 0) - (a.currentPower ?? a.power ?? 0));

    // Sort AI blockers by toughness descending
    const blockers = [...state.ai.board].sort((a, b) => (b.currentToughness ?? b.toughness ?? 0) - (a.currentToughness ?? a.toughness ?? 0));

    const map = {};

    // Create entries for all attackers (including those not found on player board)
    for (const id of attackerIds) {
      map[id] = null;
    }

    // Assign blockers to attackers that were found on player board (sorted by power)
    for (const attacker of attackerData) {
      const blocker = blockers.shift();
      if (blocker) {
        map[attacker.instanceId] = blocker.instanceId;
      }
    }

    return map;
  }
}
