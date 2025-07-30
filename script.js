document.addEventListener('DOMContentLoaded', () => {
    // --- 常數與全局變數 (使用原始中文名稱) ---
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

    // 計數器
    const counterSetup = document.getElementById('counter-setup');
    const counterMain = document.getElementById('counter-main');
    const startGameBtn = document.getElementById('start-game-btn');
    const zimoBtn = document.getElementById('zimo-btn');
    const huBtn = document.getElementById('hu-btn');
    const settleBtn = document.getElementById('settle-btn');
    
    // Modals
    const mainModal = document.getElementById('modal');
    const mainModalBody = document.getElementById('modal-body');
    const settingsModal = document.getElementById('settings-modal');

    // 設定
    const settingsBtn = document.getElementById('settings-btn');
    const themeColorPicker = document.getElementById('theme-color-picker');
    const privacyPolicyBtn = document.getElementById('privacy-policy-btn');
    

    // --- 初始化函數 ---
    function init() {
        setupNavigation();
        setupCalculator();
        setupChallenge();
        setupCounter();
        setupModals();
        setupSettings();
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

    // --- 牌面顯示工具 ---
    function createTileImage(tileName, className = 'mahjong-tile') {
        const img = document.createElement('img');
        img.src = `images/${tileName}.svg`;
        img.alt = tileName;
        img.className = className;
        img.dataset.tile = tileName;
        return img;
    }

    function createTileImageHtml(tileName) {
        return `<img src="images/${tileName}.svg" alt="${tileName}" class="mahjong-tile">`;
    }

    function sortHand(hand) {
        return hand.slice().sort((a, b) => ALL_TILES.indexOf(a) - ALL_TILES.indexOf(b));
    }

    // --- 聽牌/打聽計算機 (邏輯不變) ---
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
        if (userHand.length >= 17) { alert('手牌最多17張'); return; }
        if (userHand.filter(t => t === tileName).length >= 4) { alert(`"${tileName}" 已經有4張了`); return; }
        userHand.push(tileName);
        renderUserHand();
    }

    function removeTileFromHand(index) {
        const sorted = sortHand(userHand);
        const originalIndex = userHand.indexOf(sorted[index]);
        if (originalIndex > -1) { userHand.splice(originalIndex, 1); }
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
        if (handSize === 0) { calculatorResultArea.innerHTML = '<h3>請先輸入您的手牌</h3>'; return; }
        if (handSize % 3 !== 1 && handSize % 3 !== 2) { calculatorResultArea.innerHTML = '<h3>牌數錯誤，非聽牌或胡牌的牌數，已相公</h3>'; return; }

        const handCounts = getHandCounts(userHand);

        if (handSize % 3 === 2) {
            if (isWinningHand(handCounts)) { calculatorResultArea.innerHTML = '<h3>恭喜，您已胡牌！</h3>'; return; }
        }
        
        let discardOptions = findDiscardToTing(userHand);
        if (discardOptions.length > 0) {
            let html = '<h3>打聽建議：</h3>';
            discardOptions.forEach(opt => {
                html += `<div class="result-group">打 <div class="tile-group">${createTileImageHtml(opt.discard)}</div> 聽 <div class="tile-group">${opt.ting.map(createTileImageHtml).join('')}</div></div>`;
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
    
    // --- 核心麻將胡牌演算法 (邏輯不變) ---
    function getHandCounts(hand) {
        const counts = {};
        ALL_TILES.forEach(t => counts[t] = 0);
        hand.forEach(t => counts[t]++);
        return counts;
    }
    
    function isWinningHand(counts, depth = 0) {
        if (Object.values(counts).every(c => c === 0)) return true;

        if (depth === 0) {
            for (const tile of ALL_TILES) {
                if (counts[tile] >= 2) {
                    counts[tile] -= 2;
                    if (isWinningHand(counts, depth + 1)) { counts[tile] += 2; return true; }
                    counts[tile] += 2;
                }
            }
            return false;
        } else {
            const firstTile = ALL_TILES.find(t => counts[t] > 0);
            if (!firstTile) return true;

            if (counts[firstTile] >= 3) {
                counts[firstTile] -= 3;
                if (isWinningHand(counts, depth + 1)) { counts[firstTile] += 3; return true; }
                counts[firstTile] += 3;
            }

            const suit = firstTile.slice(-1);
            if (['萬', '筒', '條'].includes(suit)) {
                const num = parseInt(firstTile);
                if (num <= 7) {
                    const next1 = `${num + 1}${suit}`;
                    const next2 = `${num + 2}${suit}`;
                    if (counts[next1] > 0 && counts[next2] > 0) {
                        counts[firstTile]--; counts[next1]--; counts[next2]--;
                        if (isWinningHand(counts, depth + 1)) { counts[firstTile]++; counts[next1]++; counts[next2]++; return true; }
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
            if (handCounts[tile] < 4) {
                const tempHand = [...hand, tile];
                if (isWinningHand(getHandCounts(tempHand))) { ting.add(tile); }
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
            if (tingResult.length > 0) { options.push({ discard: discardTile, ting: tingResult }); }
        }
        return options;
    }

    // --- 清一色試煉 (邏輯不變) ---
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
        if (challengeState.correctAnswer.length === 0) { startChallenge(mode); return; }
        challengeHandDisplay.innerHTML = '';
        sortHand(hand).forEach(tileName => { challengeHandDisplay.appendChild(createTileImage(tileName)); });
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
            isCorrect = selectedTiles.length === challengeState.correctAnswer.length && selectedTiles.every(tile => challengeState.correctAnswer.includes(tile));
        } else {
            isCorrect = selectedTiles.length === 1 && challengeState.correctAnswer.some(opt => opt.discard === selectedTiles[0]);
        }
        challengeFeedback.style.display = 'block';
        challengeFeedback.innerHTML = isCorrect ? `<h3 style="color: green;">答對了！</h3>` : `<h3 style="color: red;">答錯了！</h3>`;
        let solutionHtml = '<h4>正確答案：</h4>';
        if (challengeState.mode === 'ting') {
            solutionHtml += `<div class="tile-group">${challengeState.correctAnswer.map(createTileImageHtml).join('')}</div>`;
        } else {
            challengeState.correctAnswer.forEach(opt => {
                solutionHtml += `<div class="result-group">打 <div class="tile-group">${createTileImageHtml(opt.discard)}</div> 聽 <div class="tile-group">${opt.ting.map(createTileImageHtml).join('')}</div></div>`;
            });
        }
        challengeFeedback.innerHTML += solutionHtml;
        nextChallengeBtn.style.display = 'inline-block';
        challengeAnswerArea.querySelector('button').disabled = true;
    }

    // --- 麻將計數器 (邏輯不變) ---
    function setupCounter() {
        startGameBtn.addEventListener('click', startGame);
        zimoBtn.addEventListener('click', handleZimo);
        huBtn.addEventListener('click', handleHu);
        settleBtn.addEventListener('click', handleSettle);
    }
    function getRandomEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; }
    function startGame() {
        const p1Name = document.getElementById('player1-name').value || '東家';
        const p2Name = document.getElementById('player2-name').value || '南家';
        const p3Name = document.getElementById('player3-name').value || '西家';
        const p4Name = document.getElementById('player4-name').value || '北家';
        players = [ { id: 1, name: p1Name, score: 0, emoji: getRandomEmoji() }, { id: 2, name: p2Name, score: 0, emoji: getRandomEmoji() }, { id: 3, name: p3Name, score: 0, emoji: getRandomEmoji() }, { id: 4, name: p4Name, score: 0, emoji: getRandomEmoji() } ];
        const stakeValue = document.getElementById('stake-select').value.split('/');
        stake.base = parseInt(stakeValue[0]); stake.台 = parseInt(stakeValue[1]);
        counterSetup.style.display = 'none'; counterMain.style.display = 'block';
        updateScoreboard();
    }
    function updateScoreboard() {
        players.forEach(p => {
            const box = document.getElementById(`player-display-${p.id}`);
            box.innerHTML = `<div class="emoji">${p.emoji}</div><h4>${p.name}</h4><div class="score ${p.score >= 0 ? 'positive' : 'negative'}">${p.score}</div>`;
        });
    }
    function handleZimo() {
        let content = '<h3>自摸</h3><p>誰自摸？</p><div class="modal-options">';
        players.forEach(p => { content += `<label><input type="radio" name="winner" value="${p.id}">${p.name}</label>`; });
        content += '</div><p>誰是莊家？</p><div class="modal-options">';
        players.forEach(p => { content += `<label><input type="radio" name="dealer" value="${p.id}">${p.name}</label>`; });
        content += '</div><p>幾台？</p><input type="number" id="tai-input" min="0" value="0" style="width: 100%; padding: 8px;"><button id="confirm-zimo-btn">確定</button>';
        showModal(mainModal, content);
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
            players.find(p => p.id === winnerId).score += winAmount;
            updateScoreboard(); closeModal(mainModal);
        });
    }
    function handleHu() {
        let content = '<h3>胡牌</h3><p>誰胡牌？</p><div class="modal-options">';
        players.forEach(p => { content += `<label><input type="radio" name="winner" value="${p.id}">${p.name}</label>`; });
        content += '</div><p>誰放槍？</p><div class="modal-options">';
        players.forEach(p => { content += `<label><input type="radio" name="loser" value="${p.id}">${p.name}</label>`; });
        content += '</div><p>幾台？</p><input type="number" id="tai-input" min="0" value="0" style="width: 100%; padding: 8px;"><button id="confirm-hu-btn">確定</button>';
        showModal(mainModal, content);
        document.getElementById('confirm-hu-btn').addEventListener('click', () => {
            const winnerId = parseInt(document.querySelector('input[name="winner"]:checked')?.value);
            const loserId = parseInt(document.querySelector('input[name="loser"]:checked')?.value);
            const tai = parseInt(document.getElementById('tai-input').value) || 0;
            if (!winnerId || !loserId || winnerId === loserId) { alert('請正確選擇胡牌者和放槍者'); return; }
            const payment = stake.base + (tai * stake.台);
            players.find(p => p.id === winnerId).score += payment;
            players.find(p => p.id === loserId).score -= payment;
            updateScoreboard(); closeModal(mainModal);
        });
    }
    function handleSettle() {
        let content = '<h3>結算</h3><h4>最終分數</h4>';
        const finalScores = [...players].sort((a,b) => b.score - a.score);
        finalScores.forEach(p => { content += `<p>${p.name}: ${p.score}</p>`; });
        content += '<p style="margin-top: 1rem; font-size: 0.9em; color: #666;">注意：此為各玩家總得分。</p><button id="reset-game-btn" style="margin-top: 1rem;">回到設定</button>';
        showModal(mainModal, content);
        document.getElementById('reset-game-btn').addEventListener('click', () => {
             counterMain.style.display = 'none'; counterSetup.style.display = 'block'; closeModal(mainModal);
        });
    }

    // --- Modal 控制 (已更新為可處理多個 Modal) ---
    function setupModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.querySelector('.close-btn').addEventListener('click', () => closeModal(modal));
            window.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); });
        });
    }
    function showModal(modal, content = null) {
        if (content) {
            modal.querySelector('.modal-content > div:not([class])').innerHTML = content;
        }
        modal.style.display = 'block';
    }
    function closeModal(modal) {
        modal.style.display = 'none';
    }

    // --- 新增設定功能 ---
    function setupSettings() {
        // 開啟設定選單
        settingsBtn.addEventListener('click', () => showModal(settingsModal));

        // 載入儲存的主題色或使用預設色
        const savedColor = localStorage.getItem('themeColor') || '#8B4513';
        document.documentElement.style.setProperty('--primary-color', savedColor);
        themeColorPicker.value = savedColor;
        
        // 監聽顏色選擇器
        themeColorPicker.addEventListener('input', (e) => {
            const newColor = e.target.value;
            document.documentElement.style.setProperty('--primary-color', newColor);
            // 將顏色儲存到 Local Storage
            localStorage.setItem('themeColor', newColor);
        });

        // 隱私權政策按鈕
        privacyPolicyBtn.addEventListener('click', showPrivacyPolicy);
    }
    
    function showPrivacyPolicy() {
        closeModal(settingsModal); // 關閉設定選單
        const policyHTML = `
            <div id="privacy-policy-content">
                <h3>隱私權政策</h3>
                <p><strong>最後更新日期：2025年7月30日</strong></p>
                <p>感謝您使用「麻將工具箱」。我們非常重視您的隱私權。本應用程式為完全客戶端應用，意即所有的計算與資料都只在您的瀏覽器中進行，我們不會收集、儲存或傳輸您的任何個人資訊。</p>
                
                <h4>資訊收集</h4>
                <p>本應用程式**不會**收集以下任何資訊：</p>
                <ul>
                    <li>您在「麻將計數器」中輸入的玩家名稱。</li>
                    <li>您的分數、籌碼設定或任何遊戲紀錄。</li>
                    <li>您在「聽牌計算機」中輸入的任何牌型。</li>
                    <li>您的 IP 位址、地理位置或任何裝置資訊。</li>
                </ul>

                <h4>本機儲存 (Local Storage)</h4>
                <p>為了提升您的使用體驗，我們可能會使用您瀏覽器的「本機儲存」功能來儲存非個人的設定資訊，例如您選擇的「自訂主題」顏色。這些資訊只會儲存在您自己的電腦或行動裝置上，我們無法存取，且您可以隨時透過清除瀏覽器快取來刪除這些資料。</p>

                <h4>Cookies</h4>
                <p>本網站不使用任何追蹤性 Cookies。</p>

                <h4>政策變更</h4>
                <p>我們可能會不時更新本隱私權政策。若有任何變更，我們將在此頁面上發布新政策。建議您定期查看本頁面以獲取最新資訊。</p>

                <h4>聯絡我們</h4>
                <p>若您對本隱私權政策有任何疑問，歡迎隨時與我們聯繫hsc0529.myself.tw@gmail.com。</p>
            </div>
        `;
        showModal(mainModal, policyHTML);
    }

    // --- 程式進入點 ---
    init();
});