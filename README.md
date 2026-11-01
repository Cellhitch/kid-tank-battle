# 夜战坦克 · Kid Tank Battle

A browser game designed from a kid's marker drawing. No build step — open `index.html` or serve the folder.

**How to play:** tap a character card (or press 1–6) to deploy it; it costs ⚡ energy, which refills over time.
Hold off 5 enemy waves, protect your base, and defeat the final boss — the **塔楼重坦 Tower Tank**.
Hazards appear on the field: 怪兽大嘴 (monster mouth) and 刺猬太阳 (spiky sun) hurt anyone nearby;
tap the 斑点陨石 (spotted rock) for bonus ⚡.

| Role | Idea |
|---|---|
| 闪电矛兵 | fast, lightning briefly stuns the target |
| 大锤兵 | melee bruiser |
| 炸弹兵 | splash damage |
| 狙击手 | long range, first shot +50% |
| 小炮坦克 | ranged cannon |
| X塔巨人 | tanky, takes 35% less damage |
| 塔楼重坦 (Boss) | three-cannon volley |

`assets/kid-drawing-labeled.jpg` is the original drawing with each role labeled.

## Develop
```sh
node --test tests/core.test.cjs   # rules tests
node tests/balance.sim.cjs        # bot playthroughs, prints win rates
```
Rules live in `game-core.js` (no DOM); drawing/input in `game.js`.
