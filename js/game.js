(() => {
  'use strict';

  const SIZE = 8;
  const TYPES = ['ruby', 'sapphire', 'emerald', 'amethyst', 'topaz', 'diamond'];
  const CLASSIC_TARGET = 1500;
  const CLASSIC_MOVES = 25;
  let currentTarget = CLASSIC_TARGET;
  let currentMoves = CLASSIC_MOVES;
  let currentMode = 'classic';
  const DIFFICULTIES = {
    easy: { label: 'Easy', target: 0.72, moves: 8, ice: 0.72 },
    normal: { label: 'Normal', target: 1, moves: 0, ice: 1 },
    hard: { label: 'Hard', target: 1.4, moves: -4, ice: 1.35 },
    expert: { label: 'Expert', target: 1.85, moves: -8, ice: 1.75 }
  };
  let currentDifficulty = readDifficulty();
  function readDifficulty() { try { const value=localStorage.getItem('jewel-match-difficulty'); return value && ['easy','normal','hard','expert'].includes(value) ? value : 'normal'; } catch (_) { return 'normal'; } }
  function difficultySettings() { return DIFFICULTIES[currentDifficulty] || DIFFICULTIES.normal; }
  function updateDifficultyButton() { const button=$('#difficulty-button'); if(button) button.textContent='🎚 Difficulty: '+difficultySettings().label; }
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
  let undoSnapshot = null;
  let best = readBest();
  let runBestAtStart = best;
  let personalBestCelebrated = false;
  let dailyStreak = readDailyStreak();
  let reducedEffects = readSetting('jewel-match-reduced-effects', false);
  let shapeAssist = readSetting('jewel-match-shape-assist', false);
  try { soundOn = localStorage.getItem('jewel-match-sound') !== 'off'; } catch (_) {}

  function readSetting(key, fallback = false) { try { const v=localStorage.getItem(key); return v===null?fallback:v==='true'; } catch (_) { return fallback; } }
  function saveSetting(key,value) { try { localStorage.setItem(key,String(Boolean(value))); } catch (_) {} }
  function readAchievements() { try { return JSON.parse(localStorage.getItem('jewel-match-achievements')||'{}')||{}; } catch (_) { return {}; } }
  function unlockAchievement(id,title,reward=0) {
    const a=readAchievements(); if(a[id]) return false; a[id]={title,date:todayKey()};
    try { localStorage.setItem('jewel-match-achievements',JSON.stringify(a)); } catch (_) {}
    if(reward){crystalCoins+=reward;persistProgress();showToast('🏆 '+title+' unlocked! +'+reward+' coins');} else showToast('🏆 Achievement unlocked: '+title+'!');
    return true;
  }
  function checkAchievements() {
    if(gamesWon>=1) unlockAchievement('first-win','First Sparkle',10);
    if(gamesWon>=5) unlockAchievement('five-wins','Crystal Champion',25);
    if(gamesWon>=25) unlockAchievement('twenty-five-wins','Sugar Superstar',75);
    if(bestChain>=3) unlockAchievement('cascade-three','Cascade Crafter',15);
    if(bestChain>=6) unlockAchievement('cascade-six','Chain Reaction Master',40);
    if(dailyStreak>=3) unlockAchievement('streak-three','Daily Sweet Tooth',30);
    if(dailyStreak>=7) unlockAchievement('streak-seven','Week of Wonder',100);
    if(Object.keys(levelStars).length>=10) unlockAchievement('ten-levels','Trailblazer',60);
    if(Object.values(levelStars).some((x)=>Number(x)>=3)) unlockAchievement('three-stars','Perfect Shine',20);
  }
  function showAchievements() {
    const a=readAchievements(), e=[['first-win','First Sparkle','Win your first round',10],['five-wins','Crystal Champion','Win 5 rounds',25],['twenty-five-wins','Sugar Superstar','Win 25 rounds',75],['cascade-three','Cascade Crafter','Reach a 3+ chain',15],['cascade-six','Chain Reaction Master','Reach a 6+ chain',40],['streak-three','Daily Sweet Tooth','Build a 3-day daily streak',30],['streak-seven','Week of Wonder','Build a 7-day daily streak',100],['ten-levels','Trailblazer','Earn stars on 10 levels',60],['three-stars','Perfect Shine','Earn three stars on a level',20]];
    const n=e.filter(([id])=>a[id]).length, textLines=e.map(([id,t,d,r])=>(a[id]?'🏆 ':'🔒 ')+t+' — '+d+(a[id]?' ✓':' · +'+r+' coins')).join(' • ');
    showModal({symbol:'🏆',eyebrow:'YOUR COLLECTION BOOK',title:'Achievements '+n+'/'+e.length,copy:textLines+' • Wins: '+gamesWon+' • Best chain: '+bestChain+' • Daily streak: '+dailyStreak,actions:[{label:'Close collection',run:hideModal}]});
  }
  function exportSave() {
    const keys=['jewel-match-difficulty','jewel-match-level','jewel-match-coins','jewel-match-wins','jewel-match-best-chain','jewel-match-stars','jewel-match-best','jewel-match-daily-streak','jewel-match-daily-last-win','jewel-match-sound','jewel-match-daily-gift-date','jewel-match-achievements','jewel-match-reduced-effects','jewel-match-shape-assist'];
    const data={app:'Jewel Match',format:1,exportedAt:new Date().toISOString(),progress:{}};
    keys.forEach((key)=>{try{const v=localStorage.getItem(key);if(v!==null)data.progress[key]=v;}catch(_){}});
    try { for (let i=0;i<localStorage.length;i++) { const key=localStorage.key(i); if (key && key.startsWith('jewel-match-daily-best-')) data.progress[key]=localStorage.getItem(key); } } catch (_) {}
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})), link=document.createElement('a');
    link.href=url;link.download='jewel-match-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Save backup exported.');
  }
  function importSave() {
    const raw=window.prompt('Paste the contents of your Jewel Match save JSON backup. Import replaces matching progress keys on this browser.');
    if(!raw)return;
    try { const d=JSON.parse(raw); if(!d||d.app!=='Jewel Match'||d.format!==1||!d.progress||typeof d.progress!=='object'||Array.isArray(d.progress))throw Error('invalid');
      const allowed=new Set(['jewel-match-difficulty','jewel-match-level','jewel-match-coins','jewel-match-wins','jewel-match-best-chain','jewel-match-stars','jewel-match-best','jewel-match-daily-streak','jewel-match-daily-last-win','jewel-match-sound','jewel-match-daily-gift-date','jewel-match-achievements','jewel-match-reduced-effects','jewel-match-shape-assist']);
      Object.entries(d.progress).forEach(([k,v])=>{if((allowed.has(k)||/^jewel-match-daily-best-\d{4}-\d{2}-\d{2}$/.test(k))&&typeof v==='string')localStorage.setItem(k,v);});window.location.reload();
    } catch (_) {showToast('Import failed: invalid Jewel Match backup.');}
  }
  function showSaveTools() { showModal({symbol:'💾',eyebrow:'YOUR PROGRESS, YOUR DEVICE',title:'Save tools',copy:'Export a JSON backup or import a backup by pasting its contents. Progress stays on this device; there is no account or database. Import replaces matching local progress keys.',actions:[{label:'Export save JSON',run:exportSave},{label:'Import save JSON',run:importSave},{label:'Close',run:hideModal}]}); }
  function showGameSettings() {
    showModal({symbol:'⚙',eyebrow:'MAKE IT YOURS',title:'Game settings',copy:'Visual effects: '+(reducedEffects?'reduced':'full')+'. Shape assist: '+(shapeAssist?'on':'off')+'. Shape markers help distinguish gems without relying only on colour.',actions:[
      {label:reducedEffects?'Enable full effects':'Reduce animations',run:()=>{reducedEffects=!reducedEffects;saveSetting('jewel-match-reduced-effects',reducedEffects);document.body.classList.toggle('reduced-effects',reducedEffects);showGameSettings();}},
      {label:shapeAssist?'Turn shape assist off':'Turn shape assist on',run:()=>{shapeAssist=!shapeAssist;saveSetting('jewel-match-shape-assist',shapeAssist);renderBoard();showGameSettings();}},
      {label:'Close settings',run:hideModal}]});
  }

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
    const worlds = [
      { icon: '🍓', name: 'Berry Grove' }, { icon: '🍋', name: 'Lemon Lagoon' },
      { icon: '🍇', name: 'Grape Galaxy' }, { icon: '🍊', name: 'Citrus Canyon' },
      { icon: '🍭', name: 'Candy Castle' }, { icon: '💎', name: 'Crystal Caves' },
      { icon: '🍰', name: 'Sugar Summit' }, { icon: '🌈', name: 'Rainbow Ridge' },
      { icon: '🍬', name: 'Sweetwood' }, { icon: '👑', name: 'Royal Confection' }
    ];
    for (let level = 1; level <= 100; level++) {
      const stars = Number(levelStars[level]) || 0;
      const world = worlds[Math.floor((level - 1) / 10) % worlds.length];
      const boss = level % 10 === 0;
      const label = boss ? '👑 BOSS ' + level : world.icon + ' ' + level;
      actions.push({ label: label + '  ' + (stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '· · ·'), run: () => startGame('adventure', level) });
    }
    actions.unshift({ label: '∞ Choose any level', run: () => { const raw=window.prompt('Choose any Sugar Trail level number. Levels continue forever.', String(adventureLevel)); if(raw===null)return; const level=Number(raw.trim()); if(!Number.isSafeInteger(level)||level<1){showToast('Enter a whole level number greater than zero.');return;} startGame('adventure',level); } });
    actions.unshift({ label: '▶ Continue · Level '+adventureLevel+' · '+difficultySettings().label, run: () => startGame('adventure') });
    actions.push({ label: 'Close map', run: hideModal });
    showModal({symbol:'🗺',eyebrow:'SUGAR TRAIL · INFINITE WORLDS',title:'Choose a level',copy:worlds.map((world,index)=>((index+1)+'. '+world.name)).join('  •  ')+'. Worlds repeat with tougher goals forever. Every 10th level is a boss challenge with frozen tiles and a 100-coin chest. Choose any level number, with no final level.',actions});
  }

  function dailyGiftClaimedToday() {
    try { return localStorage.getItem('jewel-match-daily-gift-date') === todayKey(); } catch (_) { return false; }
  }

  function updateDailyGiftButton() {
    const button = $('#daily-gift-button');
    if (!button) return;
    const claimed = dailyGiftClaimedToday();
    button.disabled = claimed;
    button.classList.toggle('claimed', claimed);
    const title = $('#daily-gift-title');
    const copy = $('#daily-gift-copy');
    const status = $('#daily-gift-status');
    if (title) title.textContent = claimed ? 'Daily gift claimed' : 'Daily crystal gift';
    if (copy) copy.textContent = claimed ? 'Come back tomorrow for 50 coins' : 'Claim 50 free coins today';
    if (status) status.textContent = claimed ? '✓' : '＋';
    button.setAttribute('aria-label', claimed ? 'Daily crystal gift already claimed today' : 'Claim 50 free crystal coins');
  }

  function claimDailyGift() {
    if (dailyGiftClaimedToday()) {
      updateDailyGiftButton();
      showToast('Your next free gift arrives tomorrow!');
      return;
    }
    crystalCoins += 50;
    try { localStorage.setItem('jewel-match-daily-gift-date', todayKey()); } catch (_) {}
    persistProgress();
    updateDailyGiftButton();
    playTone(660, .12, 'triangle');
    showToast('🎁 Daily gift claimed: +50 free coins!');
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
        if (shapeAssist) { const shape=document.createElement('span'); shape.className='shape-assist'; shape.textContent=({ruby:'●',sapphire:'◆',emerald:'▲',amethyst:'■',topaz:'★',diamond:'✚'})[type]||'•'; shape.setAttribute('aria-hidden','true'); tile.appendChild(shape); }
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

  function updateUndoButton() {
    const button = $('#undo-button');
    const modalOpen = !modalBackdrop.classList.contains('hidden');
    if (button) button.disabled = !undoSnapshot || busy || paused || modalOpen;
  }

  function undoLastMove() {
    if (!undoSnapshot || busy || paused || !modalBackdrop.classList.contains('hidden')) return;
    const snapshot = undoSnapshot;
    undoSnapshot = null;
    board = snapshot.board.map((row) => row.slice());
    ice = snapshot.ice.map((row) => row.slice());
    score = snapshot.score;
    moves = snapshot.moves;
    goalProgress = snapshot.goalProgress;
    iceRemaining = snapshot.iceRemaining;
    crystalCoins = snapshot.crystalCoins;
    bestChain = snapshot.bestChain;
    selected = null;
    paused = false;
    hideModal();
    renderBoard();
    updateStats();
    persistProgress();
    updateUndoButton();
    message.textContent = 'Last move undone. Your score, moves, candies, and frozen tiles are restored.';
    showToast('↶ Move undone — try a different match!');
    playTone(300, .1, 'sine');
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

  function showModal({ symbol = '✦', eyebrow = 'A MOMENT TO SHINE', title, copy, actions, celebration = false }) {
    modalBackdrop.classList.toggle('victory-celebration', celebration);
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

  function hideModal() { modalBackdrop.classList.add('hidden'); modalBackdrop.classList.remove('victory-celebration'); }

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

  function showDifficultyPicker() {
    const options=Object.entries(DIFFICULTIES);
    showModal({symbol:'🎚',eyebrow:'SUGAR TRAIL SETTINGS',title:'Choose difficulty',copy:'Difficulty changes score targets, available moves, and frozen-tile objectives. Your choice is saved on this device and applies to every infinite Sugar Trail level.',actions:options.map(([id,config])=>({label:(currentDifficulty===id?'✓ ':'')+config.label,run:()=>{currentDifficulty=id;try{localStorage.setItem('jewel-match-difficulty',id);}catch(_){}updateDifficultyButton();showModal({symbol:'🍬',eyebrow:'DIFFICULTY SAVED',title:config.label+' mode',copy:'Sugar Trail difficulty is now '+config.label+'. Your progress and selected difficulty are saved locally.',actions:[{label:'Play Sugar Trail',run:()=>startGame('adventure')},{label:'Choose a level',run:showLevelMap},{label:'Close',run:hideModal}]});}})).concat([{label:'Back to home',run:hideModal}])});
  }

  function startGame(mode = currentMode, requestedLevel = null) {
    currentMode = mode;
    if (mode === 'adventure' && Number.isSafeInteger(requestedLevel) && requestedLevel > 0) currentLevel = requestedLevel;
    else if (mode === 'adventure') currentLevel = adventureLevel;
    if (currentMode === 'daily') {
      const today = new Date();
      const dayKey = today.getFullYear() * 372 + today.getMonth() * 31 + today.getDate();
      currentTarget = 1800 + (dayKey % 8) * 100;
      currentMoves = 20;
    } else if (currentMode === 'adventure') {
      const difficulty=difficultySettings();
      currentTarget = Math.round((900 + currentLevel * 220) * difficulty.target);
      currentMoves = Math.max(10, 28 - Math.floor(Math.log2(currentLevel + 1) * 1.6) + difficulty.moves);
      levelGoal = currentLevel % 10 === 0 ? 'ice' : currentLevel % 3 === 0 ? 'ice' : currentLevel % 4 === 0 ? 'collect' : 'score';
      const baseIce=Math.min(24,2+Math.floor(Math.log2(currentLevel+1)*2));
      goalTarget = levelGoal === 'ice' ? Math.min(36,Math.max(2,Math.round(baseIce*difficulty.ice))) : levelGoal === 'collect' ? 12 + currentLevel : currentTarget;
      goalProgress = 0;
    } else {
      currentTarget = CLASSIC_TARGET;
      currentMoves = CLASSIC_MOVES;
    }
    $('#game-screen .centered-eyebrow').textContent = currentMode === 'daily' ? 'DAILY CRYSTAL CHALLENGE' : currentMode === 'adventure' ? (currentLevel % 10 === 0 ? 'SUGAR TRAIL · BOSS LEVEL ' : 'SUGAR TRAIL · LEVEL ') + currentLevel : 'CRYSTAL QUEST';
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
    undoSnapshot = null;
    updateUndoButton();
    busy = false;
    paused = false;
    board = createBoard();
    ice = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    if (currentMode === 'adventure' && (levelGoal === 'ice' || currentLevel >= 3)) {
      const iceCount = levelGoal === 'ice' ? goalTarget : Math.min(24, 2 + Math.floor(Math.log2(currentLevel + 1) * 2));
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
    message.textContent = currentMode === 'adventure' ? (currentLevel % 10 === 0 ? 'BOSS CHALLENGE! Break every frozen tile and beat the score target!' : levelGoal === 'ice' ? 'Clear every frozen tile and reach the score target!' : levelGoal === 'collect' ? 'Collect ' + goalTarget + ' candies of one colour and reach the score target!' : 'Reach the score target before moves run out!') : 'Match 3 or more candies. Swap, cascade, and make special candies!';
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
    updateUndoButton();
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
    // Special-candy combos have distinct effects: colour + colour clears the board;
    // colour + another special converts the colour bomb into that special's colour.
    const forcedColourBombs = forcedBombs.filter(({ row, col }) => gemPower(board[row]?.[col]) === 'color');
    if (forcedBombs.length > 1 && forcedColourBombs.length === 1) {
      const colourBomb = forcedColourBombs[0];
      const partner = forcedBombs.find((bomb) => bomb !== colourBomb);
      if (partner) colourBomb.targetType = gemType(board[partner.row]?.[partner.col]);
    }
    forcedBombs.forEach(({ row, col, targetType }) => enqueueBomb(row, col, targetType));
    if (forcedBombs.length > 1 && forcedColourBombs.length > 1) {
      for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) cleared.add(row + ',' + col);
      message.textContent = 'RAINBOW FUSION! THE WHOLE BOARD EXPLODES!';
    } else if (forcedBombs.length > 1) {
      message.textContent = forcedColourBombs.length === 1 ? 'RAINBOW SUPER COMBO! One colour turns into a special-candy chain!' : 'SUPER COMBO! Special-candy blasts combine!';
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
    const comboMultiplier=Math.min(5,chain+1);
    score += Math.round(clearCoords.length * 60 * comboMultiplier) + powerBonus;
    if (chain > bestChain) { bestChain = chain; persistProgress(); checkAchievements(); }
    if (chain >= 2) message.textContent='SWEET COMBO ×'+comboMultiplier+' · CASCADE BONUS';
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
    const moveSnapshot = {
      board: board.map((row) => row.slice()),
      ice: ice.map((row) => row.slice()),
      score, moves, goalProgress, iceRemaining, crystalCoins, bestChain
    };
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
    undoSnapshot = moveSnapshot;
    moves--;
    updateUndoButton();
    updateStats();
    await clearMatches(runId, 0, swappedBombs);
    if (runId !== gameRun) return;
    busy = false;
    updateUndoButton();
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
      const moveBonus=moves*100;
      const bossLevel = currentMode === 'adventure' && currentLevel % 10 === 0;
      const chestBonus = bossLevel ? 100 : gamesWon % 5 === 0 ? 50 : 0;
      score+=moveBonus;
      if(score>best){best=score;if(best>runBestAtStart&&!personalBestCelebrated){personalBestCelebrated=true;showToast('New personal best!');}}
      saveDailyBest();
      saveBest();
      const reward=(currentMode==='daily'?75:currentMode==='adventure'?40+currentLevel*5:20)+moves*5+chestBonus;
      crystalCoins += reward;
      if (currentMode === 'adventure') {
        const stars = score >= currentTarget * 1.8 ? 3 : score >= currentTarget * 1.35 ? 2 : 1;
        levelStars[currentLevel] = Math.max(Number(levelStars[currentLevel]) || 0, stars);
        saveLevelStars();
        adventureLevel = Math.max(adventureLevel, currentLevel + 1);
      }
      persistProgress();
      checkAchievements();
      if(chestBonus) showToast('🧰 TREASURE CHEST! +'+chestBonus+' bonus coins!');
      else showToast('+'+reward+' coins · +'+moveBonus.toLocaleString()+' unused-move bonus!');
      showModal({
        eyebrow: currentMode === 'daily' ? 'DAILY CHALLENGE COMPLETE' : currentMode === 'adventure' ? (bossLevel ? 'BOSS DEFEATED · LEVEL ' : 'LEVEL COMPLETE · LEVEL ') + currentLevel : 'CRYSTAL QUEST COMPLETE',
        symbol: bossLevel ? '👑' : '✧', title: bossLevel ? 'Boss defeated!' : 'You sparkle!',
        celebration: true,
        copy: 'You reached ' + score.toLocaleString() + ' points with ' + moves + ' moves left. Earned ' + reward + ' crystal coins including +' + (moves*5) + ' for unused moves' + (chestBonus?' and a treasure chest bonus of '+chestBonus+' coins':'') + '. ' + (bossLevel ? 'Boss chest claimed! ' : '') + (currentMode === 'adventure' ? 'Stars earned: ' + '★'.repeat(Number(levelStars[currentLevel]) || 1) + '☆'.repeat(3 - (Number(levelStars[currentLevel]) || 1)) + '. Next up: Level ' + adventureLevel + '. ' : currentMode === 'daily' ? 'Daily streak: ' + dailyStreak + ' day' + (dailyStreak === 1 ? '' : 's') + '! ' : '') + 'Beautifully played!',
        actions: [
          { label: currentMode === 'adventure' ? 'Next Level → ' + (currentLevel + 1) : 'Play again', run: () => currentMode === 'adventure' ? startGame('adventure', currentLevel + 1) : startGame(currentMode) },
          { label: 'Back to home', run: goHome }
        ]
      });
      paused = true;
      updateUndoButton();
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
          { label: currentMode === 'adventure' ? '↻ Replay Level ' + currentLevel : '↻ Play Again', run: () => startGame(currentMode, currentMode === 'adventure' ? currentLevel : null) },
          { label: 'Back to home', run: goHome }
        ]
      });
      paused = true;
      updateUndoButton();
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
      copy: 'Tap one gem, then an adjacent gem to swap them. Match 3 or more gems of the same colour to score points. Four in a line or a same-colour 2×2 square creates a gift box; five in a line creates a rainbow colour bomb; a T/L match creates a wrapped candy. Gift boxes blast a 3×3 area and award free coins. Match or swap a special candy to trigger it. Bigger matches and chain reactions score more. ' + (currentMode === 'daily' ? 'Reach ' + currentTarget.toLocaleString() + ' points before your ' + currentMoves + ' moves run out!' : 'Reach ' + currentTarget.toLocaleString() + ' points before your ' + currentMoves + ' moves run out!'),
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
  const dailyGiftButton = $('#daily-gift-button');
  if (dailyGiftButton) dailyGiftButton.addEventListener('click', claimDailyGift);
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
    updateUndoButton();
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
    updateUndoButton();
  });
  $('#hint-button').addEventListener('click', hint);
  $('#undo-button').addEventListener('click', undoLastMove);
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
  $('#achievements-button')?.addEventListener('click',showAchievements);
  $('#save-tools-button')?.addEventListener('click',showSaveTools);
  $('#settings-button')?.addEventListener('click',showGameSettings);
  $('#difficulty-button')?.addEventListener('click',showDifficultyPicker);
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
    } else if (key === 'u') {
      undoLastMove();
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
      updateUndoButton();
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

  document.body.classList.toggle('reduced-effects',reducedEffects);
  saveBest();
  persistProgress();
  updateDailyGiftButton();
  updateDifficultyButton();
  checkAchievements();
})();