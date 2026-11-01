# 夜战坦克 · Kid Tank Battle

A browser game designed from a kid's marker drawing. Two modes, no build step:

- **`index.html` — Card battle (Hearthstone-style, turn-based).** Beat the Boss **塔楼重坦 (Tower Tank)**: both heroes have 20 HP.
- **`classic.html` — Classic real-time lane battle.**

## Card battle rules (short)
1. Each turn you get +1 ⚡ mana (max 10). Click a card in your hand to play it (cost = top-left number).
2. Minions have **attack** (bottom-left) and **health** (bottom-right). They can attack from the *next* turn (⚡冲锋 Charge: right away).
3. Click a glowing minion, then click an enemy to attack. Minions hurt each other. 🛡 Taunt enemies must be hit first.
4. Hero power (2 mana, once per turn): you shoot 1 damage at any target; the Boss fires 3 random shots.
5. Click **结束回合** to end your turn.

| Card | Cost | Stats | Effect |
|---|---|---|---|
| 斑点陨石 | 1 | 0/3 | Taunt |
| 闪电矛兵 | 2 | 2/2 | Freeze an enemy minion |
| 刺猬太阳 (spell) | 2 | – | 1 damage to all minions |
| 大锤兵 | 3 | 3/2 | Charge |
| 炸弹兵 | 3 | 2/3 | 1 damage to all enemy minions |
| 怪兽大嘴 (spell) | 3 | – | Eat one enemy minion |
| 狙击手 | 4 | 3/3 | 2 damage to the enemy hero |
| X塔巨人 | 4 | 3/6 | Taunt |
| 小炮坦克 | 5 | 5/5 | – |

`assets/kid-drawing-labeled.jpg` is the original drawing with every role labeled.

## Develop
```sh
node --test tests/core.test.cjs   # classic-mode rules
node --test tests/cards.test.cjs  # card-game rules + Boss AI
node tests/cards.sim.cjs          # Boss AI win rates
node tests/balance.sim.cjs        # bot playthroughs, prints win rates
```
Rules: `cards-core.js` (card game) and `game-core.js` (classic); UI in `cards.js` / `game.js`.
