# Jewel Match ✦

A polished, responsive match-three jewel puzzle game built with plain HTML, CSS, and JavaScript. No framework, build step, external image, or audio file is required.

## Play

Once GitHub Pages is enabled, play at:

**https://shreebalaji767.github.io/jewel-match/**

## How to play

1. Press **Play now**.
2. Select a gem, then select an adjacent gem to swap.
3. Match 3 or more gems of the same colour to score points.
4. Chain reactions and larger matches earn more points.
5. Reach **1,500 points in 25 moves** to complete the quest.
6. Use **Hint**, **Pause**, **Restart**, and **Exit to home** when needed. On touch screens, swipe a gem toward an adjacent gem to swap it.\n7. If the board runs out of valid moves, the game refreshes the board automatically.

Sound effects are generated in the browser with the Web Audio API. Sound preference and your best score are saved locally in your browser. The game supports tap/click and swipe controls, gives hints, and automatically reshuffles stuck boards.

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
