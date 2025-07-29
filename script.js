document.addEventListener('DOMContentLoaded', () => {
    // --- 常數與全局變數 (使用原始中文名稱) ---
    const TILE_TYPES = {
        'm': '萬', 'p': '筒', 's': '條', 'z': '字'
    };
    const Z_TILES = ['東', '南', '西', '北', '中', '發', '白'];
    const TILES = {
        'm': Array.from({length: 9}, (_, i) => `${i + 1}萬`),
        'p': Array.from({length: 9}, (_, i) => `${i + 1}筒`),
        's': Array.from({length: 9}, (_, i) => `${i + 1}條`),
        'z': Z_TILES
    };
    // 建立一個包含所有牌的陣列，用於排序和檢查
    const ALL_TILES = [].concat(TILES.m, TILES.p, TILES.s, TILES.z);
    const EMOJIS = ['😀', '😎', '😇', '😂', '🥳', '🤩', '🤯', '🤗'];

    let userHand = [];
    let players = [];
    let stake = { base: 0, 台: 0 };
    let challengeState = {};

    // --- DOM 元素 ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const contentSections = document.querySelectorAll('.content-section');
    
    // 計算機
    const userHandDisplay = document.getElementById('user-hand');
    const tileSelectionGrid = document.getElementById('tile-selection');
    const calculateBtn = document.getElementById('calculate-btn');
    const clearHandBtn = document.getElementById('clear-hand-btn');
    const calculatorResultArea = document.getElementById('calculator-result-area');

    // 清一色試煉
    const challengeTingBtn = document.getElementById('challenge-ting-btn');
    const challengeDaTingBtn = document.getElementById('challenge-da-ting-btn');
    const challengeQuestion = document.getElementById('challenge-question');
    const challengeHandDisplay = document.getElementById('challenge-hand');
    const challengeAnswerArea = document.getElementById('challenge-answer-area');
    const challengeFeedback = document.getElementById('challenge-feedback');
    const nextChallengeBtn = document.getElementById('next-challenge-btn');

    // 計數器 & Modal (與前版相同)
    const counterSetup = document.getElementById('counter-setup');
    const counterMain = document.getElementById('counter-main');
    const startGameBtn = document.getElementById('start-game-btn');
    const zimoBtn = document.getElementById('zimo-btn');
    const huBtn = document.getElementById('hu-btn');
    const settleBtn = document.getElementById('settle-btn');
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const closeBtn = document.querySelector('.close-btn');

    // --- 初始化函數 ---
    function init() {
        setupNavigation();
        setupCalculator();
        setupChallenge();
        setupCounter();
        setupModal();
    }

    // --- 導覽列控制 ---
    function setupNavigation() {
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.id.replace('nav-', '') + '-section';
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                contentSections.forEach(section => {
                    section.classList.toggle('active', section.id === targetId);
                });
            });
        });
    }

    // --- 牌面顯示工具 (現在直接使用 tileName) ---
    function createTileImage(tileName, className = 'mahjong-tile') {
        const img = document.createElement('img');
        img.src = `images/${tileName}.svg`;
        img.alt = tileName;
        img.className = className;
        img.dataset.tile = tileName; // 使用 data-tile 來儲存牌名
        return img;
    }

    function createTileImageHtml(tileName) {
        return `<img src="images/${tileName}.svg" alt="${tileName}" class="mahjong-tile">`;
    }

    function sortHand(hand) {
        return hand.slice().sort((a, b) => ALL_TILES.indexOf(a) - ALL_TILES.indexOf(b));
    }

    // --- 聽牌/打聽計算機 ---
    function setupCalculator() {
        for (const [typeKey, typeName] of Object.entries(TILE_TYPES)) {
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'tile-category';
            categoryTitle.textContent = typeName;
            tileSelectionGrid.appendChild(categoryTitle);

            TILES[typeKey].forEach(tileName => {
                const img = createTileImage(tileName);
                img.addEventListener('click', () => addTileToHand(tileName));
                tileSelectionGrid.appendChild(img);
            });
        }
        clearHandBtn.addEventListener('click', clearHand);
        calculateBtn.addEventListener('click', calculateHand);
    }
    
    function addTileToHand(tileName) {
        if (userHand.length >= 17) {
            alert('手牌最多17張'); return;
        }
        if (userHand.filter(t => t === tileName).length >= 4) {
            alert(`"${tileName}" 已經有4張了`); return;
        }
        userHand.push(tileName);
        renderUserHand();
    }

    function removeTileFromHand(index) {
        const sorted = sortHand(userHand);
        // 找到要刪除的牌在原手牌中的位置
        const originalIndex = userHand.indexOf(sorted[index]);
        if (originalIndex > -1) {
            userHand.splice(originalIndex, 1);
        }
        renderUserHand();
    }
    
    function renderUserHand() {
        userHandDisplay.innerHTML = '';
        const sorted = sortHand(userHand);
        sorted.forEach((tileName, index) => {
            const img = createTileImage(tileName);
            img.addEventListener('click', () => removeTileFromHand(index));
            userHandDisplay.appendChild(img);
        });
    }

    function clearHand() {
        userHand = [];
        renderUserHand();
        calculatorResultArea.innerHTML = '';
        calculatorResultArea.style.display = 'none';
    }

    function calculateHand() {
        calculatorResultArea.innerHTML = '';
        calculatorResultArea.style.display = 'block';

        const handSize = userHand.length;
        if (handSize === 0) {
            calculatorResultArea.innerHTML = '<h3>請先輸入您的手牌</h3>';
            return;
        }
        if (handSize % 3 !== 1 && handSize % 3 !== 2) {
             calculatorResultArea.innerHTML = '<h3>牌數錯誤，非聽牌或胡牌的牌數，已相公</h3>';
            return;
        }

        const handCounts = getHandCounts(userHand);

        if (handSize % 3 === 2) {
            if (isWinningHand(handCounts)) {
                calculatorResultArea.innerHTML = '<h3>恭喜，您已胡牌！</h3>';
                return;
            }
        }
        
        let discardOptions = findDiscardToTing(userHand);
        if (discardOptions.length > 0) {
            let html = '<h3>打聽建議：</h3>';
            discardOptions.forEach(opt => {
                html += `
                    <div class="result-group">
                        打 <div class="tile-group">${createTileImageHtml(opt.discard)}</div>
                        聽 <div class="tile-group">${opt.ting.map(createTileImageHtml).join('')}</div>
                    </div>
                `;
            });
            calculatorResultArea.innerHTML = html;
            return;
        }

        let tingOptions = findTing(userHand);
        if (tingOptions.length > 0) {
            let html = '<h3>已聽牌，聽：</h3>';
            html += `<div class="result-group"><div class="tile-group">${tingOptions.map(createTileImageHtml).join('')}</div></div>`;
            calculatorResultArea.innerHTML = html;
            return;
        }
        calculatorResultArea.innerHTML = '<h3>還未聽牌</h3>';
    }
    
    // --- 核心麻將胡牌演算法 (已修改為直接處理中文名稱) ---
    function getHandCounts(hand) {
        const counts = {};
        ALL_TILES.forEach(t => counts[t] = 0);
        hand.forEach(t => counts[t]++);
        return counts;
    }
    
    function isWinningHand(counts, depth = 0) {
        let handEmpty = true;
        for (const tile in counts) {
            if (counts[tile] > 0) { handEmpty = false; break; }
        }
        if (handEmpty) return true;

        if (depth === 0) {
            for (const tile of ALL_TILES) {
                if (counts[tile] >= 2) {
                    counts[tile] -= 2;
                    if (isWinningHand(counts, depth + 1)) {
                        counts[tile] += 2; return true;
                    }
                    counts[tile] += 2;
                }
            }
            return false;
        } else {
            const firstTile = ALL_TILES.find(t => counts[t] > 0);
            if (!firstTile) return true;

            if (counts[firstTile] >= 3) {
                counts[firstTile] -= 3;
                if (isWinningHand(counts, depth + 1)) {
                    counts[firstTile] += 3; return true;
                }
                counts[firstTile] += 3;
            }

            // **判斷順子的邏輯修改**
            const suit = firstTile.slice(-1);
            if (['萬', '筒', '條'].includes(suit)) {
                const num = parseInt(firstTile);
                if (num <= 7) {
                    const next1 = `${num + 1}${suit}`;
                    const next2 = `${num + 2}${suit}`;
                    if (counts[next1] > 0 && counts[next2] > 0) {
                        counts[firstTile]--; counts[next1]--; counts[next2]--;
                        if (isWinningHand(counts, depth + 1)) {
                            counts[firstTile]++; counts[next1]++; counts[next2]++;
                            return true;
                        }
                        counts[firstTile]++; counts[next1]++; counts[next2]++;
                    }
                }
            }
            return false;
        }
    }
    
    function findTing(hand) {
        const ting = new Set();
        const handCounts = getHandCounts(hand);
        for (const tile of ALL_TILES) {
            if (handCounts[tile] < 4) { // 加上這張牌不能超過4張
                const tempHand = [...hand, tile];
                if (isWinningHand(getHandCounts(tempHand))) {
                    ting.add(tile);
                }
            }
        }
        return sortHand(Array.from(ting));
    }
    
    function findDiscardToTing(hand) {
        const options = [];
        const uniqueTiles = Array.from(new Set(hand));
        for (const discardTile of uniqueTiles) {
            const tempHand = [...hand];
            tempHand.splice(tempHand.indexOf(discardTile), 1);
            const tingResult = findTing(tempHand);
            if (tingResult.length > 0) {
                options.push({ discard: discardTile, ting: tingResult });
            }
        }
        return options;
    }

    // --- 清一色試煉 (已更新為使用中文名稱) ---
    function setupChallenge() {
        challengeTingBtn.addEventListener('click', () => startChallenge('ting'));
        challengeDaTingBtn.addEventListener('click', () => startChallenge('da-ting'));
        nextChallengeBtn.addEventListener('click', () => startChallenge(challengeState.mode));
    }

    function startChallenge(mode) {
        challengeTingBtn.classList.toggle('active', mode === 'ting');
        challengeDaTingBtn.classList.toggle('active', mode === 'da-ting');
        challengeFeedback.innerHTML = '';
        challengeAnswerArea.innerHTML = '';
        nextChallengeBtn.style.display = 'none';

        challengeState.mode = mode;
        const suitKey = ['m', 'p', 's'][Math.floor(Math.random() * 3)];
        const suitName = TILE_TYPES[suitKey];
        const suitTiles = TILES[suitKey];
        const handSize = mode === 'ting' ? 13 : 14;

        let hand = generateChallengeHand(suitTiles, handSize);
        challengeState.hand = hand;

        if (mode === 'ting') {
            challengeQuestion.textContent = `[練習聽牌] 這副 ${suitName} 牌聽什麼？`;
            challengeState.correctAnswer = findTing(hand);
        } else {
            challengeQuestion.textContent = `[練習打聽] 這副 ${suitName} 牌該打哪張，聽什麼？`;
            challengeState.correctAnswer = findDiscardToTing(hand);
        }

        if (challengeState.correctAnswer.length === 0) {
            startChallenge(mode); return;
        }

        challengeHandDisplay.innerHTML = '';
        sortHand(hand).forEach(tileName => {
            challengeHandDisplay.appendChild(createTileImage(tileName));
        });

        challengeAnswerArea.innerHTML = `<h4>請點選答案 (可複選)</h4>`;
        const answerOptionsContainer = document.createElement('div');
        answerOptionsContainer.className = 'tile-group';
        suitTiles.forEach(tileName => {
            const img = createTileImage(tileName);
            img.addEventListener('click', () => img.classList.toggle('selected'));
            answerOptionsContainer.appendChild(img);
        });
        challengeAnswerArea.appendChild(answerOptionsContainer);
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = '確定答案';
        submitBtn.onclick = checkChallengeAnswer;
        challengeAnswerArea.appendChild(submitBtn);
    }

    function generateChallengeHand(suitTiles, size) {
        let deck = [];
        suitTiles.forEach(tile => deck.push(tile, tile, tile, tile));
        let hand = [];
        while(hand.length < size && deck.length > 0) {
            let randIndex = Math.floor(Math.random() * deck.length);
            hand.push(deck.splice(randIndex, 1)[0]);
        }
        return hand;
    }

    function checkChallengeAnswer() {
        const selectedTiles = Array.from(document.querySelectorAll('#challenge-answer-area .mahjong-tile.selected')).map(img => img.dataset.tile);

        let isCorrect = false;
        if (challengeState.mode === 'ting') {
            isCorrect = selectedTiles.length === challengeState.correctAnswer.length &&
                        selectedTiles.every(tile => challengeState.correctAnswer.includes(tile));
        } else {
            isCorrect = selectedTiles.length === 1 && challengeState.correctAnswer.some(opt => opt.discard === selectedTiles[0]);
        }

        challengeFeedback.style.display = 'block';
        if (isCorrect) {
            challengeFeedback.innerHTML = `<h3 style="color: green;">答對了！</h3>`;
        } else {
            challengeFeedback.innerHTML = `<h3 style="color: red;">答錯了！</h3>`;
        }

        let solutionHtml = '<h4>正確答案：</h4>';
        if (challengeState.mode === 'ting') {
            solutionHtml += `<div class="tile-group">${challengeState.correctAnswer.map(createTileImageHtml).join('')}</div>`;
        } else {
            challengeState.correctAnswer.forEach(opt => {
                solutionHtml += `
                    <div class="result-group">
                        打 <div class="tile-group">${createTileImageHtml(opt.discard)}</div>
                        聽 <div class="tile-group">${opt.ting.map(createTileImageHtml).join('')}</div>
                    </div>`;
            });
        }
        challengeFeedback.innerHTML += solutionHtml;
        
        nextChallengeBtn.style.display = 'inline-block';
        challengeAnswerArea.querySelector('button').disabled = true;
    }

    // --- 麻將計數器 (邏輯不變，無需修改) ---
    function setupCounter() {
        startGameBtn.addEventListener('click', startGame);
        zimoBtn.addEventListener('click', handleZimo);
        huBtn.addEventListener('click', handleHu);
        settleBtn.addEventListener('click', handleSettle);
    }
    
    function getRandomEmoji() {
        return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    }

    function startGame() {
        const p1Name = document.getElementById('player1-name').value || '東家';
        const p2Name = document.getElementById('player2-name').value || '南家';
        const p3Name = document.getElementById('player3-name').value || '西家';
        const p4Name = document.getElementById('player4-name').value || '北家';

        players = [
            { id: 1, name: p1Name, score: 0, emoji: getRandomEmoji() },
            { id: 2, name: p2Name, score: 0, emoji: getRandomEmoji() },
            { id: 3, name: p3Name, score: 0, emoji: getRandomEmoji() },
            { id: 4, name: p4Name, score: 0, emoji: getRandomEmoji() }
        ];

        const stakeValue = document.getElementById('stake-select').value.split('/');
        stake.base = parseInt(stakeValue[0]);
        stake.台 = parseInt(stakeValue[1]);

        counterSetup.style.display = 'none';
        counterMain.style.display = 'block';
        updateScoreboard();
    }

    function updateScoreboard() {
        players.forEach(p => {
            const box = document.getElementById(`player-display-${p.id}`);
            box.innerHTML = `
                <div class="emoji">${p.emoji}</div>
                <h4>${p.name}</h4>
                <div class="score ${p.score >= 0 ? 'positive' : 'negative'}">${p.score}</div>
            `;
        });
    }

    function handleZimo() {
        let content = '<h3>自摸</h3><p>誰自摸？</p><div class="modal-options">';
        players.forEach(p => { content += `<label><input type="radio" name="winner" value="${p.id}">${p.name}</label>`; });
        content += '</div><p>誰是莊家？</p><div class="modal-options">';
        players.forEach(p => { content += `<label><input type="radio" name="dealer" value="${p.id}">${p.name}</label>`; });
        content += '</div><p>幾台？</p><input type="number" id="tai-input" min="0" value="0" style="width: 100%; padding: 8px;"><button id="confirm-zimo-btn">確定</button>';
        showModal(content);
        document.getElementById('confirm-zimo-btn').addEventListener('click', () => {
            const winnerId = parseInt(document.querySelector('input[name="winner"]:checked')?.value);
            const dealerId = parseInt(document.querySelector('input[name="dealer"]:checked')?.value);
            const tai = parseInt(document.getElementById('tai-input').value) || 0;
            if (!winnerId || !dealerId) { alert('請選擇自摸者和莊家'); return; }
            let totalTai = tai;
            if (winnerId === dealerId) totalTai++;
            let winAmount = 0;
            players.forEach(p => {
                if (p.id !== winnerId) {
                    let payment = stake.base + (totalTai * stake.台);
                    if(p.id === dealerId) payment += stake.台;
                    p.score -= payment;
                    winAmount += payment;
                }
            });
            const winner = players.find(p => p.id === winnerId);
            winner.score += winAmount;
            updateScoreboard();
            closeModal();
        });
    }

    function handleHu() {
        let content = '<h3>胡牌</h3><p>誰胡牌？</p><div class="modal-options">';
        players.forEach(p => { content += `<label><input type="radio" name="winner" value="${p.id}">${p.name}</label>`; });
        content += '</div><p>誰放槍？</p><div class="modal-options">';
        players.forEach(p => { content += `<label><input type="radio" name="loser" value="${p.id}">${p.name}</label>`; });
        content += '</div><p>幾台？</p><input type="number" id="tai-input" min="0" value="0" style="width: 100%; padding: 8px;"><button id="confirm-hu-btn">確定</button>';
        showModal(content);
        document.getElementById('confirm-hu-btn').addEventListener('click', () => {
            const winnerId = parseInt(document.querySelector('input[name="winner"]:checked')?.value);
            const loserId = parseInt(document.querySelector('input[name="loser"]:checked')?.value);
            const tai = parseInt(document.getElementById('tai-input').value) || 0;
            if (!winnerId || !loserId || winnerId === loserId) { alert('請正確選擇胡牌者和放槍者'); return; }
            const payment = stake.base + (tai * stake.台);
            const winner = players.find(p => p.id === winnerId);
            const loser = players.find(p => p.id === loserId);
            winner.score += payment;
            loser.score -= payment;
            updateScoreboard();
            closeModal();
        });
    }
    
    function handleSettle() {
        let content = '<h3>結算</h3><h4>最終分數</h4>';
        const finalScores = players.map(p => ({...p}));
        finalScores.sort((a,b) => b.score - a.score).forEach(p => { content += `<p>${p.name}: ${p.score}</p>`; });
        content += '<p style="margin-top: 1rem; font-size: 0.9em; color: #666;">注意：此為各玩家總得分。</p><button id="reset-game-btn" style="margin-top: 1rem;">回到設定</button>';
        showModal(content);
        document.getElementById('reset-game-btn').addEventListener('click', () => {
             counterMain.style.display = 'none';
             counterSetup.style.display = 'block';
             closeModal();
        });
    }

    // --- Modal 控制 ---
    function setupModal() {
        closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    }
    function showModal(content) {
        modalBody.innerHTML = content;
        modal.style.display = 'block';
    }
    function closeModal() {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    }

    // --- 程式進入點 ---
    init();
});