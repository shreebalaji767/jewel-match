(() => {
  'use strict';

  const SIZE = 8;
  const TYPES = ['ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'diamond'];
  const TARGET = 1500;
  const START_MOVES = 25;
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
  let moves = START_MOVES;
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
  try { soundOn = localStorage.getItem('jewel-match-sound') !== 'off'; } catch (_) {}

  function readBest() {
    try { return Number(localStorage.getItem('jewel-match-best')) || 0; }
    catch (_) { return 0; }
  }

  function saveBest() {
    try { localStorage.setItem('jewel-match-best', String(best)); } catch (_) {}
    $('#best-home').textContent = 'BEST SCORE  ' + best.toLocaleString();
    $('#best-game').textContent = 'BEST  ' + best.toLocaleString();
  }

  function randomType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }

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
        tile.setAttribute('aria-label', TYPES.includes(board[row][col]) ? board[row][col] + ', row ' + (row + 1) + ', column ' + (col + 1) : 'Empty tile');
        const gem = document.createElement('span');
        gem.className = 'gem ' + (board[row][col] || '');
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
    $('#target-value').textContent = TARGET.toLocaleString();
    $('#moves-value').textContent = moves;
    $('#progress-fill').style.width = Math.min(100, score / TARGET * 100) + '%';
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

  function startGame() {
    gameRun++;
    clearTimeout(hintTimer);
    homeScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    hideModal();
    score = 0;
    moves = START_MOVES;
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
        const gem = board[row][start];
        let end = start + 1;
        while (gem && end < SIZE && board[row][end] === gem) end++;
        if (gem && end - start >= 3) {
          for (let col = start; col < end; col++) matched.add(row + ',' + col);
        }
        start = end;
      }
    }
    for (let col = 0; col < SIZE; col++) {
      let start = 0;
      while (start < SIZE) {
        const gem = board[start][col];
        let end = start + 1;
        while (gem && end < SIZE && board[end][col] === gem) end++;
        if (gem && end - start >= 3) {
          for (let row = start; row < end; row++) matched.add(row + ',' + col);
        }
        start = end;
      }
    }
    return [...matched].map((key) => key.split(',').map(Number));
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function clearMatches(runId, chain = 0) {
    if (runId !== gameRun) return;
    const matches = findMatches();
    if (!matches.length) return;
    const tiles = [...boardElement.querySelectorAll('.tile')];
    matches.forEach(([row, col]) => {
      const tile = tiles[row * SIZE + col];
      if (tile) tile.classList.add('matching');
    });
    score += matches.length * 60 * (chain + 1);
    if (score > best) best = score;
    updateStats();
    message.textContent = chain > 0 ? 'Combo x' + (chain + 1) + '! Beautiful chain reaction!' : (matches.length >= 5 ? 'Brilliant! A spectacular match!' : 'Lovely match! Keep it going.');
    playTone(440 + Math.min(matches.length, 8) * 65, .13, 'triangle');
    await sleep(230);
    if (runId !== gameRun) return;
    matches.forEach(([row, col]) => { board[row][col] = null; });
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
    let matches = findMatches();
    if (!matches.length) {
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
    await clearMatches(runId);
    if (runId !== gameRun) return;
    busy = false;
    if (score < TARGET && moves > 0 && !hasPossibleMove()) {
      message.textContent = 'No moves left on the board — reshuffling your gems!';
      await sleep(250);
      if (runId !== gameRun) return;
      shuffleBoard();
      showToast('New board, same quest!');
    }
    if (score >= TARGET) {
      showModal({
        symbol: '✧', eyebrow: 'CRYSTAL QUEST COMPLETE', title: 'You sparkle!',
        copy: 'You reached ' + score.toLocaleString() + ' points with ' + moves + ' moves left. Beautifully played!',
        actions: [
          { label: 'Play again', run: startGame },
          { label: 'Back to home', run: goHome }
        ]
      });
      paused = true;
    } else if (moves <= 0) {
      showModal({
        symbol: '◇', eyebrow: 'EVERY GEM COUNTS', title: 'Quest complete',
        copy: 'You scored ' + score.toLocaleString() + ' points. ' + (score >= TARGET ? 'Target reached!' : 'Reach ' + TARGET.toLocaleString() + ' points next time to complete the quest.'),
        actions: [
          { label: 'Try again', run: startGame },
          { label: 'Back to home', run: goHome }
        ]
      });
      paused = true;
    }
  }

  boardElement.addEventListener('click', (event) => {
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
      copy: 'Tap one gem, then an adjacent gem to swap them. Match 3 or more gems of the same colour to score points. Bigger matches and chain reactions score more. Reach 1,500 points before your 25 moves run out!',
      actions: [
        { label: 'Got it — let’s play', run: () => { hideModal(); if (!gameScreen.classList.contains('hidden')) paused = false; } },
        { label: 'Maybe later', run: () => { if (!gameScreen.classList.contains('hidden')) paused = false; hideModal(); } }
      ]
    });
    if (!gameScreen.classList.contains('hidden')) paused = true;
  }

  $('#play-button').addEventListener('click', startGame);
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
        { label: 'Start fresh', run: startGame },
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
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modalBackdrop.classList.contains('hidden')) {
      if (paused && !gameScreen.classList.contains('hidden')) return;
      hideModal();
    }
  });

  saveBest();
})();