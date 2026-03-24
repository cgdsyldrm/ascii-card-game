// src/game.js
import { createDeck } from './cards.js';

export class GameEngine {
  constructor() {
    this.state = null;
    this.onStateChange = null;
  }

  startGame() {
    const playerDeck = createDeck();
    const aiDeck = createDeck();
    this.state = {
      turn: 1,
      phase: 'play', // 'play' | 'attack' | 'ai-turn' | 'gameover'
      winner: null,
      player: {
        hp: 20,
        hand: playerDeck.slice(0, 3).map(c => this._inst(c)),
        deck: playerDeck.slice(3).map(c => this._inst(c)),
        board: [],
      },
      ai: {
        hp: 20,
        hand: aiDeck.slice(0, 3).map(c => this._inst(c)),
        deck: aiDeck.slice(3).map(c => this._inst(c)),
        board: [],
      },
      log: ['=== GAME START === Draw 3 cards each.'],
    };
    this._emit();
  }

  // Create a board-ready instance with currentPower/currentToughness
  _inst(card) {
    return {
      ...card,
      currentPower: card.power ?? 0,
      currentToughness: card.toughness ?? 0,
    };
  }

  playCard(instanceId) {
    if (this.state.phase !== 'play') return;
    const idx = this.state.player.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return;
    const [card] = this.state.player.hand.splice(idx, 1);

    if (card.type === 'creature') {
      this.state.player.board.push(card); // already an _inst from hand creation
      this._log(`You played ${card.name} (${card.power}/${card.toughness}).`);
    } else {
      this._applySpell(card, 'player');
    }
    this._emit();
  }

  _applySpell(card, owner) {
    const self = this.state[owner];
    const opp  = owner === 'player' ? this.state.ai : this.state.player;
    const who  = owner === 'player' ? 'You cast' : 'AI casts';

    if (card.damage) {
      opp.hp -= card.damage;
      this._log(`${who} ${card.name}! ${card.damage} damage.`);
      this._checkWin();
    } else if (card.heal) {
      self.hp = Math.min(20, self.hp + card.heal);
      this._log(`${who} ${card.name}! +${card.heal} HP.`);
    } else if (card.aoe) {
      opp.board.forEach(c => { c.currentToughness -= card.aoe; });
      opp.board = opp.board.filter(c => c.currentToughness > 0);
      this._log(`${who} ${card.name}! All enemy creatures take ${card.aoe} damage.`);
    } else if (card.buff) {
      self.board.forEach(c => { c.currentPower += card.buff; });
      this._log(`${who} ${card.name}! Your creatures gain +${card.buff} power.`);
    }
  }

  // Called by main.js to play a card on behalf of AI (during ai-turn phase)
  aiPlayCard(instanceId) {
    const idx = this.state.ai.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return;
    const [card] = this.state.ai.hand.splice(idx, 1);
    if (card.type === 'creature') {
      this.state.ai.board.push(card); // already an _inst from hand creation
      this._log(`AI played ${card.name} (${card.power}/${card.toughness}).`);
    } else {
      this._applySpell(card, 'ai');
    }
    this._emit();
  }

  // Player declares attackers; returns attacker objects (used by main.js to call ai.assignBlockers)
  declareAttack(instanceIds) {
    if (this.state.phase !== 'attack') return [];
    return this.state.player.board.filter(c => instanceIds.includes(c.instanceId));
  }

  resolveCombat(attackers, blockerMap) {
    if (this.state.phase !== 'attack') return;
    // blockerMap: { attackerInstanceId: blockerInstanceId | null }
    for (const atk of attackers) {
      const blkId = blockerMap[atk.instanceId];
      const blk = blkId ? this.state.ai.board.find(c => c.instanceId === blkId) : null;

      if (blk) {
        atk.currentToughness -= blk.currentPower;
        blk.currentToughness -= atk.currentPower;
        const result = [
          atk.currentToughness <= 0 ? `${atk.name} dies.` : '',
          blk.currentToughness <= 0 ? `${blk.name} dies.` : '',
        ].filter(Boolean).join(' ');
        this._log(`${atk.name} vs ${blk.name}. ${result || 'Both survive.'}`);
      } else {
        this.state.ai.hp -= atk.currentPower;
        this._log(`${atk.name} attacks unblocked! AI takes ${atk.currentPower} damage.`);
      }
    }

    // Remove dead creatures
    this.state.player.board = this.state.player.board.filter(c => c.currentToughness > 0);
    this.state.ai.board    = this.state.ai.board.filter(c => c.currentToughness > 0);
    this._checkWin();
    this._emit();
  }

  // Called by main.js after AI attacks player
  resolveAICombat(attackers, blockerMap) {
    if (this.state.phase !== 'ai-turn') return;
    for (const atk of attackers) {
      const blkId = blockerMap[atk.instanceId];
      const blk = blkId ? this.state.player.board.find(c => c.instanceId === blkId) : null;

      if (blk) {
        atk.currentToughness -= blk.currentPower;
        blk.currentToughness -= atk.currentPower;
        const result = [
          atk.currentToughness <= 0 ? `${atk.name} dies.` : '',
          blk.currentToughness <= 0 ? `${blk.name} dies.` : '',
        ].filter(Boolean).join(' ');
        this._log(`AI's ${atk.name} vs your ${blk.name}. ${result || 'Both survive.'}`);
      } else {
        this.state.player.hp -= atk.currentPower;
        this._log(`AI's ${atk.name} attacks unblocked! You take ${atk.currentPower} damage.`);
      }
    }
    this.state.player.board = this.state.player.board.filter(c => c.currentToughness > 0);
    this.state.ai.board    = this.state.ai.board.filter(c => c.currentToughness > 0);
    this._checkWin();
    this._emit();
  }

  endTurn() {
    if (this.state.phase === 'play') {
      this.state.phase = 'attack';
      this._log('Attack phase. Select creatures to attack, or End Turn.');
    } else if (this.state.phase === 'attack') {
      this.state.phase = 'ai-turn';
      this._log("Your turn ends. AI's turn...");
    }
    this._emit();
  }

  // Called by main.js after AI completes its full turn
  advanceToPlayerTurn() {
    this.state.turn++;
    if (this.state.player.deck.length > 0) {
      const card = this.state.player.deck.shift();
      this.state.player.hand.push(card);
      this._log(`Turn ${this.state.turn}: You draw ${card.name}.`);
    } else {
      this._log(`Turn ${this.state.turn}: Your deck is empty, no draw.`);
    }
    this.state.phase = 'play';
    this._emit();
  }

  // AI also draws at start of its turn (called by main.js)
  aiDraw() {
    if (this.state.ai.deck.length > 0) {
      const card = this.state.ai.deck.shift();
      this.state.ai.hand.push(card);
      this._log(`AI draws a card.`);
    }
  }

  _checkWin() {
    if (this.state.ai.hp <= 0 && !this.state.winner) {
      this.state.winner = 'player';
      this.state.phase = 'gameover';
      this._log('>>> AI defeated! YOU WIN! <<<');
    } else if (this.state.player.hp <= 0 && !this.state.winner) {
      this.state.winner = 'ai';
      this.state.phase = 'gameover';
      this._log('>>> You have been defeated! YOU LOSE! <<<');
    }
  }

  _log(msg) { this.state.log.push(msg); }
  _emit() { if (this.onStateChange) this.onStateChange(this.state); }
  getState() { return this.state; }
}
