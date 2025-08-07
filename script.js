document.addEventListener('DOMContentLoaded', () => {
    // --- !! 金鑰設定 !! ---
    // 請將您在 Firebase 網站上複製的 firebaseConfig 物件貼在這裡
    const firebaseConfig = {
      apiKey: "AIzaSyBuL3hNZEmzRzYC1bY0mI_G8BTFG6Luzg8",
      authDomain: "mahcal.firebaseapp.com",
      projectId: "mahcal",
      storageBucket: "mahcal.firebasestorage.app",
      messagingSenderId: "659061716522",
      appId: "1:659061716522:web:d608603216e1850354f553"
    };

    // --- Firebase 初始化 ---
    let db;
    try {
        if (firebaseConfig.apiKey.startsWith("請貼上")) {
            throw new Error("Firebase config not set");
        }
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    } catch (e) {
        console.error("Firebase 初始化失敗，『找牌咖』功能將無法使用。請確認 script.js 中的 firebaseConfig 是否已正確設定。");
        const finderNavBtn = document.getElementById('nav-finder');
        if(finderNavBtn) {
            finderNavBtn.style.display = 'none';
        }
    }

    // --- 常數與全局變數 ---
    const TILE_TYPES = { 'm': '萬', 'p': '筒', 's': '條', 'z': '字' };
    const Z_TILES = ['東', '南', '西', '北', '中', '發', '白'];
    const TILES = {
        'm': Array.from({length: 9}, (_, i) => `${i + 1}萬`),
        'p': Array.from({length: 9}, (_, i) => `${i + 1}筒`),
        's': Array.from({length: 9}, (_, i) => `${i + 1}條`),
        'z': Z_TILES
    };
    const ALL_TILES = [].concat(TILES.m, TILES.p, TILES.s, TILES.z);
    const EMOJIS = ['😀', '😎', '😇', '😂', '🥳', '🤩', '🤯', '🤗'];

    let userHand = [];
    let players = [];
    let stake = { base: 0, 台: 0 };
    let challengeState = {};
    
    // 招財神遊戲狀態
    let blessingTimerId = null;
    let slotGame = { spinsLeft: 5, isSpinning: false, reelHeight: 100, tileHeight: 80 };
    let whackGame = { score: 0, timeLeft: 15, targetScore: 88, gameTimerId: null, popupTimerId: null, goodTiles: ['發', '中', '8萬', '8筒', '8條'], badTiles: ['4筒', '4萬', '4條'], isActive: false };
    let sequenceGame = { secret: [], user: [], attemptsLeft: 3 };
    let purificationGame = { sequence: [], currentIndex: 0, clicksNeeded: 15, currentClicks: 0, timePerTile: 3000, timerId: null, isActive: false };
    let dragonPearlGame = {isActive: false, animationId: null};
    let memoryMatchGame = { cards: [], flippedCards: [], movesLeft: 30, matchedPairs: 0, totalPairs: 6, isChecking: false };
    let chosenOneGame = { cards: [], correctCardIndex: -1, isShuffling: false};
    let windRisesGame = { sequence: [], userSequence: [], level: 1, isDisplaying: false, isActive: false };

    // --- DOM 元素 ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const contentSections = document.querySelectorAll('.content-section');
    const userHandDisplay = document.getElementById('user-hand');
    const tileSelectionGrid = document.getElementById('tile-selection');
    const calculateBtn = document.getElementById('calculate-btn');
    const clearHandBtn = document.getElementById('clear-hand-btn');
    const calculatorResultArea = document.getElementById('calculator-result-area');
    const challengeTingBtn = document.getElementById('challenge-ting-btn');
    const challengeDaTingBtn = document.getElementById('challenge-da-ting-btn');
    const challengeQuestion = document.getElementById('challenge-question');
    const challengeHandDisplay = document.getElementById('challenge-hand');
    const challengeAnswerArea = document.getElementById('challenge-answer-area');
    const challengeFeedback = document.getElementById('challenge-feedback');
    const nextChallengeBtn = document.getElementById('next-challenge-btn');
    const counterSetup = document.getElementById('counter-setup');
    const counterMain = document.getElementById('counter-main');
    const startGameBtn = document.getElementById('start-game-btn');
    const zimoBtn = document.getElementById('zimo-btn');
    const huBtn = document.getElementById('hu-btn');
    const settleBtn = document.getElementById('settle-btn');
    const mainModal = document.getElementById('modal');
    const mainModalBody = document.getElementById('modal-body');
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const themeColorPicker = document.getElementById('theme-color-picker');
    const privacyPolicyBtn = document.getElementById('privacy-policy-btn');
    const taishuTableBtn = document.getElementById('taishu-table-btn');
    const baopaiRulesBtn = document.getElementById('baopai-rules-btn');
    const diceContainer = document.getElementById('dice-container');
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const diceResultArea = document.getElementById('dice-result-area');
    const luckyColorEl = document.getElementById('lucky-color');
    const wealthIndexEl = document.getElementById('wealth-index');
    const benefactorTilesEl = document.getElementById('benefactor-tiles');
    const gameHallContainer = document.getElementById('game-hall-container');
    const blessingCountdownArea = document.getElementById('blessing-countdown-area');
    const gameSelectionMenu = document.getElementById('game-selection-menu');
    const gameChoiceBtns = document.querySelectorAll('.game-choice-btn');
    const ritualGameContainers = document.querySelectorAll('.ritual-game-container');
    const backToSelectionBtns = document.querySelectorAll('.back-to-selection-btn');
    const reel1 = document.getElementById('reel1'); const reel2 = document.getElementById('reel2'); const reel3 = document.getElementById('reel3');
    const spinBtn = document.getElementById('spin-btn'); const spinsLeftEl = document.getElementById('spins-left'); const slotResultEl = document.getElementById('slot-result');
    const whackBoard = document.getElementById('whack-a-tile-board'); const gameTimerEl = document.getElementById('game-timer'); const gameScoreEl = document.getElementById('game-score');
    const startWhackGameBtn = document.getElementById('start-whack-game-btn'); const whackResultEl = document.getElementById('whack-result'); const gameInfoBar = document.getElementById('game-info-bar');
    const castBlocksBtn = document.getElementById('cast-blocks-btn'); const block1 = document.getElementById('block-1'); const block2 = document.getElementById('block-2'); const divinationResultEl = document.getElementById('divination-result');
    const sequenceSlotsContainer = document.getElementById('sequence-slots'); const sequenceAttemptsLeftEl = document.getElementById('sequence-attempts-left'); const submitSequenceBtn = document.getElementById('submit-sequence-btn'); const resetSequenceBtn = document.getElementById('reset-sequence-btn'); const sequenceTileSelection = document.getElementById('sequence-tile-selection'); const sequenceResultEl = document.getElementById('sequence-result');
    const purificationTilesContainer = document.getElementById('purification-tiles'); const purificationProgressContainer = document.getElementById('purification-progress-container'); const purificationProgressBar = document.getElementById('purification-progress-bar'); const startRitualBtn = document.getElementById('start-ritual-btn'); const purificationResultEl = document.getElementById('purification-result');
    const dragonPearlBoard = document.getElementById('dragon-pearl-board'); const dragon = document.getElementById('dragon-pearl-dragon'); const pearl = document.getElementById('dragon-pearl-pearl'); const launchPearlBtn = document.getElementById('launch-pearl-btn'); const dragonPearlResultEl = document.getElementById('dragon-pearl-result');
    const memoryMatchBoard = document.getElementById('memory-match-board'); const memoryMovesLeftEl = document.getElementById('memory-moves-left'); const memoryMatchResultEl = document.getElementById('memory-match-result');
    const chosenOneBoard = document.getElementById('chosen-one-board'); const startChosenOneBtn = document.getElementById('start-chosen-one-btn'); const chosenOneResultEl = document.getElementById('chosen-one-result');
    const windRisesBoard = document.getElementById('wind-rises-board'); const startWindRisesBtn = document.getElementById('start-wind-rises-btn'); const windRisesResultEl = document.getElementById('wind-rises-result');
    const scoopChannel = document.getElementById('scoop-channel'); const scoopTile = document.getElementById('scoop-tile'); const scoopResultEl = document.getElementById('scoop-the-moon-result');
    const lobbyView = document.getElementById('lobby-view');
    const createTableView = document.getElementById('create-table-view');
    const roomDetailsView = document.getElementById('room-details-view');
    const showCreateTableBtn = document.getElementById('show-create-table-view-btn');
    const backToLobbyBtns = document.querySelectorAll('.back-to-lobby-btn');
    const createTableForm = document.getElementById('create-table-form');
    const citySelect = document.getElementById('city-select');
    const tableListContainer = document.getElementById('table-list-container');
    const joinRoomIdInput = document.getElementById('join-room-id-input');
    const joinByIdBtn = document.getElementById('join-by-id-btn');
    const roomInfoEl = document.getElementById('room-info');

    // --- 初始化函數 ---
    function init() {
        setupNavigation();
        setupCalculator();
        setupChallenge();
        setupCounter();
        setupDice();
        setupFortune();
        if (db) {
            setupPaiKaFinder(); // 這就是遺漏的函式呼叫
        }
        setupModals();
        setupSettings();
    }

    // --- 導覽列控制 ---
    function setupNavigation() { navButtons.forEach(button => { button.addEventListener('click', () => { const targetId = button.id.replace('nav-', '') + '-section'; navButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); contentSections.forEach(section => { section.classList.toggle('active', section.id === targetId); }); }); }); }
    // --- 牌面顯示工具 ---
    function createTileImage(tileName, className = 'mahjong-tile') { const img = document.createElement('img'); img.src = `images/${tileName}.svg`; img.alt = tileName; img.className = className; img.dataset.tile = tileName; return img; }
    function createTileImageHtml(tileName) { return `<img src="images/${tileName}.svg" alt="${tileName}" class="mahjong-tile">`; }
    function sortHand(hand) { return hand.slice().sort((a, b) => ALL_TILES.indexOf(a) - ALL_TILES.indexOf(b)); }
    // --- 聽牌/打聽計算機 (完整功能) ---
    function setupCalculator() { for (const [typeKey, typeName] of Object.entries(TILE_TYPES)) { const categoryTitle = document.createElement('div'); categoryTitle.className = 'tile-category'; categoryTitle.textContent = typeName; tileSelectionGrid.appendChild(categoryTitle); TILES[typeKey].forEach(tileName => { const img = createTileImage(tileName); img.addEventListener('click', () => addTileToHand(tileName)); tileSelectionGrid.appendChild(img); }); } clearHandBtn.addEventListener('click', clearHand); calculateBtn.addEventListener('click', calculateHand); }
    function addTileToHand(tileName) { if (userHand.length >= 17) { alert('手牌最多17張'); return; } if (userHand.filter(t => t === tileName).length >= 4) { alert(`"${tileName}" 已經有4張了`); return; } userHand.push(tileName); renderUserHand(); }
    function removeTileFromHand(index) { const sorted = sortHand(userHand); const originalIndex = userHand.indexOf(sorted[index]); if (originalIndex > -1) { userHand.splice(originalIndex, 1); } renderUserHand(); }
    function renderUserHand() { userHandDisplay.innerHTML = ''; const sorted = sortHand(userHand); sorted.forEach((tileName, index) => { const img = createTileImage(tileName); img.addEventListener('click', () => removeTileFromHand(index)); userHandDisplay.appendChild(img); }); }
    function clearHand() { userHand = []; renderUserHand(); calculatorResultArea.innerHTML = ''; calculatorResultArea.style.display = 'none'; }
    function calculateHand() { calculatorResultArea.innerHTML = ''; calculatorResultArea.style.display = 'block'; const handSize = userHand.length; if (handSize === 0) { calculatorResultArea.innerHTML = '<h3>請先輸入您的手牌</h3>'; return; } if (handSize % 3 !== 1 && handSize % 3 !== 2) { calculatorResultArea.innerHTML = '<h3>牌數錯誤，非聽牌或胡牌的牌數，已相公</h3>'; return; } const handCounts = getHandCounts(userHand); if (handSize % 3 === 2) { if (isWinningHand(handCounts)) { calculatorResultArea.innerHTML = '<h3>恭喜，您已胡牌！</h3>'; return; } } let discardOptions = findDiscardToTing(userHand); if (discardOptions.length > 0) { let html = '<h3>打聽建議：</h3>'; discardOptions.forEach(opt => { html += `<div class="result-group">打 <div class="tile-group">${createTileImageHtml(opt.discard)}</div> 聽 <div class="tile-group">${opt.ting.map(createTileImageHtml).join('')}</div></div>`; }); calculatorResultArea.innerHTML = html; return; } let tingOptions = findTing(userHand); if (tingOptions.length > 0) { let html = '<h3>已聽牌，聽：</h3>'; html += `<div class="result-group"><div class="tile-group">${tingOptions.map(createTileImageHtml).join('')}</div></div>`; calculatorResultArea.innerHTML = html; return; } calculatorResultArea.innerHTML = '<h3>還未聽牌</h3>'; }
    function getHandCounts(hand) { const counts = {}; ALL_TILES.forEach(t => counts[t] = 0); hand.forEach(t => counts[t]++); return counts; }
    function isWinningHand(counts, depth = 0) { if (Object.values(counts).every(c => c === 0)) return true; if (depth === 0) { for (const tile of ALL_TILES) { if (counts[tile] >= 2) { counts[tile] -= 2; if (isWinningHand(counts, depth + 1)) { counts[tile] += 2; return true; } counts[tile] += 2; } } return false; } else { const firstTile = ALL_TILES.find(t => counts[t] > 0); if (!firstTile) return true; if (counts[firstTile] >= 3) { counts[firstTile] -= 3; if (isWinningHand(counts, depth + 1)) { counts[firstTile] += 3; return true; } counts[firstTile] += 3; } const suit = firstTile.slice(-1); if (['萬', '筒', '條'].includes(suit)) { const num = parseInt(firstTile); if (num <= 7) { const next1 = `${num + 1}${suit}`; const next2 = `${num + 2}${suit}`; if (counts[next1] > 0 && counts[next2] > 0) { counts[firstTile]--; counts[next1]--; counts[next2]--; if (isWinningHand(counts, depth + 1)) { counts[firstTile]++; counts[next1]++; counts[next2]++; return true; } counts[firstTile]++; counts[next1]++; counts[next2]++; } } } return false; } }
    function findTing(hand) { const ting = new Set(); const handCounts = getHandCounts(hand); for (const tile of ALL_TILES) { if (handCounts[tile] < 4) { const tempHand = [...hand, tile]; if (isWinningHand(getHandCounts(tempHand))) { ting.add(tile); } } } return sortHand(Array.from(ting)); }
    function findDiscardToTing(hand) { const options = []; const uniqueTiles = Array.from(new Set(hand)); for (const discardTile of uniqueTiles) { const tempHand = [...hand]; tempHand.splice(tempHand.indexOf(discardTile), 1); const tingResult = findTing(tempHand); if (tingResult.length > 0) { options.push({ discard: discardTile, ting: tingResult }); } } return options; }
    // --- 清一色試煉 (完整功能) ---
    function setupChallenge() { challengeTingBtn.addEventListener('click', () => startChallenge('ting')); challengeDaTingBtn.addEventListener('click', () => startChallenge('da-ting')); nextChallengeBtn.addEventListener('click', () => startChallenge(challengeState.mode)); }
    function startChallenge(mode) { challengeTingBtn.classList.toggle('active', mode === 'ting'); challengeDaTingBtn.classList.toggle('active', mode === 'da-ting'); challengeFeedback.innerHTML = ''; challengeAnswerArea.innerHTML = ''; nextChallengeBtn.style.display = 'none'; challengeState.mode = mode; const suitKey = ['m', 'p', 's'][Math.floor(Math.random() * 3)]; const suitName = TILE_TYPES[suitKey]; const suitTiles = TILES[suitKey]; const handSize = mode === 'ting' ? 13 : 14; let hand = generateChallengeHand(suitTiles, handSize); challengeState.hand = hand; if (mode === 'ting') { challengeQuestion.textContent = `[練習聽牌] 這副 ${suitName} 牌聽什麼？`; challengeState.correctAnswer = findTing(hand); } else { challengeQuestion.textContent = `[練習打聽] 這副 ${suitName} 牌該打哪張，聽什麼？`; challengeState.correctAnswer = findDiscardToTing(hand); } if (challengeState.correctAnswer.length === 0) { startChallenge(mode); return; } challengeHandDisplay.innerHTML = ''; sortHand(hand).forEach(tileName => { challengeHandDisplay.appendChild(createTileImage(tileName)); }); challengeAnswerArea.innerHTML = `<h4>請點選答案 (可複選)</h4>`; const answerOptionsContainer = document.createElement('div'); answerOptionsContainer.className = 'tile-group'; suitTiles.forEach(tileName => { const img = createTileImage(tileName); img.addEventListener('click', () => img.classList.toggle('selected')); answerOptionsContainer.appendChild(img); }); challengeAnswerArea.appendChild(answerOptionsContainer); const submitBtn = document.createElement('button'); submitBtn.textContent = '確定答案'; submitBtn.onclick = checkChallengeAnswer; challengeAnswerArea.appendChild(submitBtn); }
    function generateChallengeHand(suitTiles, size) { let deck = []; suitTiles.forEach(tile => deck.push(tile, tile, tile, tile)); let hand = []; while (hand.length < size && deck.length > 0) { let randIndex = Math.floor(Math.random() * deck.length); hand.push(deck.splice(randIndex, 1)[0]); } return hand; }
    function checkChallengeAnswer() { const selectedTiles = Array.from(document.querySelectorAll('#challenge-answer-area .mahjong-tile.selected')).map(img => img.dataset.tile); let isCorrect = false; if (challengeState.mode === 'ting') { isCorrect = selectedTiles.length === challengeState.correctAnswer.length && selectedTiles.every(tile => challengeState.correctAnswer.includes(tile)); } else { isCorrect = selectedTiles.length === 1 && challengeState.correctAnswer.some(opt => opt.discard === selectedTiles[0]); } challengeFeedback.style.display = 'block'; challengeFeedback.innerHTML = isCorrect ? `<h3 style="color: green;">答對了！</h3>` : `<h3 style="color: red;">答錯了！</h3>`; let solutionHtml = '<h4>正確答案：</h4>'; if (challengeState.mode === 'ting') { solutionHtml += `<div class="tile-group">${challengeState.correctAnswer.map(createTileImageHtml).join('')}</div>`; } else { challengeState.correctAnswer.forEach(opt => { solutionHtml += `<div class="result-group">打 <div class="tile-group">${createTileImageHtml(opt.discard)}</div> 聽 <div class="tile-group">${opt.ting.map(createTileImageHtml).join('')}</div></div>`; }); } challengeFeedback.innerHTML += solutionHtml; nextChallengeBtn.style.display = 'inline-block'; challengeAnswerArea.querySelector('button').disabled = true; }
    // --- 麻將計數器 (含強化結算) ---
    function setupCounter() { startGameBtn.addEventListener('click', startGame); zimoBtn.addEventListener('click', handleZimo); huBtn.addEventListener('click', handleHu); settleBtn.addEventListener('click', handleSettle); }
    function getRandomEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; }
    function startGame() { const p1Name = document.getElementById('player1-name').value || '東家'; const p2Name = document.getElementById('player2-name').value || '南家'; const p3Name = document.getElementById('player3-name').value || '西家'; const p4Name = document.getElementById('player4-name').value || '北方玩家'; players = [{ id: 1, name: p1Name, score: 0, emoji: getRandomEmoji() }, { id: 2, name: p2Name, score: 0, emoji: getRandomEmoji() }, { id: 3, name: p3Name, score: 0, emoji: getRandomEmoji() }, { id: 4, name: p4Name, score: 0, emoji: getRandomEmoji() }]; const stakeValue = document.getElementById('stake-select').value.split('/'); stake.base = parseInt(stakeValue[0]); stake.台 = parseInt(stakeValue[1]); counterSetup.style.display = 'none'; counterMain.style.display = 'block'; updateScoreboard(); }
    function updateScoreboard() { players.forEach(p => { const box = document.getElementById(`player-display-${p.id}`); box.innerHTML = `<div class="emoji">${p.emoji}</div><h4>${p.name}</h4><div class="score ${p.score >= 0 ? 'positive' : 'negative'}">${p.score}</div>`; }); }
    function handleZimo() { let content = '<h3>自摸</h3><p>誰自摸？</p><div class="modal-options">'; players.forEach(p => { content += `<label><input type="radio" name="winner" value="${p.id}">${p.name}</label>`; }); content += '</div><p>誰是莊家？</p><div class="modal-options">'; players.forEach(p => { content += `<label><input type="radio" name="dealer" value="${p.id}">${p.name}</label>`; }); content += '</div><p>幾台？</p><input type="number" id="tai-input" min="0" value="0" style="width: 100%; padding: 8px;"><button id="confirm-zimo-btn">確定</button>'; showModal(mainModal, content); document.getElementById('confirm-zimo-btn').addEventListener('click', () => { const winnerId = parseInt(document.querySelector('input[name="winner"]:checked')?.value); const dealerId = parseInt(document.querySelector('input[name="dealer"]:checked')?.value); const tai = parseInt(document.getElementById('tai-input').value) || 0; if (!winnerId || !dealerId) { alert('請選擇自摸者和莊家'); return; } let totalTai = tai; if (winnerId === dealerId) totalTai++; let winAmount = 0; players.forEach(p => { if (p.id !== winnerId) { let payment = stake.base + (totalTai * stake.台); if (p.id === dealerId) payment += stake.台; p.score -= payment; winAmount += payment; } }); players.find(p => p.id === winnerId).score += winAmount; updateScoreboard(); closeModal(mainModal); }); }
    function handleHu() { let content = '<h3>胡牌</h3><p>誰胡牌？</p><div class="modal-options">'; players.forEach(p => { content += `<label><input type="radio" name="winner" value="${p.id}">${p.name}</label>`; }); content += '</div><p>誰放槍？</p><div class="modal-options">'; players.forEach(p => { content += `<label><input type="radio" name="loser" value="${p.id}">${p.name}</label>`; }); content += '</div><p>幾台？</p><input type="number" id="tai-input" min="0" value="0" style="width: 100%; padding: 8px;"><button id="confirm-hu-btn">確定</button>'; showModal(mainModal, content); document.getElementById('confirm-hu-btn').addEventListener('click', () => { const winnerId = parseInt(document.querySelector('input[name="winner"]:checked')?.value); const loserId = parseInt(document.querySelector('input[name="loser"]:checked')?.value); const tai = parseInt(document.getElementById('tai-input').value) || 0; if (!winnerId || !loserId || winnerId === loserId) { alert('請正確選擇胡牌者和放槍者'); return; } const payment = stake.base + (tai * stake.台); players.find(p => p.id === winnerId).score += payment; players.find(p => p.id === loserId).score -= payment; updateScoreboard(); closeModal(mainModal); }); }
    function handleSettle() { let content = '<h3>結算</h3>'; content += '<h4>最終分數</h4>'; const finalScores = [...players].sort((a, b) => b.score - a.score); finalScores.forEach(p => { content += `<p>${p.name}: <span class="score ${p.score >= 0 ? 'positive' : 'negative'}">${p.score}</span></p>`; }); content += '<div class="settlement-details">'; content += '<h4>點數流向</h4>'; const transactions = calculateTransactions(); if (transactions.length === 0) { content += '<p>天下太平，無須找錢！</p>'; } else { content += '<ul class="transaction-list">'; transactions.forEach(t => { content += `<li><span class="player-name">${t.from}</span><span class="transaction-arrow"> → </span><span class="player-name">${t.to}</span><span class="transaction-amount">${t.amount} 點</span></li>`; }); content += '</ul>'; } content += '</div>'; content += '<button id="reset-game-btn" style="margin-top: 1rem;">新的一將</button>'; showModal(mainModal, content); document.getElementById('reset-game-btn').addEventListener('click', () => { counterMain.style.display = 'none'; counterSetup.style.display = 'block'; closeModal(mainModal); }); }
    function calculateTransactions() { let winners = players.filter(p => p.score > 0).map(p => ({ ...p })).sort((a, b) => b.score - a.score); let losers = players.filter(p => p.score < 0).map(p => ({ ...p, score: -p.score })).sort((a, b) => b.score - a.score); let transactions = []; let i = 0, j = 0; while (i < losers.length && j < winners.length) { const loser = losers[i]; const winner = winners[j]; const amount = Math.min(loser.score, winner.score); if (amount > 0) { transactions.push({ from: loser.name, to: winner.name, amount: amount }); loser.score -= amount; winner.score -= amount; } if (loser.score === 0) i++; if (winner.score === 0) j++; } return transactions; }
    // --- 麻將骰子 (完整功能) ---
    function setupDice() { rollDiceBtn.addEventListener('click', rollTheDice); }
    function rollTheDice() { const diceElements = diceContainer.querySelectorAll('.dice'); let total = 0; diceElements.forEach(die => die.classList.add('rolling')); setTimeout(() => { diceElements.forEach(die => { const value = Math.floor(Math.random() * 6) + 1; total += value; die.textContent = value; die.classList.remove('rolling'); }); const resultHTML = getDiceResultText(total); diceResultArea.innerHTML = resultHTML; }, 500); }
    function getDiceResultText(total) { let result = `<h4>總計：${total} 點</h4>`; let location = '', action = ''; switch (total) { case 3: location = '對家'; action = '數 <strong>3</strong> 敦抓牌'; break; case 4: location = '上家'; action = '數 <strong>4</strong> 敦抓牌'; break; case 5: location = '自己'; action = '數 <strong>5</strong> 敦抓牌'; break; case 6: location = '下家'; action = '數 <strong>6</strong> 敦抓牌'; break; case 7: location = '對家'; action = '數 <strong>7</strong> 敦抓牌'; break; case 8: location = '上家'; action = '數 <strong>8</strong> 敦抓牌'; break; case 9: location = '自己'; action = '從尾巴倒數，抓完剩 <strong>6</strong> 敦'; break; case 10: location = '下家'; action = '從尾巴倒數，抓完剩 <strong>5</strong> 敦'; break; case 11: location = '對家'; action = '從尾巴倒數，抓完剩 <strong>4</strong> 敦'; break; case 12: location = '上家'; action = '從尾巴倒數，抓完剩 <strong>3</strong> 敦'; break; case 13: location = '自己'; action = '從尾巴倒數，抓完剩 <strong>2</strong> 敦'; break; case 14: location = '下家'; action = '從尾巴倒數，抓完剩 <strong>1</strong> 敦'; break; case 15: location = '對家'; action = '從尾巴倒數，抓完牌堆'; break; case 16: location = '上家'; action = '從尾巴倒數，抓 <strong>1</strong> 敦，再抓下一排的 <strong>1</strong> 敦'; break; case 17: location = '自己'; action = '從尾巴倒數，直接抓下一排的第 <strong>1</strong> 敦'; break; case 18: location = '下家'; action = '從尾巴倒數，下一排數 <strong>1</strong> 敦抓牌'; break; } result += `<p>開門位置：<strong>${location}</strong></p><p>抓牌方式：${action}</p>`; return result; }
    
    // --- 招財神 (遊戲大廳) ---
    function setupFortune() { handleDailyFortune(); gameChoiceBtns.forEach(btn => { btn.addEventListener('click', () => showGame(btn.dataset.game)); }); backToSelectionBtns.forEach(btn => { btn.addEventListener('click', () => showGame('selection')); }); setupSlotMachine(); setupWhackGame(); setupDivinationGame(); setupSequenceGame(); setupPurificationGame(); setupDragonPearlGame(); setupMemoryMatchGame(); setupChosenOneGame(); setupWindRisesGame(); setupScoopTheMoonGame(); checkBlessing(); }
    function showGame(gameName) { gameSelectionMenu.style.display = 'none'; ritualGameContainers.forEach(c => c.style.display = 'none'); if (gameName === 'selection') { gameSelectionMenu.style.display = 'block'; } else { document.getElementById(`${gameName}-game`).style.display = 'block'; } }
    function handleDailyFortune() { const today = new Date().toLocaleDateString(); const storedFortune = JSON.parse(localStorage.getItem('dailyFortune')); if (storedFortune && storedFortune.date === today) { displayFortune(storedFortune); } else { const newFortune = generateNewFortune(today); localStorage.setItem('dailyFortune', JSON.stringify(newFortune)); displayFortune(newFortune); } }
    function generateNewFortune(date) { const colors = ['#FF4500', '#FFD700', '#32CD32', '#1E90FF', '#9932CC', '#FF1493']; const luckyColor = colors[Math.floor(Math.random() * colors.length)]; const wealthIndex = Math.floor(Math.random() * 5) + 1; let deck = [...ALL_TILES]; let benefactorTiles = []; for (let i = 0; i < 2; i++) { benefactorTiles.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]); } return { date, luckyColor, wealthIndex, benefactorTiles }; }
    function displayFortune(fortune) { luckyColorEl.style.backgroundColor = fortune.luckyColor; wealthIndexEl.textContent = '★'.repeat(fortune.wealthIndex) + '☆'.repeat(5 - fortune.wealthIndex); benefactorTilesEl.innerHTML = ''; fortune.benefactorTiles.forEach(tileName => { benefactorTilesEl.appendChild(createTileImage(tileName)); }); }
    function checkBlessing() { const blessingEnd = localStorage.getItem('blessingExpiry'); if (!blessingEnd || Date.now() > blessingEnd) { gameHallContainer.style.display = 'block'; blessingCountdownArea.style.display = 'none'; if (blessingTimerId) clearInterval(blessingTimerId); return false; } gameHallContainer.style.display = 'none'; blessingCountdownArea.style.display = 'block'; const updateTimer = () => { const remaining = blessingEnd - Date.now(); if (remaining <= 0) { clearInterval(blessingTimerId); localStorage.removeItem('blessingExpiry'); checkBlessing(); location.reload(); return; } const hours = Math.floor(remaining / 3600000); const minutes = Math.floor((remaining % 3600000) / 60000); const seconds = Math.floor((remaining % 60000) / 1000); blessingCountdownArea.innerHTML = `財神庇佑中！福運剩餘時間：<br><strong style="color:var(--gold-color);">${hours}時 ${minutes}分 ${seconds}秒</strong>`; }; updateTimer(); blessingTimerId = setInterval(updateTimer, 1000); return true; }
    function handleGameWin(message) { const blessingEnd = Date.now() + 12 * 60 * 60 * 1000; localStorage.setItem('blessingExpiry', blessingEnd); const godIcon = document.querySelector('.god-of-wealth'); if (godIcon) { godIcon.classList.add('success-glow'); setTimeout(() => godIcon.classList.remove('success-glow'), 1500); } alert(message); checkBlessing(); }
    // --- 遊戲1：拉霸機 ---
    function setupSlotMachine() { spinBtn.addEventListener('click', spinReels); const initialTiles = ['發', '8萬', '白']; [reel1, reel2, reel3].forEach((reel, i) => populateReel(reel, initialTiles[i], true)); }
    function populateReel(reel, finalTile, isInitial = false) { reel.innerHTML = ''; const tilesForReel = shuffleArray([...ALL_TILES]); const finalIndex = isInitial ? tilesForReel.findIndex(t => t === finalTile) : 25; if (!isInitial) tilesForReel[finalIndex] = finalTile; for (let i = 0; i < 30; i++) { reel.appendChild(createTileImage(tilesForReel[i % tilesForReel.length])); } }
    function spinReels() { if (slotGame.isSpinning || slotGame.spinsLeft <= 0) return; slotGame.isSpinning = true; slotGame.spinsLeft--; spinsLeftEl.textContent = slotGame.spinsLeft; spinBtn.disabled = true; slotResultEl.innerHTML = ''; const reels = [reel1, reel2, reel3]; const results = reels.map(() => ALL_TILES[Math.floor(Math.random() * ALL_TILES.length)]); reels.forEach((reel, index) => { populateReel(reel, results[index]); reel.style.transition = 'none'; reel.style.transform = 'translateY(0)'; reel.getBoundingClientRect(); const spinDuration = 2 + index * 0.5; reel.style.transition = `transform ${spinDuration}s cubic-bezier(0.25, 1, 0.5, 1)`; const finalPosition = 25 * slotGame.tileHeight; reel.style.transform = `translateY(-${finalPosition}px)`; }); setTimeout(() => { checkSlotWin(results); }, 3500); }
    function checkSlotWin(results) { slotGame.isSpinning = false; let isWin = false; let winMessage = ""; const [t1, t2, t3] = results; if (t1 === t2 && t1 === t3) { isWin = true; winMessage = `大獎！三條 ${t1}！`; } else if (['中', '發', '白'].sort().join(',') === [...results].sort().join(',')) { isWin = true; winMessage = "中獎！三元會首！"; } else { const parsed = results.map(parseTileForSlot).sort((a, b) => a.num - b.num); if (parsed[0].suit && parsed[0].suit === parsed[1].suit && parsed[0].suit === parsed[2].suit && parsed[1].num === parsed[0].num + 1 && parsed[2].num === parsed[1].num + 2) { isWin = true; winMessage = `中獎！順子 ${results.sort().join(' ')}！`; } } if (isWin) { handleGameWin(`${winMessage} 招財成功！`); } else if (slotGame.spinsLeft > 0) { slotResultEl.innerHTML = '可惜，差一點！'; spinBtn.disabled = false; } else { slotResultEl.innerHTML = '<strong style="color:red;">機會用完了！</strong><button id="reset-slot-btn">再試一次</button>'; document.getElementById('reset-slot-btn').onclick = () => { slotGame.spinsLeft = 5; spinsLeftEl.textContent = 5; spinBtn.disabled = false; slotResultEl.innerHTML = ''; }; } }
    function parseTileForSlot(tileName) { const suitChar = tileName.slice(-1); if (['萬', '筒', '條'].includes(suitChar)) { return { suit: suitChar, num: parseInt(tileName) }; } return { suit: null, num: -1, name: tileName }; }
    // --- 遊戲2：好運爆爆樂 ---
    function setupWhackGame() { whackBoard.innerHTML = ''; for (let i = 0; i < 9; i++) { const hole = document.createElement('div'); hole.classList.add('whack-a-tile-hole'); whackBoard.appendChild(hole); } startWhackGameBtn.addEventListener('click', startWhackGame); }
    function startWhackGame() { if (whackGame.isActive) return; whackGame.isActive = true; whackGame.score = 0; whackGame.timeLeft = 15; gameScoreEl.textContent = whackGame.score; gameTimerEl.textContent = whackGame.timeLeft; startWhackGameBtn.style.display = 'none'; whackResultEl.innerHTML = ''; gameInfoBar.style.display = 'flex'; whackBoard.style.display = 'grid'; whackGame.gameTimerId = setInterval(updateGameTimer, 1000); popupTile(); }
    function updateGameTimer() { whackGame.timeLeft--; gameTimerEl.textContent = whackGame.timeLeft; if (whackGame.timeLeft <= 0) { endGame(false); } }
    function popupTile() { if (!whackGame.isActive) return; const holes = document.querySelectorAll('.whack-a-tile-hole'); const activeHoles = document.querySelectorAll('.whack-a-tile-hole .mahjong-tile'); if (activeHoles.length >= 4) { whackGame.popupTimerId = setTimeout(popupTile, 200); return; } let randomHole; do { randomHole = holes[Math.floor(Math.random() * holes.length)]; } while (randomHole.querySelector('.mahjong-tile')); const isGood = Math.random() > 0.25; const tileName = isGood ? whackGame.goodTiles[Math.floor(Math.random() * whackGame.goodTiles.length)] : whackGame.badTiles[Math.floor(Math.random() * whackGame.badTiles.length)]; const tileEl = createTileImage(tileName); tileEl.dataset.type = isGood ? 'good' : 'bad'; tileEl.addEventListener('click', handleTileWhack); randomHole.appendChild(tileEl); setTimeout(() => tileEl.classList.add('up'), 10); setTimeout(() => { if (tileEl.parentElement) { tileEl.parentElement.removeChild(tileEl); } }, 1200); whackGame.popupTimerId = setTimeout(popupTile, Math.random() * 500 + 300); }
    function handleTileWhack(event) { const tileEl = event.currentTarget; if (!tileEl.parentElement || !whackGame.isActive) return; if (tileEl.dataset.type === 'good') { whackGame.score += 11; } else { whackGame.score -= 22; if (whackGame.score < 0) whackGame.score = 0; } gameScoreEl.textContent = whackGame.score; tileEl.parentElement.removeChild(tileEl); if (whackGame.score >= whackGame.targetScore) { endGame(true); } }
    function endGame(isSuccess) { whackGame.isActive = false; clearInterval(whackGame.gameTimerId); clearTimeout(whackGame.popupTimerId); setTimeout(() => { whackBoard.innerHTML = ''; for (let i = 0; i < 9; i++) { const hole = document.createElement('div'); hole.classList.add('whack-a-tile-hole'); whackBoard.appendChild(hole); } }, 100); if (isSuccess) { handleGameWin('挑戰成功！財神賜予您12小時的福運！'); } else { whackResultEl.innerHTML = '<strong style="color:red;">時間到！</strong>差一點！再挑戰一次吧！'; startWhackGameBtn.style.display = 'block'; whackBoard.style.display = 'none'; gameInfoBar.style.display = 'none'; } }
    // --- 遊戲3：誠心擲筊 ---
    function setupDivinationGame() { castBlocksBtn.addEventListener('click', castDivinationBlocks); }
    function castDivinationBlocks() { block1.classList.add('tossing'); block2.classList.add('tossing'); castBlocksBtn.disabled = true; setTimeout(() => { block1.classList.remove('tossing'); castBlocksBtn.disabled = false; const outcome = Math.random(); if (outcome < 0.35) { handleGameWin('聖筊！財神爺已賜福！'); } else if (outcome < 0.75) { divinationResultEl.innerHTML = '<strong style="color:blue;">笑筊。</strong>心誠則靈，再試一次！'; } else { divinationResultEl.innerHTML = '<strong style="color:red;">陰筊。</strong>別氣餒，換個遊戲轉轉運！'; } }, 700); }
    // --- 遊戲4：神之序列 ---
    function setupSequenceGame(){submitSequenceBtn.addEventListener("click",checkSequence);resetSequenceBtn.addEventListener("click",resetSequence);populateSequenceTiles();startNewSequenceGame()}
    function populateSequenceTiles(){sequenceTileSelection.innerHTML="";ALL_TILES.forEach(e=>{const t=createTileImage(e,"mahjong-tile");t.addEventListener("click",()=>handleTileSequenceClick(t)),sequenceTileSelection.appendChild(t)})}
    function handleTileSequenceClick(e){if(sequenceGame.user.length>=3||e.classList.contains("selected"))return;const t=e.dataset.tile;sequenceGame.user.push(t),e.classList.add("selected"),updateSequenceSlots()}
    function updateSequenceSlots(){const e=sequenceSlotsContainer.querySelectorAll(".offering-slot");e.forEach((e,t)=>{e.innerHTML=sequenceGame.user[t]?createTileImageHtml(sequenceGame.user[t]):"?"})}
    function resetSequence(){sequenceGame.user=[],updateSequenceSlots(),sequenceTileSelection.querySelectorAll(".mahjong-tile.selected").forEach(e=>e.classList.remove("selected"))}
    function startNewSequenceGame(){let e=[...ALL_TILES];sequenceGame.secret=[];for(let t=0;t<3;t++)sequenceGame.secret.push(e.splice(Math.floor(Math.random()*e.length),1)[0]);sequenceGame.attemptsLeft=3,sequenceAttemptsLeftEl.textContent=sequenceGame.attemptsLeft,resetSequence(),sequenceResultEl.innerHTML=""}
    function checkSequence(){if(sequenceGame.user.length<3)return void alert("請先選擇三張供品！");sequenceGame.attemptsLeft--,sequenceAttemptsLeftEl.textContent=sequenceGame.attemptsLeft;const e=JSON.stringify(sequenceGame.user)===JSON.stringify(sequenceGame.secret);e?handleGameWin("序列正確！成功獲得財神庇佑！"):(sequenceResultEl.innerHTML=`<strong style="color:red;">供品錯誤！</strong>`,sequenceGame.attemptsLeft>0?resetSequence():(sequenceResultEl.innerHTML+="3次機會已用完，請重新挑戰！",setTimeout(startNewSequenceGame,1500)))}
    // --- 遊戲5：寶牌淨化 ---
    function setupPurificationGame(){startRitualBtn.addEventListener("click",startPurificationGame)}
    function startPurificationGame(){if(purificationGame.isActive)return;purificationGame.isActive=!0,startRitualBtn.style.display="none",purificationResultEl.innerHTML='<strong style="color:blue;">儀式開始！準備淨化！</strong>';let e=[...ALL_TILES];purificationGame.sequence=[];for(let t=0;t<4;t++)purificationGame.sequence.push(e.splice(Math.floor(Math.random()*e.length),1)[0]);purificationTilesContainer.innerHTML="",purificationGame.sequence.forEach(e=>{const t=createTileImage(e);purificationTilesContainer.appendChild(t)}),purificationGame.currentIndex=0,setTimeout(()=>{startNextTilePurification()},1e3)}
    function startNextTilePurification(){if(purificationGame.currentIndex>=purificationGame.sequence.length)return void handlePurificationSuccess();purificationProgressContainer.classList.add("visible"),purificationGame.currentClicks=0,updateProgressBar();const e=purificationTilesContainer.children[purificationGame.currentIndex];e.classList.add("purifying");const t=()=>{purificationGame.currentClicks++,updateProgressBar(),purificationGame.currentClicks>=purificationGame.clicksNeeded&&(clearTimeout(purificationGame.timerId),e.removeEventListener("click",t),e.classList.remove("purifying"),e.classList.add("purified"),purificationGame.currentIndex++,startNextTilePurification())};e.addEventListener("click",t),purificationGame.timerId=setTimeout(()=>{e.removeEventListener("click",t),handlePurificationFailure()},purificationGame.timePerTile)}
    function updateProgressBar(){const e=purificationGame.currentClicks/purificationGame.clicksNeeded*100;purificationProgressBar.style.width=`${e}%`}
    function handlePurificationSuccess(){purificationGame.isActive=!1,purificationProgressContainer.classList.remove("visible"),handleGameWin("淨化成功！財神賜予您12小時的福運！")}
    function handlePurificationFailure(){purificationGame.isActive=!1,purificationProgressContainer.classList.remove("visible"),purificationTilesContainer.innerHTML="",purificationResultEl.innerHTML='<strong style="color:red;">淨化失敗！</strong>能量消散了，請重新開始儀式。',startRitualBtn.style.display="block"}
    // --- 遊戲6：金龍吐珠 ---
    function setupDragonPearlGame(){launchPearlBtn.addEventListener("click",()=>{if(dragonPearlGame.isActive)return;dragonPearlGame.isActive=!0,pearl.style.transition="transform 1s ease-out",pearl.style.transform=`translate(-50%, -${dragonPearlBoard.clientHeight-30}px)`;setTimeout(()=>{const e=dragon.getBoundingClientRect(),t=pearl.getBoundingClientRect();e.left<t.right&&e.right>t.left?handleGameWin("命中金龍！獲得庇佑！"):dragonPearlResultEl.innerHTML="<strong style='color:red;'>哎呀，射偏了！</strong>";pearl.style.transition="none",pearl.style.transform="translateX(-50%)",dragonPearlGame.isActive=!1},1e3)})}
    // --- 遊戲7：對對碰 ---
    function setupMemoryMatchGame(){let startBtn=document.createElement("button");startBtn.id="start-memory-match-btn";startBtn.textContent="開始記憶";memoryMatchResultEl.innerHTML='';memoryMatchResultEl.appendChild(startBtn);startBtn.addEventListener("click",startMemoryMatch)}
    function startMemoryMatch(){this.style.display="none",memoryMatchResultEl.innerHTML="",memoryMatchGame={cards:[],flippedCards:[],movesLeft:30,matchedPairs:0,totalPairs:6,isChecking:!1},memoryMovesLeftEl.textContent=memoryMatchGame.movesLeft;let e=[...ALL_TILES];e=shuffleArray(e).slice(0,memoryMatchGame.totalPairs);const t=shuffleArray([...e,...e]);memoryMatchBoard.innerHTML="",t.forEach(e=>{const t=document.createElement("div");t.classList.add("memory-card"),t.dataset.tile=e,t.innerHTML=`<div class="card-face card-back"></div><div class="card-face card-front">${createTileImageHtml(e)}</div>`,t.addEventListener("click",()=>flipMemoryCard(t)),memoryMatchBoard.appendChild(t)})}
    function flipMemoryCard(e){if(memoryMatchGame.isChecking||e.classList.contains("is-flipped")||memoryMatchGame.flippedCards.length>=2)return;e.classList.add("is-flipped"),memoryMatchGame.flippedCards.push(e),2===memoryMatchGame.flippedCards.length&&(memoryMatchGame.isChecking=!0,memoryMatchGame.movesLeft--,memoryMovesLeftEl.textContent=memoryMatchGame.movesLeft,checkMemoryMatch())}
    function checkMemoryMatch(){const[e,t]=memoryMatchGame.flippedCards;e.dataset.tile===t.dataset.tile?(memoryMatchGame.matchedPairs++,memoryMatchGame.flippedCards=[],memoryMatchGame.isChecking=!1,memoryMatchGame.matchedPairs===memoryMatchGame.totalPairs&&handleGameWin("記憶超群！成功獲得庇佑！")):setTimeout(()=>{e.classList.remove("is-flipped"),t.classList.remove("is-flipped"),memoryMatchGame.flippedCards=[],memoryMatchGame.isChecking=!1},1e3),memoryMatchGame.movesLeft<=0&&memoryMatchGame.matchedPairs<memoryMatchGame.totalPairs&&(memoryMatchResultEl.innerHTML="<strong style='color:red'>步數用完了！</strong>",setTimeout(()=>document.getElementById('start-memory-match-btn').style.display="block",1e3))}
    // --- 遊戲8：天選之人 ---
    function setupChosenOneGame(){startChosenOneBtn.addEventListener("click",startChosenOneGame)}
    function startChosenOneGame(){chosenOneGame.isShuffling=!0,chosenOneResultEl.innerHTML="",startChosenOneBtn.disabled=!0;const e=["發",...shuffleArray(ALL_TILES.filter(e=>"發"!==e)).slice(0,2)];chosenOneGame.cards=shuffleArray(e),chosenOneBoard.innerHTML="",chosenOneGame.cards.forEach((e,t)=>{const n=createTileImage(e,"chosen-one-card");chosenOneBoard.appendChild(n),e==="發"&&(chosenOneGame.correctCardIndex=t)}),setTimeout(()=>{chosenOneBoard.querySelectorAll(".chosen-one-card").forEach(e=>e.src="images/背面.svg"),chosenOneGame.isShuffling=!1,chosenOneResultEl.innerHTML="找出「發」在哪裡！",chosenOneBoard.addEventListener("click",checkChosenOne,{once:!0})},2e3)}
    function checkChosenOne(e){if(chosenOneGame.isShuffling||!e.target.classList.contains("chosen-one-card"))return void chosenOneBoard.addEventListener("click",checkChosenOne,{once:!0});const t=Array.from(chosenOneBoard.children).indexOf(e.target);chosenOneBoard.querySelectorAll(".chosen-one-card").forEach((e,t)=>e.src=`images/${chosenOneGame.cards[t]}.svg`),t===chosenOneGame.correctCardIndex?handleGameWin("天選之人就是你！恭喜！"):chosenOneResultEl.innerHTML="<strong style='color:red'>真可惜，選錯了！</strong>",startChosenOneBtn.disabled=!1}
    // --- 遊戲9：風生水起 ---
    function setupWindRisesGame(){const e=["東","南","西","北"];windRisesBoard.innerHTML="",e.forEach(e=>{const t=createTileImage(e,"wind-tile-button");t.dataset.wind=e,t.addEventListener("click",()=>handleWindClick(e)),windRisesBoard.appendChild(t)}),startWindRisesBtn.addEventListener("click",startWindRisesGame)}
    function startWindRisesGame(){windRisesGame.isActive=!0,windRisesGame.level=1,startWindRisesBtn.style.display="none",windRisesResultEl.innerHTML="",nextWindLevel()}
    function nextWindLevel(){windRisesResultEl.innerHTML=`第 ${windRisesGame.level} 層`,windRisesGame.sequence=[],windRisesGame.userSequence=[];const e=["東","南","西","北"];for(let t=0;t<windRisesGame.level+2;t++)windRisesGame.sequence.push(e[Math.floor(Math.random()*e.length)]);displayWindSequence()}
    function displayWindSequence(){windRisesGame.isDisplaying=!0;let e=0;const t=setInterval(()=>{if(e>=windRisesGame.sequence.length)return clearInterval(t),void(windRisesGame.isDisplaying=!1);const n=windRisesGame.sequence[e],a=windRisesBoard.querySelector(`[data-wind="${n}"]`);a.classList.add("active"),setTimeout(()=>a.classList.remove("active"),400),e++},600)}
    function handleWindClick(e){if(windRisesGame.isDisplaying||!windRisesGame.isActive)return;windRisesGame.userSequence.push(e);const t=windRisesBoard.querySelector(`[data-wind="${e}"]`);t.classList.add("active"),setTimeout(()=>t.classList.remove("active"),200);for(let n=0;n<windRisesGame.userSequence.length;n++)if(windRisesGame.userSequence[n]!==windRisesGame.sequence[n])return void windRisesFail();windRisesGame.userSequence.length===windRisesGame.sequence.length&&(windRisesGame.level++,windRisesGame.level>3?handleGameWin("風生水起！好運連連！"):setTimeout(nextWindLevel,1e3))}
    function windRisesFail(){windRisesResultEl.innerHTML="<strong style='color:red'>順序錯了！再來一次！</strong>",windRisesGame.isActive=!1,startWindRisesBtn.style.display="block"}
    // --- 遊戲10：海底撈月 ---
    function setupScoopTheMoonGame(){scoopTile.addEventListener("mousedown",e=>{if(e.target.id!=="scoop-tile")return;let t=!1,n=e.clientY;e.target.style.cursor="grabbing",document.onmousemove=a=>{const o=n-a.clientY;e.target.style.bottom=`${5+o}px`,o>scoopChannel.clientHeight-e.target.clientHeight?t=!0:(e.target.offsetLeft<scoopChannel.offsetLeft-10||e.target.offsetLeft>scoopChannel.offsetLeft+scoopChannel.clientWidth-e.target.clientWidth+10)&&(t=!1,document.onmouseup())},document.onmouseup=()=>{document.onmousemove=null,document.onmouseup=null,e.target.style.cursor="grab",t?handleGameWin("成功撈月！好兆頭！"):scoopResultEl.innerHTML="<strong style='color:red'>哎呀！碰到牌牆了！</strong>",setTimeout(()=>e.target.style.bottom="5px",500)}})}
    // --- 找牌咖 (Firebase) ---
    // 在開頭加入城市資料
