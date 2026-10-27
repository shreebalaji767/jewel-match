# Jewel Match ✦

A colourful, responsive, Candy Crush-inspired match-three puzzle adventure built with plain HTML, CSS, and JavaScript. No framework, build step, external images, or audio files are required.

## Play

**Live game:** https://shreebalaji767.github.io/jewel-match/  
**Repository:** https://github.com/shreebalaji767/jewel-match

## Always free — no monetization

Jewel Match is free to play with **no ads, no ad SDKs, no in-app purchases, no subscriptions, and no paywalls**. All 100 Sugar Trail levels are available immediately. Hints, shuffles, and undo are free. Special candies, game modes, and retries are never sold. Crystal coins are earned in-game and are not required to unlock content. No account or paid server is required.

## Game modes and progression

- **Crystal Quest:** score at least 1,500 points in 25 moves.
- **Daily Challenge:** a date-based target with 20 moves. Wins can build your daily streak on the current browser.
- **Sugar Trail:** 100 selectable levels with rising score targets, move limits, collectible-candy and frozen-tile objectives, and up to three stars per level.
- **Crystal Coins & Records:** earn coins from victories and gift boxes, plus claim a **free 50-coin daily gift** once per local calendar day. Wins, coins, best chain, level stars, best scores, and progress are saved locally in your browser.

## How to play

1. Choose **Play now**, **Daily challenge**, or **Sugar Trail**.
2. Select a gem, then select an adjacent gem to swap. On touch screens, swipe a gem toward an adjacent tile.
3. Match at least three gems of the same colour to score points.
4. Create special candies:
   - **Four in a line:** creates a candy gift box.
   - **Five in a straight line:** creates a rainbow colour bomb.
   - **T/L-shaped match:** creates a wrapped candy.
   - **Same-colour 2×2 square:** creates a gift box.
5. Activate a gift box for a **3×3 blast and free crystal coins**. Explosions can trigger nearby special candies in chain reactions. Bomb reactions use dramatic slow-motion effects, and cascades earn bonus points.
6. Reach the target score and complete any level objective before moves run out.

## Free tools and controls

- **Daily crystal gift:** claim 50 free coins from the home screen once per local calendar day. The claim and coin balance are stored locally; no account or internet connection is needed after the app is loaded.
- **Hint:** highlights a possible move.
- **Free shuffle:** reshuffles the board without spending a move or removing frozen objectives.
- **Undo move:** reverses your most recent valid move. It restores the previous board, score, moves, frozen tiles, level-objective progress, coins, and best-chain value. Only the latest valid move can be undone; a new valid move creates a new undo point.
- **Pause / Resume:** take a break at any time.
- **Restart:** start the current mode or level again.
- **Sound:** toggle generated sound effects.

Keyboard shortcuts:

| Key | Action |
| --- | --- |
| **P** or **Space** | Pause / resume |
| **H** | Hint |
| **S** | Free shuffle |
| **U** | Undo the latest valid move |
| **R** | Restart after confirmation |
| **M** | Toggle sound |
| **Arrow keys** | Move keyboard focus between board tiles |

Undo is available during an active round after a valid move resolves; it is disabled while paused or a dialog is open to avoid undoing a completed result. The game also pauses when you switch away from its browser tab. Boards with no valid moves are reshuffled automatically.

## Features

- Responsive desktop, tablet, and mobile layouts.
- Glossy candy-style gems, animated special candies, cascading matches, chain explosions, and slow-motion bomb effects.
- Installable Progressive Web App (PWA), with service-worker caching for offline play after the first successful load.
- Locally saved progress, level stars, coins, wins, records, sound preference, daily challenge streak, and daily-gift claim date.
- Mouse, keyboard, tap, and touch-swipe controls.
- Sound effects generated with the browser's Web Audio API.
- Reduced-motion styling for players who prefer fewer animations.
- No ads, external tracking SDKs, account requirement, paid unlocks, or in-game purchases.

## Project files

- `index.html` — landing page, game board, dialogs, and controls.
- `css/style.css` — responsive layout, gem styling, animations, and control polish.
- `js/game.js` — board generation, swaps, matching, scoring, cascades, hints, free shuffle, undo, swipe controls, progress, and dialogs.
- `favicon.svg` — vector app icon.
- `manifest.webmanifest` — PWA metadata and install settings.
- `sw.js` — offline asset caching and cache-version management.

## Publish with GitHub Pages

1. Open the repository's **Settings**.
2. Select **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/(root)**, then save.
5. Wait for GitHub Pages to publish, then open the Play link above.

The game uses relative asset paths so it can run from the repository's GitHub Pages subpath.


## Upgrade pack

- **Super combo scoring:** cascades use a visible multiplier up to ×5, with bonus points for special-candy and multi-bomb combinations.
- **Treasure chests:** every fifth victory and every 10th Sugar Trail milestone grants a free coin chest. Unused moves award bonus points and coins on victory.
- **Ten themed Sugar Trail worlds:** themed regions and milestone boss challenges at levels 10, 20, 30 … 100.
- **Achievement collection book:** earn rewards for victories, cascades, daily streaks, progress across 10 levels, and three-star clears. Achievements are saved locally.
- **Accessibility settings:** reduce animation effects or enable gem shape markers for colour-independent play.
- **Save backup tools:** export progress as a JSON file or import a previous backup by pasting its contents. Import replaces matching local progress keys on this browser; export a backup first.
- **Free forever:** all rewards are earned through play. No paid chests, ads, subscriptions, or database are added.
