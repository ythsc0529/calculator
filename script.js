document.addEventListener('DOMContentLoaded', () => {
    // --- 常數與變數定義 ---
    const TILE_TYPES = {
        'm': { name: '萬', count: 9 },
        'p': { name: '筒', count: 9 },
        's': { name: '索', count: 9 },
        'z': { name: '字', count: 7, names: ['東', '南', '西', '北', '中', '發', '白'] }
    };
    const ALL_TILES = [];
    const SUITS_ORDER = ['m', 'p', 's', 'z'];
    SUITS_ORDER.forEach(suit => {
        const type = TILE_TYPES[suit];
        for (let i = 1; i <= type.count; i++) {
            ALL_TILES.push(`${i}${suit}`);
        }
    });

    let myHand = [];
    let trainerProblem = { hand: [], type: '', answer: {} };
    let selectedAnswer = { da: null, ting: [] };

    // --- DOM 元素獲取 ---
    const myHandDiv = document.getElementById('my-hand');
    const resultArea = document.getElementById('result-area');
    const calculateBtn = document.getElementById('calculate-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    const calculatorView = document.getElementById('calculator');
    const trainerView = document.getElementById('trainer');
    const showCalculatorBtn = document.getElementById('show-calculator');
    const showTrainerBtn = document.getElementById('show-trainer');

    const trainerDaTingBtn = document.getElementById('trainer-da-ting-btn');
    const trainerTingPaiBtn = document.getElementById('trainer-ting-pai-btn');
    const problemArea = document.getElementById('problem-area');
    const problemHandDiv = document.getElementById('problem-hand');
    const answerOptionsDiv = document.getElementById('answer-options');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const trainerResultDiv = document.getElementById('trainer-result');

    // --- 核心麻將邏輯 ---
    const sortTiles = (a, b) => {
        const suitA = a.slice(-1);
        const suitB = b.slice(-1);
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        const suitOrder = { 'm': 1, 'p': 2, 's': 3, 'z': 4 };

        if (suitA !== suitB) {
            return suitOrder[suitA] - suitOrder[suitB];
        }
        return numA - numB;
    };

    const checkHu = (hand) => {
        if (hand.length === 0) return true;
        if (hand.length >= 3 && hand[0] === hand[1] && hand[0] === hand[2]) {
            if (checkHu(hand.slice(3))) return true;
        }
        const num = parseInt(hand[0], 10);
        const suit = hand[0].slice(-1);
        if (suit !== 'z' && num <= 7) {
            const next1 = `${num + 1}${suit}`;
            const next2 = `${num + 2}${suit}`;
            const idx1 = hand.indexOf(next1);
            const idx2 = hand.indexOf(next2);
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
        const uniqueTiles = [...new Set(sortedHand)];
        for (const tile of uniqueTiles) {
            const eyeRemovedHand = [...sortedHand];
            const firstIndex = eyeRemovedHand.indexOf(tile);
            if (firstIndex !== -1) {
                eyeRemovedHand.splice(firstIndex, 1);
                const secondIndex = eyeRemovedHand.indexOf(tile);
                if (secondIndex !== -1) {
                    eyeRemovedHand.splice(secondIndex, 1);
                    if (checkHu(eyeRemovedHand)) return true;
                }
            }
        }
        return false;
    };
    
    const findTingPai = (hand) => {
        const ting = new Set();
        for (const tile of ALL_TILES) {
             const counts = hand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
             if((counts[tile] || 0) >= 4) continue;
            const tempHand = [...hand, tile];
            if (isWinningHand(tempHand)) ting.add(tile);
        }
        return [...ting];
    };

    const findDaTing = (hand) => {
        const results = {};
        const uniqueTiles = [...new Set(hand)];
        for (const tileToDiscard of uniqueTiles) {
            const tempHand = [...hand];
            tempHand.splice(tempHand.indexOf(tileToDiscard), 1);
            const ting = findTingPai(tempHand);
            if (ting.length > 0) results[tileToDiscard] = ting;
        }
        return results;
    };

    // --- UI 渲染函式 ---
    const renderTiles = (container, hand, onClick = null) => {
        container.innerHTML = '';
        const sortedHand = [...hand].sort(sortTiles);
        sortedHand.forEach((tile, index) => {
            const tileDiv = document.createElement('div');
            tileDiv.className = 'tile';
            tileDiv.style.animation = `popIn 0.3s ease forwards ${index * 0.02}s`;
            const num = tile.slice(0, -1);
            const suit = tile.slice(-1);
            tileDiv.dataset.tile = tile;
            tileDiv.dataset.suit = suit;
            if (suit === 'z') {
                tileDiv.textContent = TILE_TYPES.z.names[parseInt(num, 10) - 1];
            } else {
                tileDiv.textContent = `${num}${TILE_TYPES[suit].name}`;
            }
            if (onClick) {
                tileDiv.addEventListener('click', () => onClick(tile));
            }
            container.appendChild(tileDiv);
        });
    };

    const renderResult = (message, daTingResults = {}, tingPaiResults = []) => {
        resultArea.innerHTML = `<p>${message}</p>`;
        if (Object.keys(daTingResults).length > 0) {
            for (const discardTile in daTingResults) {
                const itemDiv = document.createElement('div');
                const tingGroup = document.createElement('div');
                tingGroup.className = 'tile-group';
                renderTiles(tingGroup, daTingResults[discardTile]);
                const p = document.createElement('p');
                p.style.display = 'flex';
                p.style.alignItems = 'center';
                p.style.gap = '10px';
                const discardDivContainer = document.createElement('div');
                renderTiles(discardDivContainer, [discardTile]);
                p.append('打 ', discardDivContainer.firstChild, ' 聽:');
                itemDiv.appendChild(p);
                itemDiv.appendChild(tingGroup);
                resultArea.appendChild(itemDiv);
            }
        }
        if (tingPaiResults.length > 0) {
            const tingGroup = document.createElement('div');
            tingGroup.className = 'tile-group';
            renderTiles(tingGroup, tingPaiResults);
            resultArea.appendChild(tingGroup);
        }
        resultArea.classList.add('show');
    };

    // --- 事件處理器 ---
    const handlePaletteClick = (tile) => {
        const counts = myHand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
        if (myHand.length < 17 && (counts[tile] || 0) < 4) {
            myHand.push(tile);
            renderTiles(myHandDiv, myHand, handleHandClick);
        }
    };
    
    const handleHandClick = (tile) => {
        const index = myHand.indexOf(tile);
        if (index > -1) {
            myHand.splice(index, 1);
            renderTiles(myHandDiv, myHand, handleHandClick);
        }
    };
    
    calculateBtn.addEventListener('click', () => {
        resultArea.classList.remove('show');
        setTimeout(() => {
            const len = myHand.length;
            if (len < 1 || len > 17 || len % 3 === 0) {
                 renderResult('您已相公');
                return;
            }
            const counts = myHand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
            if (Object.values(counts).some(c => c > 4)) {
                renderResult('詐賭!同張牌不得超過四張。');
                return;
            }
            if (len % 3 === 1) {
                const ting = findTingPai(myHand);
                renderResult(ting.length > 0 ? '聽牌！胡以下牌：' : '還未聽牌。', {}, ting);
            } else if (len % 3 === 2) {
                const daTing = findDaTing(myHand);
                renderResult(Object.keys(daTing).length > 0 ? '打聽建議：' : '還未聽牌，無法打聽。', daTing, []);
            }
        }, 300);
    });
    
    clearBtn.addEventListener('click', () => {
        myHand = [];
        renderTiles(myHandDiv, myHand, handleHandClick);
        resultArea.classList.remove('show');
    });

    const switchView = (viewToShow) => {
        [calculatorView, trainerView].forEach(v => v.classList.remove('active'));
        [showCalculatorBtn, showTrainerBtn].forEach(b => b.classList.remove('active'));
        if (viewToShow === 'calculator') {
            calculatorView.classList.add('active');
            showCalculatorBtn.classList.add('active');
        } else {
            trainerView.classList.add('active');
            showTrainerBtn.classList.add('active');
            problemArea.classList.add('hidden');
        }
    };

    showCalculatorBtn.addEventListener('click', () => switchView('calculator'));
    showTrainerBtn.addEventListener('click', () => switchView('trainer'));
    
    // --- 【重要】恢復完整的清一色試煉邏輯 ---
    const formatTile = (tile) => {
        const num = tile.slice(0, -1);
        const suit = tile.slice(-1);
        return suit === 'z' ? TILE_TYPES.z.names[parseInt(num) - 1] : `${num}${TILE_TYPES[suit].name}`;
    }

    const checkTrainerAnswer = () => {
        let isCorrect = false;
        let message = '';
        if (trainerProblem.type === 'daTing') {
            if (selectedAnswer.da === trainerProblem.answer.da) {
                isCorrect = true;
                const correctAnswer = findDaTing(trainerProblem.hand);
                const tingPai = correctAnswer[selectedAnswer.da];
                message = `正確！打 ${formatTile(selectedAnswer.da)} 可聽 ${tingPai.map(formatTile).join(', ')}。`;
            } else {
                message = `錯誤！正確答案是打 <span class="tile-inline">${formatTile(trainerProblem.answer.da)}</span>。`;
            }
        } else {
            const correctAnswer = trainerProblem.answer.ting.sort(sortTiles);
            const userAnswer = selectedAnswer.ting.sort(sortTiles);
            if (JSON.stringify(correctAnswer) === JSON.stringify(userAnswer)) {
                isCorrect = true;
                message = `完全正確！答案就是聽 ${correctAnswer.map(formatTile).join(', ')}。`;
            } else {
                message = `回答錯誤。正確答案是聽 ${correctAnswer.map(formatTile).join(', ')}。`;
            }
        }
        trainerResultDiv.innerHTML = `<p class="${isCorrect ? 'correct' : 'incorrect'}">${message}</p>`;
        trainerResultDiv.classList.add('show');
    };

    const handleProblemTileClick = (tile) => {
        if (trainerProblem.type !== 'daTing') return;
        selectedAnswer.da = tile;
        checkTrainerAnswer();
    };

    const handleAnswerOptionClick = (tile) => {
        if (trainerProblem.type !== 'tingPai') return;
        const tileEl = Array.from(answerOptionsDiv.children).find(el => el.dataset.tile === tile);
        if (selectedAnswer.ting.includes(tile)) {
            selectedAnswer.ting = selectedAnswer.ting.filter(t => t !== tile);
            tileEl.style.border = '1px solid #999';
        } else {
            selectedAnswer.ting.push(tile);
            tileEl.style.border = '2px solid #1a73e8';
        }
        submitAnswerBtn.classList.toggle('hidden', selectedAnswer.ting.length === 0);
    };

    submitAnswerBtn.addEventListener('click', checkTrainerAnswer);

    const generateQingYiSeProblem = (type) => {
        let winningHand;
        let attempts = 0;
        const MAX_ATTEMPTS = 200;
        const suit = ['m', 'p', 's'][Math.floor(Math.random() * 3)];
        
        while (attempts < MAX_ATTEMPTS) {
            winningHand = [];
            const eyeNum = Math.floor(Math.random() * 9) + 1;
            winningHand.push(`${eyeNum}${suit}`, `${eyeNum}${suit}`);
            for (let i = 0; i < 5; i++) {
                if (Math.random() > 0.4) {
                    let num = Math.floor(Math.random() * 9) + 1;
                    winningHand.push(`${num}${suit}`, `${num}${suit}`, `${num}${suit}`);
                } else {
                    let startNum = Math.floor(Math.random() * 7) + 1;
                    winningHand.push(`${startNum}${suit}`, `${startNum+1}${suit}`, `${startNum+2}${suit}`);
                }
            }
            let counts = winningHand.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
            if (!Object.values(counts).some(c => c > 4)) break;
            attempts++;
        }

        if (attempts === MAX_ATTEMPTS) {
            alert("題目生成失敗，請再試一次。");
            return;
        }

        problemArea.classList.remove('hidden');
        trainerResultDiv.classList.remove('show');
        answerOptionsDiv.innerHTML = '';
        submitAnswerBtn.classList.add('hidden');
        selectedAnswer = { da: null, ting: [] };
        trainerProblem.type = type;

        if (type === 'tingPai') {
            const removedIndex = Math.floor(Math.random() * winningHand.length);
            winningHand.splice(removedIndex, 1);
            trainerProblem.hand = winningHand;
            trainerProblem.answer = { ting: findTingPai(winningHand) };
            renderTiles(problemHandDiv, trainerProblem.hand);
            const options = [...new Set(trainerProblem.answer.ting)];
            while(options.length < 5) {
                let randomTile = `${Math.floor(Math.random() * 9) + 1}${suit}`;
                if (!options.includes(randomTile)) options.push(randomTile);
            }
            renderTiles(answerOptionsDiv, options, handleAnswerOptionClick);
        } else {
            const handToMess = [...winningHand];
            const goodTileIndex = Math.floor(Math.random() * handToMess.length);
            handToMess.splice(goodTileIndex, 1);
            let badTile;
            do {
                badTile = `${Math.floor(Math.random() * 9) + 1}${suit}`;
            } while (isWinningHand([...handToMess, badTile]));
            const finalHand = [...handToMess, badTile];
            trainerProblem.hand = finalHand;
            trainerProblem.answer = { da: badTile };
            renderTiles(problemHandDiv, trainerProblem.hand, handleProblemTileClick);
        }
    };

    trainerDaTingBtn.addEventListener('click', () => generateQingYiSeProblem('daTing'));
    trainerTingPaiBtn.addEventListener('click', () => generateQingYiSeProblem('tingPai'));

    // --- 初始化 (更新為分行顯示) ---
    const initializePalette = () => {
        SUITS_ORDER.forEach(suit => {
            const container = document.getElementById(`palette-${suit}`);
            if (container) {
                const tilesOfSuit = ALL_TILES.filter(tile => tile.endsWith(suit));
                renderTiles(container, tilesOfSuit, handlePaletteClick);
            }
        });
    };

    initializePalette();
    switchView('calculator');
});