const CITIES = [
  '台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣',
  '苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣', '嘉義市',
  '嘉義縣', '台南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣',
  '台東縣', '澎湖縣', '金門縣', '連江縣'
];

// 修改 setupPaiKaFinder 函數
function setupPaiKaFinder() {
  const provider = new firebase.auth.GoogleAuthProvider();
  
  document.getElementById('google-login-btn').addEventListener('click', () => {
    firebase.auth().signInWithPopup(provider)
      .catch(error => {
        console.error('登入失敗:', error);
        alert('登入失敗，請稍後再試');
      });
  });

  // 改用 onAuthStateChanged 監聽登入狀態
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      document.getElementById('login-view').style.display = 'none';
      document.getElementById('lobby-view').style.display = 'block';
      setupFinderFeatures();
    } else {
      document.getElementById('login-view').style.display = 'block';
      document.getElementById('lobby-view').style.display = 'none';
    }
  });
}

// 加入 populateCities 函數
function populateCities() {
  const citySelect = document.createElement('select');
  citySelect.id = 'city-select';
  citySelect.required = true;
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '請選擇城市';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  citySelect.appendChild(defaultOption);

  CITIES.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  // 找到表單中的城市選擇欄位並替換
  const cityField = document.querySelector('#create-table-form .city-field');
  if (cityField) {
    cityField.appendChild(citySelect);
  }
}

