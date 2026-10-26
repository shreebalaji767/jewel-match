(() => {
  'use strict';

  const SIZE = 8;
  const TYPES = ['ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'diamond'];
  const CLASSIC_TARGET = 1500;
  const CLASSIC_MOVES = 25;
  let currentTarget = CLASSIC_TARGET;
  let currentMoves = CLASSIC_MOVES;
  let currentMode = 'classic';
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
        tile.setAttribute('aria-label', TYPES.includes(type) ? type + (power ? ', ' + (power === 'color' ? 'colour bomb' : 'line bomb') : '') + ', row ' + (row + 1) + ', column ' + (col + 1) : 'Empty tile');
        const gem = document.createElement('span');
        gem.className = 'gem ' + type + (power ? ' special-gem bomb-' + power : '');
        if (power) {
          const mark = document.createElement('span');
          mark.className = 'bomb-mark';
          mark.textContent = power === 'color' ? '✹' : '✦';
          mark.setAttribute('aria-hidden', 'true');
          tile.appendChild(mark);
        }
        gem.setAttribute('aria-hidden', 'true');
        tile.appendChild(gem);
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

  function startGame(mode = currentMode) {
    currentMode = mode;
    if (currentMode === 'daily') {
      const today = new Date();
      const dayKey = today.getFullYear() * 372 + today.getMonth() * 31 + today.getDate();
      currentTarget = 1800 + (dayKey % 8) * 100;
      currentMoves = 20;
    } else {
      currentTarget = CLASSIC_TARGET;
      currentMoves = CLASSIC_MOVES;
    }
    $('#game-screen .centered-eyebrow').textContent = currentMode === 'daily' ? 'DAILY CRYSTAL CHALLENGE' : 'CRYSTAL QUEST';
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
    renderBoard();
    ensurePossibleMove();
    $('#sound-toggle').textContent = soundOn ? '♫' : '♪';
    message.textContent = 'Match 3 or more gems of the same kind. Swipe or tap to swap.';
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
    const gems = board.flat().sort(() => Math.random() - 0.5);
    board = Array.from({ length: SIZE }, (_, row) => gems.slice(row * SIZE, (row + 1) * SIZE));
    if (findMatches().length || !hasPossibleMove()) {
      board = createBoard();
      if (!hasPossibleMove()) return shuffleBoard();
    }
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
    return [...matched].map((key) => key.split(',').map(Number));
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function clearMatches(runId, chain = 0, forcedBombs = []) {
    if (runId !== gameRun) return;
    const matches = findMatches();
    if (!matches.length && !forcedBombs.length) return;

    const cleared = new Set(matches.map(([row, col]) => row + ',' + col));
    const matchSet = new Set(cleared);
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
    if (runs.length) {
      const run = runs[0];
      const offset = Math.floor(run.length / 2);
      specialPosition = run.direction === 'row'
        ? { row: run.row, col: run.col + offset, power: run.length >= 5 ? 'color' : 'row', type: run.type }
        : { row: run.row + offset, col: run.col, power: run.length >= 5 ? 'color' : 'column', type: run.type };
    }

    const bombsToTrigger = [...forcedBombs];
    matches.forEach(([row, col]) => {
      if (isBomb(board[row][col])) bombsToTrigger.push({ row, col });
    });
    for (const bomb of bombsToTrigger) {
      const gem = board[bomb.row]?.[bomb.col];
      const power = gemPower(gem);
      const type = gemType(gem);
      if (power === 'color') {
        for (let row = 0; row < SIZE; row++) {
          for (let col = 0; col < SIZE; col++) {
            if (gemType(board[row][col]) === type) cleared.add(row + ',' + col);
          }
        }
        message.textContent = 'COLOR BOMB! Every gem of that colour explodes!';
      } else if (power === 'row') {
        for (let col = 0; col < SIZE; col++) cleared.add(bomb.row + ',' + col);
        message.textContent = 'ROW BOMB! The whole row explodes!';
      } else if (power === 'column') {
        for (let row = 0; row < SIZE; row++) cleared.add(row + ',' + bomb.col);
        message.textContent = 'COLUMN BOMB! The whole column explodes!';
      }
    }

    if (specialPosition) {
      cleared.delete(specialPosition.row + ',' + specialPosition.col);
      board[specialPosition.row][specialPosition.col] = specialPosition.type + '|' + specialPosition.power;
      showToast(specialPosition.power === 'color' ? '✹ Color bomb created!' : '✦ Line bomb created!');
    }
    const clearCoords = [...cleared].map((key) => key.split(',').map(Number));
    clearCoords.forEach(([row, col]) => {
      const tile = boardElement.querySelector('.tile[data-row="' + row + '"][data-col="' + col + '"]');
      if (tile) tile.classList.add('matching');
    });
    const powerBonus = runs.some((run) => run.length >= 5) ? 500 : runs.length ? 250 : 0;
    score += clearCoords.length * 60 * (chain + 1) + powerBonus;
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
    playTone(bombsToTrigger.length ? 780 : 440 + Math.min(clearCoords.length, 8) * 65, bombsToTrigger.length ? .22 : .13, 'triangle');
    await sleep(230);
    if (runId !== gameRun) return;
    clearCoords.forEach(([row, col]) => {
      if (!specialPosition || row !== specialPosition.row || col !== specialPosition.col) board[row][col] = null;
    });
    for (let col = 0; col < SIZE; col++) {
      let write = SIZE - 1;
      for (let row = SIZE - 1; row >= 0; row--) {
        if (board[row][col] !== null) {
          board[write][col] = board[row][col];
          write--;
        }
      }
      for (let row = write; row >= 0; row--) board[row][col] = randomType();
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
    const swappedBombs = [first, second].filter((point) => isBomb(board[point.row][point.col]));
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
    if (score >= currentTarget) {
      recordDailyWin();
      showModal({
        eyebrow: currentMode === 'daily' ? 'DAILY CHALLENGE COMPLETE' : 'CRYSTAL QUEST COMPLETE',
        symbol: '✧', title: 'You sparkle!',
        copy: 'You reached ' + score.toLocaleString() + ' points with ' + moves + ' moves left. ' + (currentMode === 'daily' ? 'Daily streak: ' + dailyStreak + ' day' + (dailyStreak === 1 ? '' : 's') + '! ' : '') + 'Beautifully played!',
        actions: [
          { label: 'Play again', run: () => startGame(currentMode) },
          { label: 'Back to home', run: goHome }
        ]
      });
      paused = true;
    } else if (moves <= 0) {
      const targetReached = score >= currentTarget;
      showModal({
        symbol: targetReached ? '✧' : '◇',
        eyebrow: targetReached ? 'QUEST COMPLETE' : 'KEEP THE SPARKLE ALIVE',
        title: targetReached ? 'You did it!' : 'Out of moves',
        copy: targetReached
          ? 'You scored ' + score.toLocaleString() + ' points and reached your target!'
          : 'You scored ' + score.toLocaleString() + ' of ' + currentTarget.toLocaleString() + ' points. You were ' + (currentTarget - score).toLocaleString() + ' points away. One more round?',
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
      copy: 'Tap one gem, then an adjacent gem to swap them. Match 3 or more gems of the same colour to score points. Four in a row creates a Crystal Burst; five creates a Prism Blast. Bigger matches and chain reactions score more. ' + (currentMode === 'daily' ? 'Reach ' + currentTarget.toLocaleString() + ' points before your ' + currentMoves + ' moves run out!' : 'Reach ' + currentTarget.toLocaleString() + ' points before your ' + currentMoves + ' moves run out!'),
      actions: [
        { label: 'Got it — let’s play', run: () => { hideModal(); if (!gameScreen.classList.contains('hidden')) paused = false; } },
        { label: 'Maybe later', run: () => { if (!gameScreen.classList.contains('hidden')) paused = false; hideModal(); } }
      ]
    });
    if (!gameScreen.classList.contains('hidden')) paused = true;
  }

  $('#play-button').addEventListener('click', () => startGame('classic'));
  $('#daily-button').addEventListener('click', () => startGame('daily'));
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
})();