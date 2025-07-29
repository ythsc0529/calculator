document.addEventListener('DOMContentLoaded', () => {
    // 全局狀態
    let myHand = [];
    let trainerProblem = { hand: [], type: '', answer: {} };
    let currentTrainerMode = 'daTing';
    let counterState = {
        players: [],
        stakes: { base: 0, perPoint: 0 }
    };
    const EMOJIS = ['😀', '😎', '😴', '🥳', '🤯', '😱', '🤔', '🤠', '👽', '👻', '🦊', '🐶'];

    // 資料定義 (圖片映射)
    const TILE_TYPES = {
        'm': { name: '萬', count: 9, prefix: ['一', '二', '三', '四', '五', '六', '七', '八', '九'] },
        'p': { name: '筒', count: 9, prefix: ['一', '二', '三', '四', '五', '六', '七', '八', '九'] },
        's': { name: '條', count: 9, prefix: ['一', '二', '三', '四', '五', '六', '七', '八', '九'] },
        'z': { name: '字', count: 7, names: ['東', '南', '西', '北', '中', '發', '白'] }
    };
    const TILE_IMAGE_MAP = new Map();
    const ALL_TILES = [];
    const SUITS_ORDER = ['m', 'p', 's', 'z'];
    SUITS_ORDER.forEach(suit => {
        const type = TILE_TYPES[suit];
        for (let i = 1; i <= type.count; i++) {
            const tileKey = `${i}${suit}`;
            ALL_TILES.push(tileKey);
            let imageName;
            if (suit !== 'z') {
                imageName = `${type.prefix[i - 1]}${type.name}.svg`;
            } else {
                imageName = `${type.names[i - 1]}.svg`;
            }
            TILE_IMAGE_MAP.set(tileKey, `tiles/${imageName}`);
        }
    });

    // DOM 元素獲取
    const views = {
        calculator: document.getElementById('calculator'),
        trainer: document.getElementById('trainer'),
        counter: document.getElementById('counter'),
    };
    const navButtons = {
        calculator: document.getElementById('show-calculator'),
        trainer: document.getElementById('show-trainer'),
        counter: document.getElementById('show-counter'),
    };
    const myHandDiv = document.getElementById('my-hand');
    const resultArea = document.getElementById('result-area');
    const calculateBtn = document.getElementById('calculate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const trainerDaTingBtn = document.getElementById('trainer-da-ting-btn');
    const trainerTingPaiBtn = document.getElementById('trainer-ting-pai-btn');
    const trainerNewProblemBtn = document.getElementById('trainer-new-problem-btn');
    const trainerShowAnswerBtn = document.getElementById('trainer-show-answer-btn');
    const trainerModeDisplay = document.getElementById('trainer-mode-display');
    const problemArea = document.getElementById('problem-area');
    const problemHandDiv = document.getElementById('problem-hand');
    const answerArea = document.getElementById('answer-area');
    const answerOptionsDiv = document.getElementById('answer-options');
    const trainerNotTingBtn = document.getElementById('trainer-not-ting-btn');
    const trainerResultDiv = document.getElementById('trainer-result');
    const counterSetup = document.getElementById('counter-setup');
    const playerNameInputs = [document.getElementById('player-name-1'), document.getElementById('player-name-2'), document.getElementById('player-name-3'), document.getElementById('player-name-4')];
    const stakesSelect = document.getElementById('stakes-select');
    const startGameBtn = document.getElementById('start-game-btn');
    const counterMain = document.getElementById('counter-main');
    const playerPods = [document.getElementById('player-1'), document.getElementById('player-2'), document.getElementById('player-3'), document.getElementById('player-4')];
    const btnZimo = document.getElementById('btn-zimo');
    const btnHupai = document.getElementById('btn-hupai');
    const btnSettle = document.getElementById('btn-settle');
    const scoringModal = document.getElementById('scoring-modal');
    const modalTitle = document.getElementById('modal-title');
    const zimoSection = document.getElementById('zimo-section');
    const hupaiSection = document.getElementById('hupai-section');
    const taiCountInput = document.getElementById('tai-count');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const settleModal = document.getElementById('settle-modal');
    const settleDetails = document.getElementById('settle-details');
    const settleCloseBtn = document.getElementById('settle-close-btn');

    // ★★★ 終極防護：用 style.display 控制顯示/隱藏的函式 ★★★
    const showElement = (el, displayMode = 'block') => { if (el) el.style.display = displayMode; };
    const hideElement = (el) => { if (el) el.style.display = 'none'; };

    // 麻將演算法... (此處省略以保持可讀性，實際貼上時請用完整程式碼)
    const sortTiles = (a, b) => {
        const suitOrder = { 'm': 1, 'p': 2, 's': 3, 'z': 4 };
        const suitA = a.slice(-1), suitB = b.slice(-1);
        if (suitA !== suitB) return suitOrder[suitA] - suitOrder[suitB];
        return parseInt(a, 10) - parseInt(b, 10);
    };
    const checkHu = (hand) => {
        if (hand.length === 0) return true;
        if (hand.length >= 3 && hand[0] === hand[1] && hand[0] === hand[2]) {
            if (checkHu(hand.slice(3))) return true;
        }
        const num = parseInt(hand[0], 10), suit = hand[0].slice(-1);
        if (suit !== 'z' && num <= 7) {
            const next1 = `${num + 1}${suit}`, next2 = `${num + 2}${suit}`;
            const idx1 = hand.indexOf(next1), idx2 = hand.indexOf(next2);
            if (idx1 > 0 && idx2 > 0) {
                const remainingHand = hand.filter((_, i) => i !== 0 && i !== idx1 && i !== idx2);
                if (checkHu(remainingHand)) return true;
            }
        }
        return false;
    };
    const isWinningHand = (hand) => {
        if (hand.length < 2 || hand.length % 3 !== 2) return false;
        const sortedHand = [...hand].sort(sortTiles);
        for (const tile of new Set(sortedHand)) {
            const counts = sortedHand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
            if (counts[tile] >= 2) {
                const tempHand = [...sortedHand];
                tempHand.splice(tempHand.indexOf(tile), 1);
                tempHand.splice(tempHand.indexOf(tile), 1);
                if (checkHu(tempHand)) return true;
            }
        }
        return false;
    };
    const findTingPai = (hand) => {
        const ting = new Set();
        for (const tile of ALL_TILES) {
            const counts = hand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
            if ((counts[tile] || 0) >= 4) continue;
            if (isWinningHand([...hand, tile])) ting.add(tile);
        }
        return [...ting];
    };
    const findDaTing = (hand) => {
        const results = {};
        for (const tileToDiscard of new Set(hand)) {
            const tempHand = [...hand];
            tempHand.splice(tempHand.indexOf(tileToDiscard), 1);
            const ting = findTingPai(tempHand);
            if (ting.length > 0) results[tileToDiscard] = ting;
        }
        return results;
    };

    // 渲染函式... (此處省略以保持可讀性，實際貼上時請用完整程式碼)
    const renderTiles = (container, hand, onClick = null) => {
        container.innerHTML = '';
        const sortedHand = [...hand].sort(sortTiles);
        sortedHand.forEach((tile, index) => {
            const tileDiv = document.createElement('div');
            tileDiv.className = 'tile';
            tileDiv.style.animation = `popIn 0.3s ease forwards ${index * 0.02}s`;
            tileDiv.style.backgroundImage = `url("${TILE_IMAGE_MAP.get(tile)}")`;
            tileDiv.dataset.tile = tile;
            if (onClick) {
                tileDiv.addEventListener('click', () => onClick(tile));
            }
            container.appendChild(tileDiv);
        });
    };
    const renderResult = (message, daTingResults = {}, tingPaiResults = []) => {
        resultArea.classList.remove('show');
        setTimeout(() => {
            if (message.includes("胡牌")) {
                resultArea.innerHTML = `<p class="hu">${message}</p>`;
            } else {
                resultArea.innerHTML = `<p>${message}</p>`;
                if (Object.keys(daTingResults).length > 0) {
                    for (const discardTile in daTingResults) {
                        const itemDiv = document.createElement('div');
                        const tingGroup = document.createElement('div');
                        tingGroup.className = 'tile-group';
                        renderTiles(tingGroup, daTingResults[discardTile]);
                        const p = document.createElement('p');
                        p.style.display = 'flex'; p.style.alignItems = 'center'; p.style.gap = '10px';
                        const discardDivContainer = document.createElement('div');
                        renderTiles(discardDivContainer, [discardTile]);
                        p.append('打 ', discardDivContainer.firstChild.cloneNode(true), ' 聽:');
                        itemDiv.appendChild(p); itemDiv.appendChild(tingGroup);
                        resultArea.appendChild(itemDiv);
                    }
                }
                if (tingPaiResults.length > 0) {
                    const tingGroup = document.createElement('div');
                    tingGroup.className = 'tile-group';
                    renderTiles(tingGroup, tingPaiResults);
                    resultArea.appendChild(tingGroup);
                }
            }
            resultArea.classList.add('show');
        }, 10);
    };

    // 頁面切換邏輯
    const switchView = (viewToShow) => {
        Object.values(views).forEach(hideElement);
        Object.values(navButtons).forEach(b => b.classList.remove('active'));
        
        showElement(views[viewToShow]);
        navButtons[viewToShow].classList.add('active');
    };
    Object.keys(navButtons).forEach(key => {
        navButtons[key].addEventListener('click', () => switchView(key));
    });

    // 聽牌計算機邏輯... (此處省略以保持可讀性，實際貼上時請用完整程式碼)
    const handlePaletteClick = (tile) => {
        const counts = myHand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
        if (myHand.length < 17 && (counts[tile] || 0) < 4) {
            myHand.push(tile);
            renderTiles(myHandDiv, myHand, handleHandClick);
        }
    };
    const handleHandClick = (tile) => {
        myHand.splice(myHand.indexOf(tile), 1);
        renderTiles(myHandDiv, myHand, handleHandClick);
    };
    calculateBtn.addEventListener('click', () => {
        const len = myHand.length;
        const counts = myHand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
        if (Object.values(counts).some(c => c > 4)) { renderResult('已相公 (單張牌超過4張)。'); return; }
        if (len % 3 === 2 && isWinningHand(myHand)) { renderResult('恭喜，您已胡牌！'); return; }
        if (len < 1 || len > 17 || len % 3 === 0) { renderResult('牌數不正確 (應為1, 2, 4, 5...張)，請重新輸入。'); return; }
        if (len % 3 === 1) {
            const ting = findTingPai(myHand);
            renderResult(ting.length > 0 ? '聽牌！胡以下牌：' : '還未聽牌。', {}, ting);
        } else if (len % 3 === 2) {
            const daTing = findDaTing(myHand);
            renderResult(Object.keys(daTing).length > 0 ? '打聽建議：' : '還未聽牌，無法打聽。', daTing, []);
        }
    });
    clearBtn.addEventListener('click', () => {
        myHand = [];
        renderTiles(myHandDiv, myHand, handleHandClick);
        resultArea.classList.remove('show');
    });


    // 清一色試煉邏輯... (此處省略以保持可讀性，實際貼上時請用完整程式碼)
    const setTrainerAnswerable = (isAnswerable) => {
        trainerNotTingBtn.disabled = !isAnswerable;
        answerArea.querySelectorAll('.tile').forEach(t => t.classList.toggle('disabled', !isAnswerable));
        problemHandDiv.querySelectorAll('.tile').forEach(t => t.classList.toggle('disabled', !isAnswerable));
    };
    const showTrainerAnswer = () => {
        if (!trainerProblem.hand || trainerProblem.hand.length === 0) return;
        let answerText = '';
        if (trainerProblem.type === 'noTing') { answerText = '正確答案：確實還未聽牌。'; }
        else if (trainerProblem.type === 'tingPai') { answerText = `正確答案：聽 ${trainerProblem.answer.ting.length} 張牌。`; }
        else { answerText = `正確答案：打`; }
        trainerResultDiv.innerHTML = `<p class="correct">${answerText}</p>`;
        if (trainerProblem.type === 'daTing') {
            const group = document.createElement('div');
            group.className = 'tile-group'; renderTiles(group, [trainerProblem.answer.da]);
            trainerResultDiv.appendChild(group);
        } else if (trainerProblem.type === 'tingPai') {
            const group = document.createElement('div');
            group.className = 'tile-group'; renderTiles(group, trainerProblem.answer.ting);
            trainerResultDiv.appendChild(group);
        }
        trainerResultDiv.classList.add('show');
        setTrainerAnswerable(false);
    };
    const checkTrainerAnswer = (userAnswer) => {
        let isCorrect = false;
        if (userAnswer === 'notTing') { isCorrect = trainerProblem.type === 'noTing'; }
        else if (trainerProblem.type === 'daTing') { isCorrect = userAnswer === trainerProblem.answer.da; }
        else { isCorrect = JSON.stringify(userAnswer.sort(sortTiles)) === JSON.stringify(trainerProblem.answer.ting.sort(sortTiles)); }
        trainerResultDiv.innerHTML = `<p class="${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? '正確！' : '錯誤！'}</p>`;
        trainerResultDiv.classList.add('show');
        setTrainerAnswerable(false);
    };
    const generateQingYiSeProblem = () => {
        showElement(problemArea);
        trainerResultDiv.classList.remove('show');
        answerOptionsDiv.innerHTML = '';
        setTrainerAnswerable(true);
        trainerModeDisplay.textContent = currentTrainerMode === 'daTing' ? '打聽' : '聽牌';
        let hand = [], answer = {}, attempts = 0;
        while (attempts < 100) {
            const suit = ['m', 'p', 's'][Math.floor(Math.random() * 3)];
            const tilePool = [];
            for (let i = 1; i <= 9; i++) { for (let j = 0; j < 4; j++) tilePool.push(`${i}${suit}`); }
            const modeRoll = Math.random();
            let problemType = (modeRoll < 0.2) ? 'noTing' : currentTrainerMode;
            if (problemType === 'daTing') {
                const tempHand = [];
                for (let i = 0; i < 16; i++) { tempHand.push(tilePool.splice(Math.floor(Math.random() * tilePool.length), 1)[0]); }
                if (findTingPai(tempHand).length > 0) {
                    const badTile = tilePool[Math.floor(Math.random() * tilePool.length)];
                    hand = [...tempHand, badTile];
                    if (Object.values(hand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {})).some(c => c > 4)) continue;
                    answer = { da: badTile };
                    trainerProblem = { hand, type: problemType, answer }; break;
                }
            } else if (problemType === 'tingPai') {
                for (let i = 0; i < 16; i++) { hand.push(tilePool.splice(Math.floor(Math.random() * tilePool.length), 1)[0]); }
                const ting = findTingPai(hand);
                if (ting.length > 0) { answer = { ting }; trainerProblem = { hand, type: problemType, answer }; break; }
            } else {
                for (let i = 0; i < 16; i++) { hand.push(tilePool.splice(Math.floor(Math.random() * tilePool.length), 1)[0]); }
                if (findTingPai(hand).length === 0 && Object.keys(findDaTing(hand)).length === 0) {
                    answer = {}; trainerProblem = { hand, type: problemType, answer }; break;
                }
            }
            attempts++;
        }
        if (attempts >= 100) { alert("出題失敗，請點擊“再出一題”"); return; }
        renderTiles(problemHandDiv, trainerProblem.hand, (tile) => { if (trainerProblem.type === 'daTing') checkTrainerAnswer(tile); });
        if (trainerProblem.type === 'tingPai') {
            const options = new Set(trainerProblem.answer.ting);
            while (options.size < Math.min(9, trainerProblem.answer.ting.length + 3)) { options.add(`${Math.floor(Math.random() * 9) + 1}${trainerProblem.hand[0].slice(-1)}`); }
            let selectedTing = [];
            renderTiles(answerOptionsDiv, [...options], (tile) => {
                 const tileEl = Array.from(answerOptionsDiv.children).find(el => el.dataset.tile === tile);
                 if (selectedTing.includes(tile)) { selectedTing = selectedTing.filter(t => t !== tile); tileEl.style.border = 'none'; }
                 else { selectedTing.push(tile); tileEl.style.border = '3px solid #1a73e8'; }
                 if (confirm("確定提交答案？")) { checkTrainerAnswer(selectedTing); }
            });
        }
    };
    trainerDaTingBtn.addEventListener('click', () => { currentTrainerMode = 'daTing'; generateQingYiSeProblem(); });
    trainerTingPaiBtn.addEventListener('click', () => { currentTrainerMode = 'tingPai'; generateQingYiSeProblem(); });
    trainerNewProblemBtn.addEventListener('click', generateQingYiSeProblem);
    trainerShowAnswerBtn.addEventListener('click', showTrainerAnswer);
    trainerNotTingBtn.addEventListener('click', () => checkTrainerAnswer('notTing'));

    // 麻將計數器邏輯
    const updateScoresUI = () => {
        counterState.players.forEach((player, index) => {
            const pod = playerPods[index];
            const scoreEl = pod.querySelector('.player-score');
            scoreEl.textContent = player.score;
            scoreEl.className = 'player-score';
            if (player.score > 0) scoreEl.classList.add('positive');
            if (player.score < 0) scoreEl.classList.add('negative');
        });
    };
    startGameBtn.addEventListener('click', () => {
        const stakesValue = stakesSelect.value.split('/');
        counterState.stakes = { base: parseInt(stakesValue[0], 10), perPoint: parseInt(stakesValue[1], 10) };
        const usedEmojis = new Set();
        counterState.players = playerNameInputs.map((input, index) => {
            let emoji;
            do { emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; } while (usedEmojis.has(emoji));
            usedEmojis.add(emoji);
            return { name: input.value || `玩家 ${index + 1}`, score: 0, emoji: emoji };
        });
        counterState.players.forEach((player, index) => {
            const pod = playerPods[index];
            pod.querySelector('.player-emoji').textContent = player.emoji;
            pod.querySelector('.player-name').textContent = player.name;
        });
        updateScoresUI();
        hideElement(counterSetup);
        showElement(counterMain);
    });
    const openScoringModal = (type) => {
        showElement(scoringModal, 'flex');
        modalTitle.textContent = type === 'zimo' ? '自摸計分' : '胡牌計分';
        type === 'zimo' ? showElement(zimoSection) : hideElement(zimoSection);
        type === 'hupai' ? showElement(hupaiSection) : hideElement(hupaiSection);
        taiCountInput.value = 1;
        delete modalConfirmBtn.dataset.winner; delete modalConfirmBtn.dataset.dealer; delete modalConfirmBtn.dataset.loser;
        const createPlayerButtons = (containerId, callback) => {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            counterState.players.forEach((player, index) => {
                const btn = document.createElement('button');
                btn.textContent = player.name; btn.dataset.index = index;
                btn.addEventListener('click', () => {
                    Array.from(container.children).forEach(child => child.classList.remove('selected'));
                    btn.classList.add('selected');
                    callback(index);
                });
                container.appendChild(btn);
            });
        };
        if (type === 'zimo') {
            createPlayerButtons('zimo-winner-select', (i) => modalConfirmBtn.dataset.winner = i);
            createPlayerButtons('zimo-dealer-select', (i) => modalConfirmBtn.dataset.dealer = i);
        } else {
            createPlayerButtons('hupai-winner-select', (i) => modalConfirmBtn.dataset.winner = i);
            createPlayerButtons('hupai-loser-select', (i) => modalConfirmBtn.dataset.loser = i);
        }
        modalConfirmBtn.dataset.type = type;
    };
    btnZimo.addEventListener('click', () => {
        if (views.counter.style.display !== 'block') return;
        openScoringModal('zimo');
    });
    btnHupai.addEventListener('click', () => {
        if (views.counter.style.display !== 'block') return;
        openScoringModal('hupai');
    });
    btnSettle.addEventListener('click', () => {
        if (views.counter.style.display !== 'block') return;
        let payers = counterState.players.map((p, i) => ({ ...p, index: i })).filter(p => p.score < 0).sort((a,b) => a.score - b.score);
        let receivers = counterState.players.map((p, i) => ({ ...p, index: i })).filter(p => p.score > 0).sort((a,b) => b.score - a.score);
        let transactions = [];
        payers.forEach(payer => {
            let amountToPay = -payer.score;
            receivers.forEach(receiver => {
                if (amountToPay <= 0 || receiver.score <= 0) return;
                const amountToTransfer = Math.min(amountToPay, receiver.score);
                transactions.push(`${payer.name}  ➡️  ${receiver.name}  :  ${amountToTransfer} 點`);
                amountToPay -= amountToTransfer;
                receiver.score -= amountToTransfer;
            });
        });
        settleDetails.innerHTML = transactions.length > 0 ? transactions.map(t => `<p>${t}</p>`).join('') : '<p>平手大吉！</p>';
        showElement(settleModal, 'flex');
    });

    modalCancelBtn.addEventListener('click', () => hideElement(scoringModal));
    settleCloseBtn.addEventListener('click', () => hideElement(settleModal));
    modalConfirmBtn.addEventListener('click', () => {
        const type = modalConfirmBtn.dataset.type;
        const tai = parseInt(taiCountInput.value, 10);
        if (isNaN(tai) || tai < 0) { alert('請輸入有效的台數'); return; }
        const { base, perPoint } = counterState.stakes;
        const winnerIndex = parseInt(modalConfirmBtn.dataset.winner, 10);
        if (isNaN(winnerIndex)) { alert('請選擇贏家！'); return; }
        if (type === 'zimo') {
            const dealerIndex = parseInt(modalConfirmBtn.dataset.dealer, 10);
            if (isNaN(dealerIndex)) { alert('請選擇莊家！'); return; }
            let totalWin = 0;
            for (let i = 0; i < 4; i++) {
                if (i === winnerIndex) continue;
                const isDealer = (i === dealerIndex);
                const winnerIsDealer = (winnerIndex === dealerIndex);
                const currentTai = (isDealer || winnerIsDealer) ? tai + 1 : tai;
                const loss = base + (currentTai * perPoint);
                counterState.players[i].score -= loss;
                totalWin += loss;
            }
            counterState.players[winnerIndex].score += totalWin;
        } else {
            const loserIndex = parseInt(modalConfirmBtn.dataset.loser, 10);
            if (isNaN(loserIndex)) { alert('請選擇放槍的玩家！'); return; }
            if (loserIndex === winnerIndex) { alert('贏家和放槍者不能是同一人！'); return; }
            const winAmount = base + (tai * perPoint);
            counterState.players[winnerIndex].score += winAmount;
            counterState.players[loserIndex].score -= winAmount;
        }
        updateScoresUI();
        hideElement(scoringModal);
    });

    // 初始化
    const initializeApp = () => {
        try {
            const initializePalette = () => {
                SUITS_ORDER.forEach(suit => {
                    const container = document.getElementById(`palette-${suit}`);
                    if (container) {
                        renderTiles(container, ALL_TILES.filter(tile => tile.endsWith(suit)), handlePaletteClick);
                    }
                });
            };
            initializePalette();
            // 初始顯示/隱藏元件
            Object.values(views).forEach(hideElement);
            hideElement(problemArea);
            hideElement(counterMain);
            switchView('calculator');
        } catch (e) {
            console.error("初始化失敗:", e);
            alert('頁面初始化時發生嚴重錯誤！請檢查 F12 主控台的錯誤訊息。');
        }
    };
    initializeApp();
});