// 修改錯誤處理
window.onerror = function(msg, url, line, col, error) {
  console.error('Error: ', msg, '\nURL: ', url, '\nLine:', line, '\nColumn:', col, '\nError object:', error);
  return false;
};
    // --- 通用函式 ---
    function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
    function setupModals(){document.querySelectorAll(".modal").forEach(e=>{e.querySelector(".close-btn").addEventListener("click",()=>closeModal(e)),window.addEventListener("click",t=>{t.target===e&&closeModal(e)})})}
    function showModal(e,t=null){t&&(e.querySelector("#modal-body").innerHTML=t),e.style.display="block"}
    function closeModal(e){e.style.display="none","modal"===e.id&&(mainModalBody.innerHTML="")}
    function setupSettings(){settingsBtn.addEventListener("click",()=>showModal(settingsModal));const e=localStorage.getItem("themeColor")||"#8B4513";document.documentElement.style.setProperty("--primary-color",e),themeColorPicker.value=e,themeColorPicker.addEventListener("input",e=>{const t=e.target.value;document.documentElement.style.setProperty("--primary-color",t),localStorage.setItem("themeColor",t)}),privacyPolicyBtn.addEventListener("click",showPrivacyPolicy),taishuTableBtn.addEventListener("click",showTaishuTable),baopaiRulesBtn.addEventListener("click",showBaopaiRules)}
    function showTaishuTable(){closeModal(settingsModal);const e=`<div class="modal-text-content"><h3>台灣麻將台數表 (南部台)</h3><p style="text-align:center; color:#555;">此台數以南部台為準 (無花台且見字一台)</p><h4>1台</h4><ul><li><strong>莊家：</strong>胡牌玩家為莊家時，加1台。</li><li><strong>連莊、拉莊：</strong>莊家胡牌或流局即可連莊。每連1次，額外加1台(連莊)，其餘三家也要多付1台(拉莊)，俗稱「連N拉N」。</li><li><strong>門清：</strong>胡牌時，手牌無任何吃、碰、明槓。</li><li><strong>不求人：</strong>門清狀態下，胡牌的牌為自摸。通常會與門清、自摸合併計算，稱為「門清一摸三」。</li><li><strong>自摸：</strong>胡牌的牌由自己摸進，三家皆需支付。</li><li><strong>搶槓：</strong>聽牌時，胡走別人加槓的牌 (僅限明槓補牌)。</li><li><strong>見字：</strong>手中有任一「東、南、西、北、中、發、白」的刻子(三張同牌)。每組1台。</li><li><strong>槓上開花：</strong>因開槓補牌而自摸胡牌。</li><li><strong>海底撈月：</strong>牌牆最後一張牌自摸胡牌。</li></ul><h4>2台</h4><ul><li><strong>平胡：</strong>牌型由5組順子及1組對子組成，手牌無字牌，且非自摸、獨聽、單吊胡牌，必須是聽雙面(兩面聽)。</li><li><strong>全求人：</strong>手牌皆為吃、碰、槓，只剩最後一張牌單吊胡別人。</li><li><strong>三暗刻：</strong>手中有三組自己摸進的刻子(非碰牌形成)。</li></ul><h4>4台</h4><ul><li><strong>碰碰胡：</strong>牌型由5組刻子及1組對子組成。</li><li><strong>小三元：</strong>「中、發、白」三種牌，其中兩種為刻子，一種為對子。</li><li><strong>湊一色(混一色)：</strong>牌型由字牌及「萬、筒、條」其中一種花色組成。</li></ul><h4>5台</h4><ul><li><strong>四暗刻：</strong>手中有四組自己摸進的刻子。</li></ul><h4>8台</h4><ul><li><strong>MIGI (咪幾/立直)：</strong>在開局前8張牌內即聽牌，且過程中無人吃碰槓。需在摸牌後宣告，若無宣告則不計。</li><li><strong>五暗刻：</strong>手中有五組自己摸進的刻子。</li><li><strong>大三元：</strong>「中、發、白」三種牌皆為刻子。</li><li><strong>小四喜：</strong>「東、南、西、北」四種牌，其中三種為刻子，一種為對子。</li><li><strong>清一色：</strong>整副牌由「萬、筒、條」其中一種花色組成，無字牌。</li><li><strong>字一色：</strong>整副牌全由字牌組成。可與大小三元、大小四喜的台數疊加計算。</li></ul><h4>16台</h4><ul><li><strong>天胡：</strong>莊家取完牌後立即胡牌。不另計門清、不求人、自摸、MIGI等台數。</li><li><strong>大四喜：</strong>「東、南、西、北」四種牌皆為刻子。</li></ul><p class="disclaimer">麻將僅供娛樂，朋友講好就好，嚴禁賭博。</p></div>`;showModal(mainModal,e)}
    function showPrivacyPolicy(){closeModal(settingsModal);const e=`<div class="modal-text-content" id="privacy-policy-content"><h3>隱私權政策</h3><p><strong>最後更新日期：${new Date().getFullYear()}年${new Date().getMonth()+1}月${new Date().getDate()}日</strong></p><p>感謝您使用「麻將工具箱」。我們非常重視您的隱私權。本應用程式為完全客戶端應用，意即所有的計算與資料都只在您的瀏覽器中進行，我們不會收集、儲存或傳輸您的任何個人資訊。</p><h4>資訊收集</h4><p>本應用程式**不會**收集以下任何資訊：</p><ul><li>您在「麻將計數器」中輸入的玩家名稱。</li><li>您的分數、籌碼設定或任何遊戲紀錄。</li><li>您在「聽牌計算機」中輸入的任何牌型。</li><li>您的 IP 位址、地理位置或任何裝置資訊。</li></ul><h4>本機儲存 (Local Storage)</h4><p>為了提升您的使用體驗，我們可能會使用您瀏覽器的「本機儲存」功能來儲存非個人的設定資訊，例如您選擇的「自訂主題」顏色。這些資訊只會儲存在您自己的電腦或行動裝置上，我們無法存取，且您可以隨時透過清除瀏覽器快取來刪除這些資料。</p><h4>Cookies</h4><p>本網站不使用任何追蹤性 Cookies。</p><p class="disclaimer">本工具僅供娛樂與學習交流，請勿用於任何形式的賭博行為。</p></div>`;showModal(mainModal,e)}
    function showBaopaiRules(){closeModal(settingsModal);const e=`<div class="modal-text-content"><h3>包牌行為 (詐胡)</h3><p style="text-align:center; color:#555;"><strong>朋友事先講好即可，底下僅為常見標準。<br>若發生包牌或詐胡行為，行為人應賠償三家。</strong></p><ol><li><strong>錯胡 (詐胡)：</strong>未聽牌或牌型不符胡牌條件卻逕行倒牌。</li><li><strong>相公倒牌：</strong>已相公 (手牌數不對) 卻倒牌胡牌。</li><li><strong>過水不胡：</strong>在同一巡內，放棄了可以胡的牌，之後在輪到自己摸牌前，若他家打出同一張牌而胡牌，視為包牌。(此條款爭議多，需事先溝通)</li><li><strong>明槓上家/指定牌：</strong>因明槓上家打出的第四張牌，而導致他家胡牌時，可能構成包牌。</li><li><strong>相公後操作：</strong>已相公狀態下，進行吃、碰、槓等動作。</li><li><strong>二次相公：</strong>在同局內已相公，卻因錯誤操作導致再次相公。</li><li><strong>不合規定的自摸：</strong>自摸時出現如搓牌未即時翻牌、碰觸手牌、牌掉落等不合程序的行為。</li><li><strong>牌牆不整 (斷橋)：</strong>手牌未正常排列，導致牌面倒塌或混亂。</li><li><strong>MIGI / 眼牌後過水：</strong>宣告MIGI(立直)或眼牌後，對可胡的牌過水不胡。</li><li><strong>明槓後自摸包牌：</strong>部分規則中，若因明槓而補牌自摸，該明槓的提供者需負擔包牌責任。(此條爭議大，需事先約定)</li></ol><p class="disclaimer">所有規則應以牌友間的約定為最終準則。</p></div>`;showModal(mainModal,e)}

    // --- 程式進入點 ---
    init();
});