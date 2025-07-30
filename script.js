document.addEventListener('DOMContentLoaded', () => {
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
    const baopaiRulesBtn = document.getElementById('baopai-rules-btn'); // 新增包牌按鈕

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
    
    // --- 核心麻將胡牌演算法 ---
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

    // --- 清一色試煉 ---
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

    // --- 麻將計數器 ---
    function setupCounter() {
        startGameBtn.addEventListener('click', startGame);
        zimoBtn.addEventListener('click', handleZimo);
        huBtn.addEventListener('click', handleHu);
        settleBtn.addEventListener('click', handleSettle);
    }
    function getRandomEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; }
    function startGame() {
        const p1Name = document.getElementById('player1-name').value || '東家';
        const p2Name = document.getElementById('player2-name').value || '北家';
        const p3Name = document.getElementById('player3-name').value || '西家';
        const p4Name = document.getElementById('player4-name').value || '南家';
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

    // --- Modal 控制 ---
    function setupModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.querySelector('.close-btn').addEventListener('click', () => closeModal(modal));
            window.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); });
        });
    }
    function showModal(modal, content = null) {
        if (content) {
            modal.querySelector('#modal-body').innerHTML = content;
        }
        modal.style.display = 'block';
    }
    function closeModal(modal) {
        modal.style.display = 'none';
        if (modal.id === 'modal') {
            mainModalBody.innerHTML = '';
        }
    }

    // --- 設定功能 ---
    function setupSettings() {
        settingsBtn.addEventListener('click', () => showModal(settingsModal));
        const savedColor = localStorage.getItem('themeColor') || '#8B4513';
        document.documentElement.style.setProperty('--primary-color', savedColor);
        themeColorPicker.value = savedColor;
        themeColorPicker.addEventListener('input', (e) => {
            const newColor = e.target.value;
            document.documentElement.style.setProperty('--primary-color', newColor);
            localStorage.setItem('themeColor', newColor);
        });
        privacyPolicyBtn.addEventListener('click', showPrivacyPolicy);
        taishuTableBtn.addEventListener('click', showTaishuTable);
        baopaiRulesBtn.addEventListener('click', showBaopaiRules); // 綁定包牌事件
    }
    
    function showTaishuTable() {
        closeModal(settingsModal);
        const tableHTML = `
            <div class="modal-text-content">
                <h3>台灣麻將台數表 (南部台)</h3>
                <p style="text-align:center; color:#555;">此台數以南部台為準 (無花台且見字一台)</p>
                <h4>1台</h4><ul><li><strong>莊家：</strong>胡牌玩家為莊家時，加1台。</li><li><strong>連莊、拉莊：</strong>莊家胡牌或流局即可連莊。每連1次，額外加1台(連莊)，其餘三家也要多付1台(拉莊)，俗稱「連N拉N」。</li><li><strong>門清：</strong>胡牌時，手牌無任何吃、碰、明槓。</li><li><strong>不求人：</strong>門清狀態下，胡牌的牌為自摸。通常會與門清、自摸合併計算，稱為「門清一摸三」。</li><li><strong>自摸：</strong>胡牌的牌由自己摸進，三家皆需支付。</li><li><strong>搶槓：</strong>聽牌時，胡走別人加槓的牌 (僅限明槓補牌)。</li><li><strong>見字：</strong>手中有任一「東、南、西、北、中、發、白」的刻子(三張同牌)。每組1台。</li><li><strong>槓上開花：</strong>因開槓補牌而自摸胡牌。</li><li><strong>海底撈月：</strong>牌牆最後一張牌自摸胡牌。</li></ul>
                <h4>2台</h4><ul><li><strong>平胡：</strong>牌型由5組順子及1組對子組成，手牌無字牌，且非自摸、獨聽、單吊胡牌，必須是聽雙面(兩面聽)。</li><li><strong>全求人：</strong>手牌皆為吃、碰、槓，只剩最後一張牌單吊胡別人。</li><li><strong>三暗刻：</strong>手中有三組自己摸進的刻子(非碰牌形成)。</li></ul>
                <h4>4台</h4><ul><li><strong>碰碰胡：</strong>牌型由5組刻子及1組對子組成。</li><li><strong>小三元：</strong>「中、發、白」三種牌，其中兩種為刻子，一種為對子。</li><li><strong>湊一色(混一色)：</strong>牌型由字牌及「萬、筒、條」其中一種花色組成。</li></ul>
                <h4>5台</h4><ul><li><strong>四暗刻：</strong>手中有四組自己摸進的刻子。</li></ul>
                <h4>8台</h4><ul><li><strong>MIGI (咪幾/立直)：</strong>在開局前8張牌內即聽牌，且過程中無人吃碰槓。需在摸牌後宣告，若無宣告則不計。</li><li><strong>五暗刻：</strong>手中有五組自己摸進的刻子。</li><li><strong>大三元：</strong>「中、發、白」三種牌皆為刻子。</li><li><strong>小四喜：</strong>「東、南、西、北」四種牌，其中三種為刻子，一種為對子。</li><li><strong>清一色：</strong>整副牌由「萬、筒、條」其中一種花色組成，無字牌。</li><li><strong>字一色：</strong>整副牌全由字牌組成。可與大小三元、大小四喜的台數疊加計算。</li></ul>
                <h4>16台</h4><ul><li><strong>天胡：</strong>莊家取完牌後立即胡牌。不另計門清、不求人、自摸、MIGI等台數。</li><li><strong>大四喜：</strong>「東、南、西、北」四種牌皆為刻子。</li></ul>
                <p class="disclaimer">麻將僅供娛樂，朋友講好就好，嚴禁賭博。</p>
            </div>
        `;
        showModal(mainModal, tableHTML);
    }

    function showPrivacyPolicy() {
        closeModal(settingsModal);
        const policyHTML = `
            <div class="modal-text-content" id="privacy-policy-content">
                <h3>隱私權政策</h3><p><strong>最後更新日期：${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日</strong></p><p>感謝您使用「麻將工具箱」。我們非常重視您的隱私權。本應用程式為完全客戶端應用，意即所有的計算與資料都只在您的瀏覽器中進行，我們不會收集、儲存或傳輸您的任何個人資訊。</p>
                <h4>資訊收集</h4><p>本應用程式**不會**收集以下任何資訊：</p><ul><li>您在「麻將計數器」中輸入的玩家名稱。</li><li>您的分數、籌碼設定或任何遊戲紀錄。</li><li>您在「聽牌計算機」中輸入的任何牌型。</li><li>您的 IP 位址、地理位置或任何裝置資訊。</li></ul>
                <h4>本機儲存 (Local Storage)</h4><p>為了提升您的使用體驗，我們可能會使用您瀏覽器的「本機儲存」功能來儲存非個人的設定資訊，例如您選擇的「自訂主題」顏色。這些資訊只會儲存在您自己的電腦或行動裝置上，我們無法存取，且您可以隨時透過清除瀏覽器快取來刪除這些資料。</p>
                <h4>Cookies</h4><p>本網站不使用任何追蹤性 Cookies。</p><p class="disclaimer">本工具僅供娛樂與學習交流，請勿用於任何形式的賭博行為。</p>
            </div>
        `;
        showModal(mainModal, policyHTML);
    }

    // --- 新增：顯示包牌行為 ---
    function showBaopaiRules() {
        closeModal(settingsModal);
        const rulesHTML = `
            <div class="modal-text-content">
                <h3>包牌行為 (詐胡)</h3>
                <p style="text-align:center; color:#555;"><strong>朋友事先講好即可，底下僅為常見標準。<br>若發生包牌或詐胡行為，行為人應賠償三家。</strong></p>
                <ol>
                    <li><strong>錯胡 (詐胡)：</strong>未聽牌或牌型不符胡牌條件卻逕行倒牌。</li>
                    <li><strong>相公倒牌：</strong>已相公 (手牌數不對) 卻倒牌胡牌。</li>
                    <li><strong>過水不胡：</strong>在同一巡內，放棄了可以胡的牌，之後在輪到自己摸牌前，若他家打出同一張牌而胡牌，視為包牌。(此條款爭議多，需事先溝通)</li>
                    <li><strong>明槓上家/指定牌：</strong>因明槓上家打出的第四張牌，而導致他家胡牌時，可能構成包牌。</li>
                    <li><strong>相公後操作：</strong>已相公狀態下，進行吃、碰、槓等動作。</li>
                    <li><strong>二次相公：</strong>在同局內已相公，卻因錯誤操作導致再次相公。</li>
                    <li><strong>不合規定的自摸：</strong>自摸時出現如搓牌未即時翻牌、碰觸手牌、牌掉落等不合程序的行為。</li>
                    <li><strong>牌牆不整 (斷橋)：</strong>手牌未正常排列，導致牌面倒塌或混亂。</li>
                    <li><strong>MIGI / 眼牌後過水：</strong>宣告MIGI(立直)或眼牌後，對可胡的牌過水不胡。</li>
                    <li><strong>明槓後自摸包牌：</strong>部分規則中，若因明槓而補牌自摸，該明槓的提供者需負擔包牌責任。(此條爭議大，需事先約定)</li>
                </ol>
                <p class="disclaimer">所有規則應以牌友間的約定為最終準則。</p>
            </div>
        `;
        showModal(mainModal, rulesHTML);
    }

    // --- 程式進入點 ---
    init();
});