# Jewel Match ✦

A polished, responsive match-three jewel puzzle game built with plain HTML, CSS, and JavaScript. No framework, build step, external image, or audio file is required.

## Play

Once GitHub Pages is enabled, play at:

**https://shreebalaji767.github.io/jewel-match/**

## Game modes

- **Crystal Quest:** reach 1,500 points in 25 moves.
- **Daily Challenge:** a date-based target that changes each day, with 20 moves to beat it. Win to build a daily streak on this browser.
- **Crystal Adventure:** persistent, progressively harder levels with rising score targets, tighter move limits, and frozen-gem obstacles from Level 3.
- **Crystal Coins & Records:** earn coins for victories and save wins, best chain length, and your next unlocked adventure level locally.

## How to play

1. Press **Play now**.
2. Select a gem, then select an adjacent gem to swap.
3. Match 3 or more gems of the same colour to score points.
4. Match 4 gems in a line to create a persistent **line bomb**. Match or swap it to clear its entire row or column. Match 5 in a line or create a T/L-shaped crossing to create a **rainbow colour bomb** that clears every gem of its colour when activated.
5. Bombs caught in another explosion can chain-detonate, and each extra bomb in a chain adds a combo bonus. Swapping two bombs earns a mega-combo bonus; cascades show combo callouts and score multipliers.
6. Reach **1,500 points in 25 moves** to complete the quest.
7. Use **Hint**, **Pause**, **Restart**, and **Exit to home** when needed. On a keyboard, press **P** or **Space** to pause/resume, **H** for a hint, **R** to restart after confirmation, and **M** to toggle sound. When a gem tile is focused, use the **arrow keys** to move keyboard focus around the board. On touch screens, swipe a gem toward an adjacent gem to swap it.
8. If the board runs out of valid moves, the game refreshes the board automatically.

Victories award crystal coins (with a larger daily challenge reward), and your adventure level, coins, wins, and best chain are saved locally in this browser. Sound effects are generated in the browser with the Web Audio API. The game automatically pauses when you switch away from its tab, and the end-of-round dialog clearly distinguishes reaching the target from running out of moves. Sound preference, your best score, daily best score, and daily streak are saved locally in your browser. The game supports tap/click and swipe controls, gives hints, and automatically reshuffles stuck boards.

## Files

- `index.html` — landing page, game board, dialogs, and controls
- `css/style.css` — responsive layout, gem styling, effects, and animations
- `js/game.js` — board generation, swaps, matching, scoring, cascades, hints, swipe controls, stuck-board recovery, and dialogs
- `favicon.svg` — custom vector icon

## Publish with GitHub Pages

1. Open the repository's **Settings**.
2. Select **Pages** in the sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**, then save.
5. Wait for GitHub Pages to finish publishing, then open the Play URL above.

The game uses relative file paths, so it works from the repository's GitHub Pages subpath.
