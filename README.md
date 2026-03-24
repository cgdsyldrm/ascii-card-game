# Cardminal

A browser-based card game with ASCII art, inspired by Magic: The Gathering. Play against a simple AI in a full-screen terminal aesthetic.

**[Play now →](https://cgdsyldrm.github.io/ascii-card-game/)**

---

## How to Play

Type commands into the terminal input at the bottom of the screen:

| Command | Description |
|---|---|
| `play <n>` | Play card #n from your hand |
| `attack <n> [n…]` | Attack with creature(s) #n |
| `end` | End your turn |
| `help` | Show available commands |

Each turn: play cards → declare attackers → end turn → AI responds.

Reduce the enemy's HP to 0 to win. You start with 20 HP each.

---

## Card Types

**Creatures** — stay on the board, attack and block. Stats shown as `power / toughness`.

**Spells** — one-time effects: damage, healing, AOE, or power buffs.

---

## Running Locally

No build step, no dependencies.

```bash
node server.js
# → http://localhost:31184
```

---

## Stack

- Vanilla JS ES modules (no framework, no bundler)
- Node.js built-in `http` module for local serving
- Pure CSS — no external fonts or libraries
- Tests via Node.js built-in `node:test`

```bash
npm test
```
