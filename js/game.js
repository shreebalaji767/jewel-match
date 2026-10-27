(() => {
  'use strict';

  const SIZE = 8;
  const TYPES = ['ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'diamond'];
  const CLASSIC_TARGET = 1500;
  const CLASSIC_MOVES = 25;
  let currentTarget = CLASSIC_TARGET;
  let currentMoves = CLASSIC_MOVES;
  let currentMode = 'classic';
  let adventureLevel = readNumber('jewel-match-level', 1);
  let crystalCoins = readNumber('jewel-match-coins', 0);
  let gamesWon = readNumber('jewel-match-wins', 0);
  let bestChain = readNumber('jewel-match-best-chain', 0);
  let currentLevel = adventureLevel;
  let levelStars = readLevelStars();
  let levelGoal = 'score';
  let goalTarget = 0;
  let goalProgress = 0;
  let iceRemaining = 0;
  const $ = (selector) => document.querySelector(selector);
  const homeScreen = $('#home-screen');
  const gameScreen = $('#game-screen');
  const boardElement = $('#game-board');
  const modalBackdrop = $('#modal-backdrop');
  const modalTitle = $('#modal-title');
  const modalCopy = $('#modal-copy');
  const modalEyebrow = $('#modal-eyebrow');
  const modalSymbol = $('#modal-symbol');
  const modalActions = $('#modal-actions');
  const message = $('#game-message');
  let board = [];
  let ice = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  let score = 0;
  let moves = CLASSIC_MOVES;
  let selected = null;
  let busy = false;
  let paused = false;
  let soundOn = true;
  let audioContext = null;
  let toastTimer = null;
  let hintTimer = null;
  let gameRun = 0;
  let pointerStart = null;
  let best = readBest();
  let runBestAtStart = best;
  let personalBestCelebrated = false;
  let dailyStreak = readDailyStreak();
  try { soundOn = localStorage.getItem('jewel-match-sound') !== 'off'; } catch (_) {}

  function readNumber(key, fallback = 0) {
    try { return Math.max(0, Number(localStorage.getItem(key)) || fallback); } catch (_) { return fallback; }
  }

  function readLevelStars() {
    try { return JSON.parse(localStorage.getItem('jewel-match-stars') || '{}') || {}; } catch (_) { return {}; }
  }

  function saveLevelStars() {
    try { localStorage.setItem('jewel-match-stars', JSON.stringify(levelStars)); } catch (_) {}
  }

  function showLevelMap() {
    const actions = [];
    for (let level = 1; level <= 100; level++) {
      const stars = Number(levelStars[level]) || 0;
      actions.push({ label: 'Level ' + level + '  ' + (stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '· · ·'), run: () => startGame('adventure', level) });
    }
    actions.push({ label: 'Close map', run: hideModal });
    showModal({ symbol: '🍬', eyebrow: 'SUGAR TRAIL', title: 'Choose a level', copy: 'All 100 levels are free to play. Pick any level, retry without limits, and earn up to three stars. No ads, purchases, or paywalls.', actions });
  }

  function persistProgress() {
    try {
      localStorage.setItem('jewel-match-level', String(adventureLevel));
      localStorage.setItem('jewel-match-coins', String(crystalCoins));
      localStorage.setItem('jewel-match-wins', String(gamesWon));
      localStorage.setItem('jewel-match-best-chain', String(bestChain));
    } catch (_) {}
    const levelNode = $('#level-home'); if (levelNode) levelNode.textContent = adventureLevel;
    const coinsNode = $('#coins-home'); if (coinsNode) coinsNode.textContent = crystalCoins.toLocaleString();
    const winsNode = $('#wins-home'); if (winsNode) winsNode.textContent = gamesWon;
    const chainNode = $('#chain-home'); if (chainNode) chainNode.textContent = bestChain;
  }

  function readBest() {
    try { return Number(localStorage.getItem('jewel-match-best')) || 0; }
    catch (_) { return 0; }
  }

  function readDailyStreak() {
    try { return Number(localStorage.getItem('jewel-match-daily-streak')) || 0; } catch (_) { return 0; }
  }

  function saveBest() {
    try { localStorage.setItem('jewel-match-best', String(best)); } catch (_) {}
    $('#best-home').textContent = 'BEST SCORE  ' + best.toLocaleString();
    $('#best-game').textContent = 'BEST  ' + best.toLocaleString();
    const streakNode = $('#streak-home');
    if (streakNode) streakNode.textContent = dailyStreak;
    const dailyBestNode = $('#daily-best-home');
    if (dailyBestNode) dailyBestNode.textContent = 'TODAY  ' + readTodayBest().toLocaleString();
    persistProgress();
  }

  function todayKey() {
    const date = new Date();
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function readTodayBest() {
    try { return Number(localStorage.getItem('jewel-match-daily-best-' + todayKey())) || 0; } catch (_) { return 0; }
  }

  function saveDailyBest() {
    if (currentMode !== 'daily') return;
    const oldBest = readTodayBest();
    if (score <= oldBest) return;
    try { localStorage.setItem('jewel-match-daily-best-' + todayKey(), String(score)); } catch (_) {}
    const dailyBestNode = $('#daily-best-home');
    if (dailyBestNode) dailyBestNode.textContent = 'TODAY  ' + score.toLocaleString();
    if (oldBest > 0) showToast('New daily best: ' + score.toLocaleString() + '!');
  }

  function randomType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }

  function gemType(gem) { return typeof gem === 'string' ? gem.split('|')[0] : ''; }
  function gemPower(gem) { return typeof gem === 'string' && gem.includes('|') ? gem.split('|')[1] : ''; }
  function isBomb(gem) { return Boolean(gemPower(gem)); }

  function createBoard() {
    const next = [];
    for (let row = 0; row < SIZE; row++) {
      next[row] = [];
      for (let col = 0; col < SIZE; col++) {
        let gem;
        do { gem = randomType(); }
        while ((col >= 2 && next[row][col - 1] === gem && next[row][col - 2] === gem) ||
               (row >= 2 && next[row - 1][col] === gem && next[row - 2][col] === gem));
        next[row][col] = gem;
      }
    }
    return next;
  }

  function renderBoard() {
    boardElement.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'tile';
        tile.dataset.row = String(row);
        tile.dataset.col = String(col);
        tile.setAttribute('role', 'gridcell');
        const type = gemType(board[row][col]);
        const power = gemPower(board[row][col]);
        tile.setAttribute('aria-label', TYPES.includes(type) ? type + (power ? ', ' + (power === 'color' ? 'rainbow colour bomb' : power === 'gift' ? 'candy reward box' : power === 'wrapped' ? 'wrapped bomb' : 'line bomb') : '') + (ice[row]?.[col] ? ', frozen in ice' : '') + ', row ' + (row + 1) + ', column ' + (col + 1) : 'Empty tile');
        const gem = document.createElement('span');
        gem.className = 'gem ' + type + (power ? ' special-gem bomb-' + power : '');
        if (power) {
          const mark = document.createElement('span');
          mark.className = 'bomb-mark';
          mark.textContent = power === 'color' ? '✹' : power === 'wrapped' ? '✚' : power === 'gift' ? '🎁' : power === 'row' ? '↔' : '↕';
          mark.setAttribute('aria-hidden', 'true');
          tile.appendChild(mark);
        }
        gem.setAttribute('aria-hidden', 'true');
        tile.appendChild(gem);
        if (ice[row]?.[col]) {
          const frost = document.createElement('span');
          frost.className = 'ice-overlay';
          frost.textContent = '❄';
          frost.setAttribute('aria-hidden', 'true');
          tile.appendChild(frost);
        }
        fragment.appendChild(tile);
      }
    }
    boardElement.appendChild(fragment);
    updateStats();
  }

  function updateStats() {
    $('#score-value').textContent = score.toLocaleString();
    $('#target-value').textContent = currentTarget.toLocaleString();
    $('#moves-value').textContent = moves;
    $('#progress-fill').style.width = Math.min(100, score / currentTarget * 100) + '%';
    const objective = $('#objective-value');
    if (objective) objective.textContent = currentMode === 'adventure' ? (levelGoal === 'ice' ? 'ICE ' + iceRemaining + ' left' : levelGoal === 'collect' ? 'CANDIES ' + Math.max(0, goalTarget - goalProgress) + ' left' : Math.max(0, currentTarget - score).toLocaleString() + ' to goal') : 'Reach ' + currentTarget.toLocaleString();
    saveBest();
  }

  function playTone(frequency = 520, duration = .08, type = 'sine') {
    if (!soundOn) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {}
  }

  function showToast(text) {
    const toast = $('#toast');
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
  }

  function showModal({ symbol = '✦', eyebrow = 'A MOMENT TO SHINE', title, copy, actions }) {
    modalSymbol.textContent = symbol;
    modalEyebrow.textContent = eyebrow;
    modalTitle.textContent = title;
    modalCopy.textContent = copy;
    modalActions.replaceChildren();
    actions.forEach((action, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.className = index === 0 ? 'primary-button' : 'secondary-button';
      button.addEventListener('click', action.run);
      modalActions.appendChild(button);
    });
    modalBackdrop.classList.remove('hidden');
  }

  function hideModal() { modalBackdrop.classList.add('hidden'); }

  function recordDailyWin() {
    if (currentMode !== 'daily') return;
    const today = new Date();
    const key = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    try {
      const previous = localStorage.getItem('jewel-match-daily-last-win');
      if (previous === key) return;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = [yesterday.getFullYear(), String(yesterday.getMonth() + 1).padStart(2, '0'), String(yesterday.getDate()).padStart(2, '0')].join('-');
      dailyStreak = previous === yesterdayKey ? dailyStreak + 1 : 1;
      localStorage.setItem('jewel-match-daily-last-win', key);
      localStorage.setItem('jewel-match-daily-streak', String(dailyStreak));
    } catch (_) { dailyStreak++; }
    saveBest();
  }

  function startGame(mode = currentMode, requestedLevel = null) {
    currentMode = mode;
    if (mode === 'adventure' && Number.isInteger(requestedLevel) && requestedLevel > 0) currentLevel = Math.min(100, Math.max(1, requestedLevel));
    else if (mode === 'adventure') currentLevel = adventureLevel;
    if (currentMode === 'daily') {
      const today = new Date();
      const dayKey = today.getFullYear() * 372 + today.getMonth() * 31 + today.getDate();
      currentTarget = 1800 + (dayKey % 8) * 100;
      currentMoves = 20;
    } else if (currentMode === 'adventure') {
      currentTarget = 900 + currentLevel * 220;
      currentMoves = Math.max(17, 28 - Math.floor(currentLevel / 3));
      levelGoal = currentLevel % 3 === 0 ? 'ice' : currentLevel % 4 === 0 ? 'collect' : 'score';
      goalTarget = levelGoal === 'ice' ? Math.min(12, 2 + Math.floor(currentLevel / 2)) : levelGoal === 'collect' ? 12 + currentLevel : currentTarget;
      goalProgress = 0;
    } else {
      currentTarget = CLASSIC_TARGET;
      currentMoves = CLASSIC_MOVES;
    }
    $('#game-screen .centered-eyebrow').textContent = currentMode === 'daily' ? 'DAILY CRYSTAL CHALLENGE' : currentMode === 'adventure' ? 'SUGAR TRAIL · LEVEL ' + currentLevel : 'CRYSTAL QUEST';
    gameRun++;
    runBestAtStart = best;
    personalBestCelebrated = false;
    clearTimeout(hintTimer);
    homeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    hideModal();
    score = 0;
    moves = currentMoves;
    selected = null;
    busy = false;
    paused = false;
    board = createBoard();
    ice = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    if (currentMode === 'adventure' && (levelGoal === 'ice' || currentLevel >= 3)) {
      const iceCount = levelGoal === 'ice' ? goalTarget : Math.min(12, 2 + Math.floor(currentLevel / 2));
      let placed = 0, attempts = 0;
      while (placed < iceCount && attempts++ < 100) {
        const row = Math.floor(Math.random() * SIZE), col = Math.floor(Math.random() * SIZE);
        if (!ice[row][col]) { ice[row][col] = true; placed++; }
      }
    }
    iceRemaining = ice.flat().filter(Boolean).length;
    renderBoard();
    ensurePossibleMove();
    $('#sound-toggle').textContent = soundOn ? '♫' : '♪';
    message.textContent = currentMode === 'adventure' ? (levelGoal === 'ice' ? 'Clear every frozen tile and reach the score target!' : levelGoal === 'collect' ? 'Collect ' + goalTarget + ' candies of one colour and reach the score target!' : 'Reach the score target before moves run out!') : 'Match 3 or more candies. Swap, cascade, and make special candies!';
    playTone(580, .1);
  }

  function goHome() {
    gameRun++;
    clearTimeout(hintTimer);
    hideModal();
    gameScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    selected = null;
    busy = false;
    paused = false;
    saveBest();
  }

  function pauseGame() {
    if (busy || gameScreen.classList.contains('hidden')) return;
    paused = true;
    showModal({
      symbol: 'Ⅱ', eyebrow: 'TAKE YOUR TIME', title: 'Paused',
      copy: 'Your crystal quest is on hold. Ready when you are.',
      actions: [
        { label: 'Resume game', run: () => { paused = false; hideModal(); } },
        { label: 'Restart level', run: startGame },
        { label: 'Exit to home', run: goHome }
      ]
    });
  }

  function hasPossibleMove() {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const here = { row, col };
        for (const next of [{ row, col: col + 1 }, { row: row + 1, col }]) {
          if (next.row >= SIZE || next.col >= SIZE) continue;
          swap(here, next);
          const possible = findMatches().length > 0;
          swap(here, next);
          if (possible) return true;
        }
      }
    }
    return false;
  }

  function ensurePossibleMove() {
    if (hasPossibleMove()) return;
    board = createBoard();
    renderBoard();
    showToast('Board refreshed — fresh moves await!');
  }

  function shuffleBoard() {
    // Shuffle candies, never objectives: frozen tiles stay frozen in their original cells.
    for (let attempt = 0; attempt < 40; attempt++) {
      const gems = board.flat();
      for (let i = gems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gems[i], gems[j]] = [gems[j], gems[i]];
      }
      board = Array.from({ length: SIZE }, (_, row) => gems.slice(row * SIZE, (row + 1) * SIZE));
      if (!findMatches().length && hasPossibleMove()) {
        renderBoard();
        return;
      }
    }
    // Bounded fallback prevents a recursive shuffle loop on unusual boards.
    board = createBoard();
    renderBoard();
  }

  function coordinates(tile) {
    return { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
  }

  function areAdjacent(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  }

  function swap(a, b) {
    const temp = board[a.row][a.col];
    board[a.row][a.col] = board[b.row][b.col];
    board[b.row][b.col] = temp;
  }

  function findMatches() {
    const matched = new Set();
    for (let row = 0; row < SIZE; row++) {
      let start = 0;
      while (start < SIZE) {
        const gem = gemType(board[row][start]);
        let end = start + 1;
        while (gem && end < SIZE && gemType(board[row][end]) === gem) end++;
        if (gem && end - start >= 3) {
          for (let col = start; col < end; col++) matched.add(row + ',' + col);
        }
        start = end;
      }
    }
    for (let col = 0; col < SIZE; col++) {
      let start = 0;
      while (start < SIZE) {
        const gem = gemType(board[start][col]);
        let end = start + 1;
        while (gem && end < SIZE && gemType(board[end][col]) === gem) end++;
        if (gem && end - start >= 3) {
          for (let row = start; row < end; row++) matched.add(row + ',' + col);
        }
        start = end;
      }
    }
    // A same-colour 2×2 square is a box match and counts as a special-candy match.
    for (let row = 0; row < SIZE - 1; row++) {
      for (let col = 0; col < SIZE - 1; col++) {
        const type = gemType(board[row][col]);
        if (type && gemType(board[row][col + 1]) === type &&
            gemType(board[row + 1][col]) === type &&
            gemType(board[row + 1][col + 1]) === type) {
          matched.add(row + ',' + col);
          matched.add(row + ',' + (col + 1));
          matched.add((row + 1) + ',' + col);
          matched.add((row + 1) + ',' + (col + 1));
        }
      }
    }
    return [...matched].map((key) => key.split(',').map(Number));
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function clearMatches(runId, chain = 0, forcedBombs = []) {
    if (runId !== gameRun) return;
    const matches = findMatches();
    if (!matches.length && !forcedBombs.length) return;

    const cleared = new Set(matches.map(([row, col]) => row + ',' + col));
        const runs = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const type = gemType(board[row][col]);
        if (!type) continue;
        let horizontal = 1;
        while (col + horizontal < SIZE && gemType(board[row][col + horizontal]) === type) horizontal++;
        let vertical = 1;
        while (row + vertical < SIZE && gemType(board[row + vertical][col]) === type) vertical++;
        if (horizontal >= 4) runs.push({ length: horizontal, row, col, direction: 'row', type });
        if (vertical >= 4) runs.push({ length: vertical, row, col, direction: 'column', type });
      }
    }
    runs.sort((a, b) => b.length - a.length);
    let specialPosition = null;
    // T/L crossings reward skilled play with a rainbow colour bomb.
    for (const [row, col] of matches) {
      const type = gemType(board[row][col]);
      let horizontal = 1, vertical = 1;
      for (let c = col - 1; c >= 0 && gemType(board[row][c]) === type; c--) horizontal++;
      for (let c = col + 1; c < SIZE && gemType(board[row][c]) === type; c++) horizontal++;
      for (let r = row - 1; r >= 0 && gemType(board[r][col]) === type; r--) vertical++;
      for (let r = row + 1; r < SIZE && gemType(board[r][col]) === type; r++) vertical++;
      if (horizontal >= 3 && vertical >= 3) { specialPosition = { row, col, power: 'wrapped', type }; break; }
    }
    // A 2×2 candy box creates a gift candy even though it has no straight run.
    if (!specialPosition) {
      for (let row = 0; row < SIZE - 1 && !specialPosition; row++) {
        for (let col = 0; col < SIZE - 1; col++) {
          const type = gemType(board[row][col]);
          if (type && gemType(board[row][col + 1]) === type &&
              gemType(board[row + 1][col]) === type &&
              gemType(board[row + 1][col + 1]) === type) {
            specialPosition = { row: row + 1, col: col + 1, power: 'gift', type };
            break;
          }
        }
      }
    }
    if (!specialPosition && runs.length) {
      const run = runs[0];
      const offset = Math.floor(run.length / 2);
      specialPosition = run.direction === 'row'
        ? { row: run.row, col: run.col + offset, power: run.length >= 5 ? 'color' : 'gift', type: run.type }
        : { row: run.row + offset, col: run.col, power: run.length >= 5 ? 'color' : 'gift', type: run.type };
    }

    const bombQueue = [];
    const queuedBombs = new Set();
    const enqueueBomb = (row, col, targetType = null) => {
      const key = row + ',' + col;
      if (queuedBombs.has(key)) return;
      queuedBombs.add(key);
      bombQueue.push({ row, col, targetType });
    };
    forcedBombs.forEach(({ row, col, targetType }) => enqueueBomb(row, col, targetType));
    if (forcedBombs.length > 1) {
      for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) cleared.add(row + ',' + col);
    }
    matches.forEach(([row, col]) => {
      if (isBomb(board[row][col])) enqueueBomb(row, col);
    });
    const triggeredBombs = new Set();
    while (bombQueue.length) {
      const bomb = bombQueue.shift();
      const bombKey = bomb.row + ',' + bomb.col;
      if (triggeredBombs.has(bombKey)) continue;
      triggeredBombs.add(bombKey);
      const gem = board[bomb.row]?.[bomb.col];
      const power = gemPower(gem);
      const type = gemType(gem);
      if (!power) continue;
      if (power === 'color') {
        const targetType = bomb.targetType || type;
        for (let row = 0; row < SIZE; row++) {
          for (let col = 0; col < SIZE; col++) {
            if (gemType(board[row][col]) === targetType) cleared.add(row + ',' + col);
          }
        }
        message.textContent = 'COLOR BOMB! Every gem of that colour explodes!';
      } else if (power === 'row') {
        for (let col = 0; col < SIZE; col++) cleared.add(bomb.row + ',' + col);
        message.textContent = 'STRIPED CANDY! The whole row clears!';
      } else if (power === 'column') {
        for (let row = 0; row < SIZE; row++) cleared.add(row + ',' + bomb.col);
        message.textContent = 'STRIPED CANDY! The whole column clears!';
      } else if (power === 'wrapped' || power === 'gift') {
        for (let row = Math.max(0, bomb.row - 1); row <= Math.min(SIZE - 1, bomb.row + 1); row++) {
          for (let col = Math.max(0, bomb.col - 1); col <= Math.min(SIZE - 1, bomb.col + 1); col++) cleared.add(row + ',' + col);
        }
        if (power === 'gift') {
          const giftReward = 5 + Math.min(20, currentLevel || 1);
          crystalCoins += giftReward;
          persistProgress();
          showToast('🎁 Candy box opened! +' + giftReward + ' free coins!');
          message.textContent = 'CANDY GIFT BOX! 3×3 BLAST + ' + giftReward + ' COINS!';
        } else message.textContent = 'WRAPPED CANDY! BOOM!';
      }
      // Bombs caught in an explosion chain-detonate, just like in match-three arcade games.
      for (const key of cleared) {
        if (!triggeredBombs.has(key)) {
          const [row, col] = key.split(',').map(Number);
          if (isBomb(board[row]?.[col])) enqueueBomb(row, col);
        }
      }
    }
    const bombsToTrigger = [...triggeredBombs].map((key) => key.split(',').map(Number));

    if (specialPosition) {
      cleared.delete(specialPosition.row + ',' + specialPosition.col);
      board[specialPosition.row][specialPosition.col] = specialPosition.type + '|' + specialPosition.power;
      showToast(specialPosition.power === 'color' ? '✹ Color bomb created!' : specialPosition.power === 'gift' ? '🎁 Candy gift box created! Match or blast it for a 3×3 explosion + free coins!' : '✦ Special candy created!');
    }
    const clearCoords = [...cleared].map((key) => key.split(',').map(Number));
    clearCoords.forEach(([row, col]) => {
      const tile = boardElement.querySelector('.tile[data-row="' + row + '"][data-col="' + col + '"]');
      if (tile) tile.classList.add(triggeredBombs.size ? 'bomb-slowmo' : 'matching');
    });
    const powerBonus = (specialPosition?.power === 'color' || runs.some((run) => run.length >= 5) ? 500 : runs.length ? 250 : 0) + Math.max(0, triggeredBombs.size - 1) * 150 + (forcedBombs.length > 1 ? 500 : 0);
    score += clearCoords.length * 60 * (chain + 1) + powerBonus;
    if (chain > bestChain) { bestChain = chain; persistProgress(); }
    if (forcedBombs.length > 1) showToast('MEGA COMBO! +500 bonus');
    else if (chain >= 2) showToast(chain >= 3 ? 'UNSTOPPABLE CASCADE!' : 'AMAZING CASCADE!');
    if (score > best) {
      best = score;
      if (best > runBestAtStart && !personalBestCelebrated) {
        personalBestCelebrated = true;
        showToast('New personal best!');
      }
    }
    saveDailyBest();
    updateStats();
    if (!runs.length && !bombsToTrigger.length) {
      message.textContent = chain > 0 ? 'Combo x' + (chain + 1) + '! Beautiful chain reaction!' : 'Lovely match! Keep it going.';
    }
    playTone(triggeredBombs.size ? 780 : 440 + Math.min(clearCoords.length, 8) * 65, triggeredBombs.size ? .22 : .13, 'triangle');
    // Let bomb blasts play out in deliberate slow motion before the board collapses.
    await sleep(triggeredBombs.size ? 1050 : 230);
    if (runId !== gameRun) return;
    clearCoords.forEach(([row, col]) => {
      if (specialPosition && row === specialPosition.row && col === specialPosition.col) { ice[row][col] = false; return; }
      if (ice[row][col]) { ice[row][col] = false; iceRemaining = Math.max(0, iceRemaining - 1); return; }
      if (currentMode === 'adventure' && levelGoal === 'collect' && gemType(board[row][col]) === TYPES[(currentLevel - 1) % TYPES.length]) goalProgress++;
      board[row][col] = null;
    });
    for (let col = 0; col < SIZE; col++) {
      let write = SIZE - 1;
      for (let row = SIZE - 1; row >= 0; row--) {
        if (board[row][col] !== null) {
          board[write][col] = board[row][col];
          ice[write][col] = ice[row][col];
          write--;
        }
      }
      for (let row = write; row >= 0; row--) { board[row][col] = randomType(); ice[row][col] = false; }
    }
    renderBoard();
    await sleep(100);
    await clearMatches(runId, chain + 1);
  }

  async function trySwap(first, second) {
    if (busy || paused || moves <= 0 || !areAdjacent(first, second)) return;
    busy = true;
    selected = null;
    const runId = gameRun;
    swap(first, second);
    renderBoard();
    const matches = findMatches();
    const swappedBombs = [first, second].filter((point) => isBomb(board[point.row][point.col])).map((point) => {
      const other = point.row === first.row && point.col === first.col ? second : first;
      return { ...point, targetType: gemPower(board[point.row][point.col]) === 'color' && !isBomb(board[other.row][other.col]) ? gemType(board[other.row][other.col]) : null };
    });
    if (!matches.length && !swappedBombs.length) {
      await sleep(150);
      if (runId !== gameRun) return;
      swap(first, second);
      renderBoard();
      message.textContent = 'That swap made no match. Try another pair.';
      playTone(180, .09, 'sine');
      busy = false;
      return;
    }
    moves--;
    updateStats();
    await clearMatches(runId, 0, swappedBombs);
    if (runId !== gameRun) return;
    busy = false;
    if (score < currentTarget && moves > 0 && !hasPossibleMove()) {
      message.textContent = 'No moves left on the board — reshuffling your gems!';
      await sleep(250);
      if (runId !== gameRun) return;
      shuffleBoard();
      showToast('New board, same quest!');
    }
    const objectiveComplete = currentMode !== 'adventure' || (levelGoal === 'ice' ? iceRemaining === 0 : levelGoal === 'collect' ? goalProgress >= goalTarget : true);
    if (score >= currentTarget && objectiveComplete) {
      recordDailyWin();
      gamesWon++;
      const reward = currentMode === 'daily' ? 75 : currentMode === 'adventure' ? 40 + currentLevel * 5 : 20;
      crystalCoins += reward;
      if (currentMode === 'adventure') {
        const stars = score >= currentTarget * 1.8 ? 3 : score >= currentTarget * 1.35 ? 2 : 1;
        levelStars[currentLevel] = Math.max(Number(levelStars[currentLevel]) || 0, stars);
        saveLevelStars();
        adventureLevel = Math.max(adventureLevel, currentLevel + 1);
      }
      persistProgress();
      if (gamesWon === 1) showToast('Achievement unlocked: First Victory!');
      else if (gamesWon === 5) showToast('Achievement unlocked: Crystal Champion!');
      else showToast('+' + reward + ' crystal coins earned!');
      showModal({
        eyebrow: currentMode === 'daily' ? 'DAILY CHALLENGE COMPLETE' : currentMode === 'adventure' ? 'LEVEL COMPLETE · LEVEL ' + currentLevel : 'CRYSTAL QUEST COMPLETE',
        symbol: '✧', title: 'You sparkle!',
        copy: 'You reached ' + score.toLocaleString() + ' points with ' + moves + ' moves left. Earned ' + reward + ' crystal coins. ' + (currentMode === 'adventure' ? 'Stars earned: ' + '★'.repeat(Number(levelStars[currentLevel]) || 1) + '☆'.repeat(3 - (Number(levelStars[currentLevel]) || 1)) + '. Next up: Level ' + adventureLevel + '. ' : currentMode === 'daily' ? 'Daily streak: ' + dailyStreak + ' day' + (dailyStreak === 1 ? '' : 's') + '! ' : '') + 'Beautifully played!',
        actions: [
          { label: currentMode === 'adventure' ? 'Next level' : 'Play again', run: () => startGame(currentMode) },
          { label: 'Back to home', run: goHome }
        ]
      });
      paused = true;
    } else if (moves <= 0) {
      const targetReached = score >= currentTarget && objectiveComplete;
      showModal({
        symbol: targetReached ? '✧' : '◇',
        eyebrow: targetReached ? 'QUEST COMPLETE' : 'KEEP THE SPARKLE ALIVE',
        title: targetReached ? 'You did it!' : 'Out of moves',
        copy: targetReached
          ? 'You scored ' + score.toLocaleString() + ' points and reached your target!'
          : 'You scored ' + score.toLocaleString() + ' points. ' + (score < currentTarget ? 'You were ' + (currentTarget - score).toLocaleString() + ' points away. ' : currentMode === 'adventure' && levelGoal === 'ice' ? iceRemaining + ' frozen tiles remain. ' : currentMode === 'adventure' && levelGoal === 'collect' ? Math.max(0, goalTarget - goalProgress) + ' candies still to collect. ' : '') + 'Try again?',
        actions: [
          { label: 'Try again', run: () => startGame(currentMode) },
          { label: 'Back to home', run: goHome }
        ]
      });
      paused = true;
    }
  }

  boardElement.addEventListener('click', (event) => {
    if (pointerHandled) { pointerHandled = false; return; }
    const tile = event.target.closest('.tile');
    if (!tile || busy || paused || moves <= 0) return;
    const current = coordinates(tile);
    if (!selected) {
      selected = current;
      updateSelection();
      playTone(350, .045);
      return;
    }
    if (selected.row === current.row && selected.col === current.col) {
      selected = null;
      updateSelection();
      return;
    }
    if (areAdjacent(selected, current)) {
      const first = selected;
      selected = null;
      updateSelection();
      trySwap(first, current);
    } else {
      selected = current;
      updateSelection();
    }
  });

  let pointerHandled = false;
  boardElement.addEventListener('pointerdown', (event) => {
    const tile = event.target.closest('.tile');
    if (!tile || event.pointerType === 'mouse' || busy || paused) return;
    pointerStart = { ...coordinates(tile), x: event.clientX, y: event.clientY };
    pointerHandled = false;
  }, { passive: true });

  boardElement.addEventListener('pointerup', (event) => {
    if (!pointerStart || busy || paused) return;
    const start = pointerStart;
    pointerStart = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    const next = { row: start.row, col: start.col };
    if (Math.abs(dx) > Math.abs(dy)) next.col += dx > 0 ? 1 : -1;
    else next.row += dy > 0 ? 1 : -1;
    if (next.row < 0 || next.row >= SIZE || next.col < 0 || next.col >= SIZE) return;
    pointerHandled = true;
    setTimeout(() => { pointerHandled = false; }, 350);
    selected = null;
    updateSelection();
    trySwap(start, next);
  }, { passive: true });

  boardElement.addEventListener('pointercancel', () => { pointerStart = null; }, { passive: true });

  function updateSelection() {
    boardElement.querySelectorAll('.tile').forEach((tile) => {
      const row = Number(tile.dataset.row);
      const col = Number(tile.dataset.col);
      tile.classList.toggle('selected', Boolean(selected && selected.row === row && selected.col === col));
    });
  }

  function hint() {
    if (busy || paused || moves <= 0) return;
    clearTimeout(hintTimer);
    boardElement.querySelectorAll('.hint-tile').forEach((tile) => tile.classList.remove('hint-tile'));
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const candidates = [{ row, col: col + 1 }, { row: row + 1, col }];
        for (const next of candidates) {
          if (next.row >= SIZE || next.col >= SIZE) continue;
          swap({ row, col }, next);
          const valid = findMatches().length > 0;
          swap({ row, col }, next);
          if (valid) {
            const first = boardElement.querySelector('[data-row="' + row + '"][data-col="' + col + '"]');
            const second = boardElement.querySelector('[data-row="' + next.row + '"][data-col="' + next.col + '"]');
            first?.classList.add('hint-tile');
            second?.classList.add('hint-tile');
            message.textContent = 'Try swapping the two glowing gems.';
            hintTimer = setTimeout(() => {
              first?.classList.remove('hint-tile');
              second?.classList.remove('hint-tile');
            }, 1500);
            return;
          }
        }
      }
    }
    shuffleBoard();
    showToast('Board refreshed — find a new match!');
  }

  function showHowToPlay() {
    showModal({
      symbol: '✧', eyebrow: 'YOUR CRYSTAL GUIDE', title: 'How to play',
      copy: 'Tap one gem, then an adjacent gem to swap them. Match 3 or more gems of the same colour to score points. Four in a row creates a row or column bomb; five creates a colour bomb. Match or swap a bomb to detonate it. Bigger matches and chain reactions score more. ' + (currentMode === 'daily' ? 'Reach ' + currentTarget.toLocaleString() + ' points before your ' + currentMoves + ' moves run out!' : 'Reach ' + currentTarget.toLocaleString() + ' points before your ' + currentMoves + ' moves run out!'),
      actions: [
        { label: 'Got it — let’s play', run: () => { hideModal(); if (!gameScreen.classList.contains('hidden')) paused = false; } },
        { label: 'Maybe later', run: () => { if (!gameScreen.classList.contains('hidden')) paused = false; hideModal(); } }
      ]
    });
    if (!gameScreen.classList.contains('hidden')) paused = true;
  }

  $('#play-button').addEventListener('click', () => startGame('classic'));
  $('#daily-button').addEventListener('click', () => startGame('daily'));
  $('#adventure-button').addEventListener('click', () => startGame('adventure'));
  const levelMapButton = $('#level-map-button');
  if (levelMapButton) levelMapButton.addEventListener('click', showLevelMap);
  $('#pause-button').addEventListener('click', pauseGame);
  $('#exit-button').addEventListener('click', () => {
    showModal({
      symbol: '↗', eyebrow: 'LEAVE THE CRYSTAL REALM?', title: 'Head home?',
      copy: 'This round will end if you leave. Want to keep playing instead?',
      actions: [
        { label: 'Keep playing', run: () => { paused = false; hideModal(); } },
        { label: 'Exit to home', run: goHome }
      ]
    });
    paused = true;
  });
  $('#restart-button').addEventListener('click', () => {
    showModal({
      symbol: '↻', eyebrow: 'A FRESH BEGINNING', title: 'Restart round?',
      copy: 'Your current score and moves will reset. Ready for another go?',
      actions: [
        { label: 'Start fresh', run: () => startGame(currentMode) },
        { label: 'Keep this round', run: () => { paused = false; hideModal(); } }
      ]
    });
    paused = true;
  });
  $('#hint-button').addEventListener('click', hint);
  $('#shuffle-button').addEventListener('click', () => {
    if (busy || paused || moves <= 0) return;
    selected = null;
    clearTimeout(hintTimer);
    boardElement.querySelectorAll('.hint-tile').forEach((tile) => tile.classList.remove('hint-tile'));
    shuffleBoard();
    message.textContent = 'Fresh board! Your moves and frozen objectives are unchanged.';
    showToast('Free shuffle — no move used!');
    playTone(620, .12, 'triangle');
  });
  $('#how-button').addEventListener('click', showHowToPlay);
  $('#sound-toggle').addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem('jewel-match-sound', soundOn ? 'on' : 'off'); } catch (_) {}
    $('#sound-toggle').textContent = soundOn ? '♫' : '♪';
    $('#sound-toggle').setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound');
    showToast(soundOn ? 'Sound enabled' : 'Sound muted');
    if (soundOn) playTone(620, .08);
  });
  modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) {
      if (paused && !gameScreen.classList.contains('hidden')) return;
      hideModal();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !gameScreen.classList.contains('hidden') && !paused && moves > 0) {
      pauseGame();
      showToast('Game paused while you were away');
    }
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const modalOpen = !modalBackdrop.classList.contains('hidden');
    if (event.key === 'Escape' && modalOpen) {
      if (paused && !gameScreen.classList.contains('hidden')) return;
      hideModal();
      return;
    }
    if (modalOpen && paused && (key === 'p' || key === ' ') && modalTitle.textContent === 'Paused') {
      event.preventDefault();
      paused = false;
      hideModal();
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || modalOpen ||
        gameScreen.classList.contains('hidden') || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const activeTile = target?.closest('.tile');
    if (activeTile && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const row = Number(activeTile.dataset.row);
      const col = Number(activeTile.dataset.col);
      const delta = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0],
        ArrowLeft: [0, -1], ArrowRight: [0, 1]
      }[event.key];
      const nextRow = Math.max(0, Math.min(SIZE - 1, row + delta[0]));
      const nextCol = Math.max(0, Math.min(SIZE - 1, col + delta[1]));
      boardElement.querySelector('.tile[data-row="' + nextRow + '"][data-col="' + nextCol + '"]')?.focus();
      return;
    }
    if (key === 'm') {
      soundOn = !soundOn;
      try { localStorage.setItem('jewel-match-sound', soundOn ? 'on' : 'off'); } catch (_) {}
      $('#sound-toggle').textContent = soundOn ? '♫' : '♪';
      $('#sound-toggle').setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound');
      showToast(soundOn ? 'Sound enabled' : 'Sound muted');
      if (soundOn) playTone(620, .08);
      return;
    }
    if (key === 'p' || key === ' ') {
      event.preventDefault();
      if (paused) {
        paused = false;
        hideModal();
      } else {
        pauseGame();
      }
    } else if (key === 'h') {
      hint();
    } else if (key === 's') {
      $('#shuffle-button').click();
    } else if (key === 's') {
      $('#shuffle-button').click();
    } else if (key === 'r') {
      showModal({
        symbol: '↻', eyebrow: 'A FRESH BEGINNING', title: 'Restart round?',
        copy: 'Your current score and moves will reset. Ready for another go?',
        actions: [
          { label: 'Start fresh', run: () => startGame(currentMode) },
          { label: 'Keep this round', run: () => { paused = false; hideModal(); } }
        ]
      });
      paused = true;
    }
  });


  let deferredInstallPrompt = null;
  const installButton = $('#install-button');

  function setInstallButton(label, disabled = false) {
    const labelNode = installButton.querySelector('.install-label');
    if (labelNode) labelNode.textContent = label;
    installButton.disabled = disabled;
    installButton.classList.toggle('install-unavailable', disabled);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallButton('Install app');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setInstallButton('Installed', true);
    showToast('Jewel Match installed successfully!');
  });

  installButton.addEventListener('click', async () => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      showToast('Jewel Match is already installed.');
      return;
    }
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const result = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (result && result.outcome === 'accepted') {
        setInstallButton('Installing…', true);
      } else {
        setInstallButton('Install app');
      }
      return;
    }
    showModal({
      symbol: '⇩', eyebrow: 'TAKE THE CRYSTAL QUEST WITH YOU', title: 'Install Jewel Match',
      copy: 'Install availability depends on your browser and whether this site has finished loading over HTTPS. On supported browsers, use the install option in the browser menu. On iPhone or iPad, open the Share menu in Safari and choose “Add to Home Screen”.',
      actions: [{ label: 'Got it', run: hideModal }]
    });
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // The game remains playable if offline caching is unavailable.
      });
    });
  }

  saveBest();
  persistProgress();
})();