document.addEventListener('DOMContentLoaded', () => {
    const core = window.OnlineScoreCore;
    const localTab = document.getElementById('score-mode-local');
    const onlineTab = document.getElementById('score-mode-online');
    const localPanel = document.getElementById('counter-local');
    const onlinePanel = document.getElementById('counter-online');
    const status = document.getElementById('online-status');
    const authPanel = document.getElementById('online-auth');
    const lobby = document.getElementById('online-lobby');
    const waitingPanel = document.getElementById('online-waiting');
    const roomPanel = document.getElementById('online-room');
    const finishedPanel = document.getElementById('online-finished');
    const createForm = document.getElementById('online-create-form');
    const joinForm = document.getElementById('online-join-form');
    const roomCodeInput = document.getElementById('online-room-code-input');
    const roomCodeLabel = document.getElementById('online-room-code');
    const playersGrid = document.getElementById('online-players');
    const dealerSelect = document.getElementById('online-dealer');
    const connectionLabel = document.getElementById('online-connection');
    const historyPanel = document.getElementById('online-history');
    const actionModal = document.getElementById('online-action-modal');
    const actionBody = document.getElementById('online-action-body');
    const wakeButton = document.getElementById('online-wake-btn');
    const resumePanel = document.getElementById('online-resume');
    const othersModal = document.getElementById('online-others-modal');
    const calculatorModal = document.getElementById('online-calculator-modal');
    const calculatorLayout = document.querySelector('#calculator-section .calculator-layout');
    const calculatorHome = calculatorLayout.parentElement;
    const calculatorNext = calculatorLayout.nextSibling;

    let database = null;
    let currentUser = null;
    let currentRoom = null;
    let currentCode = null;
    let unsubscribeRoom = null;
    let serverFresh = false;
    let busy = false;
    let autoRestoreDone = false;
    let wantsWakeLock = false;
    let wakeSentinel = null;
    let reconnectTimer = null;
    let qrJoinTried = false;
    let renderedQrCode = null;

    function phaseOf(room) {
        return room.phase || (room.history?.length ? 'playing' : 'waiting');
    }
    function setSessionLocked(locked) {
        document.body.classList.toggle('online-session', locked);
    }
    function joinUrl(code) {
        return `${location.origin}${location.pathname}${location.search}#score=${code}`;
    }

    function storedCode() {
        if (!currentUser) return null;
        try { return localStorage.getItem(`onlineScoreRoom:${currentUser.uid}`); }
        catch (_) { return null; }
    }
    function rememberCode(code) {
        if (!currentUser) return;
        try {
            if (code) localStorage.setItem(`onlineScoreRoom:${currentUser.uid}`, code);
            else localStorage.removeItem(`onlineScoreRoom:${currentUser.uid}`);
        } catch (_) { /* The room code remains visible on screen. */ }
    }
    function hashCode() {
        const match = location.hash.match(/^#score=([A-HJ-NP-Z2-9]{6})$/i);
        return match ? match[1].toUpperCase() : null;
    }
    function message(error) {
        if (error?.code === 'permission-denied' || error?.code === 403 || /\b403\b/.test(error?.message || '')) {
            return '連線計分權限遭拒（403）。請在 Firebase 控制台發布最新的 firestore.rules。';
        }
        if (error?.code === 'unavailable') return '目前無法連線，恢復網路後請重試。';
        if (error?.code === 'unauthenticated') return '登入已失效，請重新登入。';
        if (error?.code === 'auth/unauthorized-domain') return '目前網站網址尚未加入 Firebase 授權網域。';
        if (error?.code === 'auth/popup-blocked') return '登入視窗被封鎖，請允許彈出視窗後再試。';
        return error?.message || '操作失敗，請稍後再試。';
    }
    function setStatus(text, kind = '') {
        status.textContent = text;
        status.dataset.kind = kind;
        status.hidden = !text;
    }
    function setBusy(value) {
        busy = value;
        createForm.querySelector('button[type="submit"]').disabled = value;
        joinForm.querySelector('button[type="submit"]').disabled = value;
        updateActions();
    }
    function setMode(isOnline) {
        if (busy || (currentCode && !isOnline)) return;
        localPanel.hidden = isOnline;
        onlinePanel.hidden = !isOnline;
        localTab.classList.toggle('active', !isOnline);
        onlineTab.classList.toggle('active', isOnline);
        localTab.setAttribute('aria-selected', String(!isOnline));
        onlineTab.setAttribute('aria-selected', String(isOnline));
        if (isOnline) refreshView();
        else {
            stopListening();
            closeActionModal();
            closeOthersModal();
            closeCalculatorModal();
            releaseWakeLock();
        }
    }
    function showLobby() {
        authPanel.hidden = true;
        lobby.hidden = false;
        waitingPanel.hidden = true;
        roomPanel.hidden = true;
        finishedPanel.hidden = true;
        setSessionLocked(false);
        closeActionModal(true);
        closeOthersModal();
        closeCalculatorModal();
        releaseWakeLock();
        resumePanel.hidden = !storedCode();
        const sharedCode = hashCode();
        if (sharedCode) roomCodeInput.value = sharedCode;
    }
    function refreshView() {
        if (onlinePanel.hidden) return;
        if (location.protocol === 'file:') {
            authPanel.hidden = false;
            lobby.hidden = true;
            waitingPanel.hidden = true;
            roomPanel.hidden = true;
            finishedPanel.hidden = true;
            document.getElementById('online-login-btn').disabled = true;
            setStatus('四人連線需從同一個 HTTPS 網站開啟；直接開本機 HTML 可使用單機模式。', 'warning');
            return;
        }
        if (!database || !core) {
            authPanel.hidden = false;
            lobby.hidden = true;
            waitingPanel.hidden = true;
            roomPanel.hidden = true;
            finishedPanel.hidden = true;
            document.getElementById('online-login-btn').disabled = true;
            setStatus('Firebase 尚未載入，請確認網路連線與網站設定。', 'warning');
            return;
        }
        if (!currentUser) {
            authPanel.hidden = false;
            lobby.hidden = true;
            waitingPanel.hidden = true;
            roomPanel.hidden = true;
            finishedPanel.hidden = true;
            setStatus('請先登入，再建立或加入牌局。');
            return;
        }
        authPanel.hidden = true;
        if (currentCode) {
            lobby.hidden = true;
            setSessionLocked(true);
            if (!unsubscribeRoom) listenToRoom(currentCode);
            return;
        }
        showLobby();
        if (!autoRestoreDone) {
            autoRestoreDone = true;
            const shared = hashCode();
            if (shared && !qrJoinTried) {
                qrJoinTried = true;
                const name = userName(document.getElementById('online-join-name'));
                if (name) { joinRoomByCode(shared, name); return; }
            }
            const saved = storedCode();
            if (saved) openRoom(saved);
        }
    }
    function stopListening() {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        if (unsubscribeRoom) unsubscribeRoom();
        unsubscribeRoom = null;
        serverFresh = false;
    }
    function randomCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const values = new Uint8Array(6);
        crypto.getRandomValues(values);
        return Array.from(values, value => alphabet[value % alphabet.length]).join('');
    }
    function actionId() {
        if (crypto.randomUUID) return crypto.randomUUID();
        return `${Date.now()}-${randomCode()}`;
    }
    function userName(input) {
        return input.value.trim().slice(0, 20);
    }
    function roomRef(code) {
        return database.collection('scoreRooms').doc(code);
    }
    async function createRoom(event) {
        event.preventDefault();
        if (!currentUser || !database || busy) return;
        const name = userName(document.getElementById('online-create-name'));
        if (!name) return setStatus('請先輸入你的稱呼。', 'warning');
        const base = Number(document.getElementById('online-base').value);
        const taiValue = Number(document.getElementById('online-tai-value').value);
        const limitEnabled = document.getElementById('online-limit-enabled').checked;
        const scoreLimit = limitEnabled ? Number(document.getElementById('online-limit').value) : null;
        if (![base, taiValue].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 1000000)
            || base + taiValue === 0) return setStatus('底分與每台點數請填入有效整數，且至少一項大於 0。', 'warning');
        if (limitEnabled && (!Number.isSafeInteger(scoreLimit) || scoreLimit < 1 || scoreLimit > 1000000000)) {
            return setStatus('輸分上限請填入 1 到 10 億的整數。', 'warning');
        }
        setBusy(true);
        try {
            for (let attempt = 0; attempt < 5; attempt++) {
                const code = randomCode();
                const reference = roomRef(code);
                try {
                    await database.runTransaction(async transaction => {
                        const snapshot = await transaction.get(reference);
                        if (snapshot.exists) throw new Error('ROOM_EXISTS');
                        transaction.set(reference, {
                            version: 1,
                            ownerUid: currentUser.uid,
                            base,
                            taiValue,
                            dealerWind: '東',
                            phase: 'waiting',
                            scoreLimit,
                            endReason: null,
                            startedAt: null,
                            endedAt: null,
                            members: [{ uid: currentUser.uid, wind: '東', name, score: 0 }],
                            history: [],
                            revision: 0,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    openRoom(code);
                    setStatus('房間已建立，等另外三位玩家加入。');
                    return;
                } catch (error) {
                    if (error.message !== 'ROOM_EXISTS') throw error;
                }
            }
            throw new Error('暫時無法產生房號，請再試一次。');
        } catch (error) { setStatus(message(error), 'error'); }
        finally { setBusy(false); }
    }
    async function joinRoom(event) {
        event.preventDefault();
        if (!currentUser || !database || busy) return;
        const code = roomCodeInput.value.trim().toUpperCase();
        const name = userName(document.getElementById('online-join-name'));
        if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return setStatus('請輸入六位房號。', 'warning');
        if (!name) return setStatus('請先輸入你的稱呼。', 'warning');
        await joinRoomByCode(code, name);
    }
    async function joinRoomByCode(code, name) {
        if (!currentUser || !database || busy) return;
        setBusy(true);
        try {
            const reference = roomRef(code);
            await database.runTransaction(async transaction => {
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists) throw new Error('找不到這個房號。');
                const data = snapshot.data();
                if (data.members.some(member => member.uid === currentUser.uid)) return;
                if (phaseOf(data) !== 'waiting') throw new Error('這桌已經開始，無法再加入。');
                const availableWind = core.WINDS.find(wind => !data.members.some(member => member.wind === wind));
                if (!availableWind) throw new Error('房間已滿。');
                transaction.update(reference, {
                    members: data.members.concat({ uid: currentUser.uid, wind: availableWind, name, score: 0 }),
                    revision: (data.revision || 0) + 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            openRoom(code);
            setStatus('已加入牌局。');
        } catch (error) { setStatus(message(error), 'error'); }
        finally { setBusy(false); }
    }
    function openRoom(code) {
        document.getElementById('nav-counter').click();
        stopListening();
        currentCode = code;
        currentRoom = null;
        playersGrid.replaceChildren();
        historyPanel.replaceChildren();
        rememberCode(code);
        roomCodeLabel.textContent = code;
        document.getElementById('online-waiting-code').textContent = code;
        authPanel.hidden = true;
        lobby.hidden = true;
        waitingPanel.hidden = false;
        roomPanel.hidden = true;
        finishedPanel.hidden = true;
        setSessionLocked(true);
        connectionLabel.textContent = '連線中';
        updateActions();
        listenToRoom(code);
    }
    function listenToRoom(code) {
        if (unsubscribeRoom || !database) return;
        unsubscribeRoom = roomRef(code).onSnapshot({ includeMetadataChanges: true }, snapshot => {
            if (code !== currentCode) return;
            if (!snapshot.exists) {
                stopListening();
                currentCode = null;
                currentRoom = null;
                rememberCode(null);
                if (hashCode() === code) history.replaceState(null, '', location.pathname + location.search);
                showLobby();
                setStatus('房間已解散。', 'warning');
                return;
            }
            const data = snapshot.data();
            if (!data.members?.some(member => member.uid === currentUser?.uid)) {
                stopListening();
                currentCode = null;
                currentRoom = null;
                rememberCode(null);
                showLobby();
                setStatus('你已不在這桌，請重新加入。', 'warning');
                return;
            }
            currentRoom = data;
            serverFresh = !snapshot.metadata.fromCache && navigator.onLine;
            connectionLabel.textContent = serverFresh ? '已同步' : '等待連線';
            connectionLabel.classList.toggle('is-offline', !serverFresh);
            if (!serverFresh) setStatus('暫時離線。牌局資料仍保留；恢復網路後會自動取得最新點數。', 'warning');
            else setStatus('');
            renderSession();
        }, error => {
            unsubscribeRoom = null;
            serverFresh = false;
            connectionLabel.textContent = '連線中斷';
            updateActions();
            setStatus(message(error), 'error');
            if (error?.code !== 'permission-denied' && code === currentCode) {
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    if (code === currentCode && !onlinePanel.hidden) listenToRoom(code);
                }, 3000);
            }
        });
    }
    function formatScore(value) {
        return value > 0 ? `+${value}` : String(value);
    }
    function renderQr(code) {
        if (renderedQrCode === code) return;
        renderedQrCode = code;
        const target = document.getElementById('online-qr');
        target.replaceChildren();
        if (typeof qrcode !== 'function') {
            target.textContent = 'QR Code 暫時無法顯示，請複製邀請連結。';
            return;
        }
        try {
            const qr = qrcode(0, 'M');
            qr.addData(joinUrl(code));
            qr.make();
            target.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 8, scalable: true });
        } catch (_) {
            target.textContent = 'QR Code 暫時無法顯示，請複製邀請連結。';
        }
    }
    function renderWaiting() {
        const members = currentRoom.members;
        document.getElementById('online-waiting-count').textContent = `${members.length} / 4 位玩家`;
        document.getElementById('online-waiting-stake').textContent = `底 ${currentRoom.base} · 每台 ${currentRoom.taiValue} · ${currentRoom.scoreLimit ? `輸分上限 ${currentRoom.scoreLimit}` : '無輸分上限'}`;
        const seats = document.getElementById('online-waiting-seats');
        seats.replaceChildren();
        core.WINDS.forEach(wind => {
            const member = members.find(item => item.wind === wind);
            const item = document.createElement('div');
            item.className = `online-waiting-seat${member ? ' is-filled' : ''}`;
            const label = document.createElement('span');
            label.textContent = wind;
            const name = document.createElement('strong');
            name.textContent = member ? member.name : '等待加入';
            item.append(label, name);
            seats.appendChild(item);
        });
        renderQr(currentCode);
        updateActions();
    }
    function renderFinished() {
        const reason = currentRoom.endReason === 'limit'
            ? `有人已達輸分上限 ${currentRoom.scoreLimit} 點，牌局自動結束。`
            : '玩家已結束這場對局。';
        document.getElementById('online-finish-reason').textContent = reason;
        const scores = document.getElementById('online-final-scores');
        scores.replaceChildren();
        currentRoom.members.slice().sort((a, b) => b.score - a.score).forEach(member => {
            const row = document.createElement('div');
            const name = document.createElement('span');
            name.textContent = `${member.wind} · ${member.name}`;
            const value = document.createElement('strong');
            value.textContent = formatScore(member.score);
            value.className = member.score >= 0 ? 'positive' : 'negative';
            row.append(name, value);
            scores.appendChild(row);
        });
        const payments = document.getElementById('online-payments');
        payments.replaceChildren();
        const transfers = core.settle(currentRoom);
        if (!transfers.length) {
            const empty = document.createElement('p');
            empty.textContent = '四家點數相同，無須轉點。';
            payments.appendChild(empty);
        } else {
            transfers.forEach(transfer => {
                const row = document.createElement('div');
                row.textContent = `${transfer.from} → ${transfer.to}`;
                const amount = document.createElement('strong');
                amount.textContent = `${transfer.amount} 點`;
                row.appendChild(amount);
                payments.appendChild(row);
            });
        }
        updateActions();
    }
    function renderSession() {
        if (!currentRoom || !currentUser) return;
        const phase = phaseOf(currentRoom);
        waitingPanel.hidden = phase !== 'waiting';
        roomPanel.hidden = phase !== 'playing';
        finishedPanel.hidden = phase !== 'finished';
        setSessionLocked(true);
        if (phase === 'waiting') renderWaiting();
        else if (phase === 'playing') renderRoom();
        else renderFinished();
        if (phase !== 'playing') {
            closeActionModal(true);
            closeOthersModal();
            closeCalculatorModal();
            releaseWakeLock();
        }
    }
    function animateScore(element, target) {
        if (element.scoreTarget === target && element.scoreFrame) return;
        const startValue = Number(element.textContent) || 0;
        if (element.scoreFrame) cancelAnimationFrame(element.scoreFrame);
        element.scoreTarget = target;
        element.scoreFrame = null;
        element.classList.toggle('positive', target > 0);
        element.classList.toggle('negative', target < 0);
        const reduced = document.documentElement.dataset.motion === 'off'
            || (document.documentElement.dataset.motion !== 'on' && matchMedia('(prefers-reduced-motion: reduce)').matches);
        if (startValue === target || reduced) {
            element.textContent = formatScore(target);
            return;
        }
        const startTime = performance.now();
        const frame = now => {
            const progress = Math.min((now - startTime) / 620, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            element.textContent = formatScore(Math.round(startValue + (target - startValue) * eased));
            if (progress < 1) element.scoreFrame = requestAnimationFrame(frame);
            else element.scoreFrame = null;
        };
        element.scoreFrame = requestAnimationFrame(frame);
        element.animate?.([
            { opacity: .55, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 620, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    }
    function renderRoom() {
        if (!currentRoom || !currentUser) return;
        const me = currentRoom.members.find(member => member.uid === currentUser.uid);
        if (!me) return;
        document.getElementById('online-my-seat').textContent = `${me.wind}位 · ${me.name}`;
        const myScore = document.getElementById('online-my-score');
        myScore.classList.toggle('is-long', String(Math.abs(me.score)).length >= 5);
        animateScore(myScore, me.score);
        document.getElementById('online-game-meta').textContent = `第 ${(currentRoom.history?.length || 0) + 1} 局 · 底 ${currentRoom.base} / 台 ${currentRoom.taiValue}${currentRoom.scoreLimit ? ` · 輸分上限 ${currentRoom.scoreLimit}` : ''}`;
        dealerSelect.value = currentRoom.dealerWind;
        dealerSelect.disabled = currentRoom.ownerUid !== currentUser.uid || !serverFresh || busy;
        core.WINDS.forEach(wind => {
            let card = playersGrid.querySelector(`[data-wind="${wind}"]`);
            if (!card) {
                card = document.createElement('div');
                card.className = 'online-player-card';
                card.dataset.wind = wind;
                const head = document.createElement('div');
                head.className = 'online-player-head';
                const badge = document.createElement('span');
                badge.className = 'online-wind';
                badge.textContent = wind;
                const name = document.createElement('strong');
                name.className = 'online-player-name';
                head.append(badge, name);
                const label = document.createElement('span');
                label.className = 'online-score-label';
                label.textContent = '目前點數';
                const score = document.createElement('div');
                score.className = 'online-score';
                score.textContent = '0';
                card.append(head, label, score);
                playersGrid.appendChild(card);
            }
            const member = currentRoom.members.find(item => item.wind === wind);
            card.classList.toggle('is-me', member?.uid === currentUser.uid);
            card.classList.toggle('is-empty', !member);
            card.querySelector('.online-player-name').textContent = member ? member.name : '等待加入';
            animateScore(card.querySelector('.online-score'), member ? member.score : 0);
        });
        historyPanel.replaceChildren();
        const history = currentRoom.history || [];
        if (!history.length) {
            const empty = document.createElement('p');
            empty.className = 'score-empty';
            empty.textContent = '尚未有紀錄。四位玩家到齊後即可開始。';
            historyPanel.appendChild(empty);
        } else {
            history.slice().reverse().slice(0, 100).forEach(entry => {
                const row = document.createElement('div');
                row.className = 'online-history-row';
                const number = document.createElement('span');
                number.textContent = String(entry.sequence).padStart(2, '0');
                const description = document.createElement('strong');
                description.textContent = entry.kind === 'zimo'
                    ? `${entry.winnerName} 自摸 · ${entry.tai} 台`
                    : `${entry.winnerName} 胡 ${entry.loserName} · ${entry.tai} 台`;
                const changes = document.createElement('span');
                changes.textContent = entry.deltas.map((delta, index) => `${core.WINDS[index]} ${formatScore(delta)}`).join('  ·  ');
                row.append(number, description, changes);
                historyPanel.appendChild(row);
            });
        }
        updateActions();
    }
    function updateActions() {
        const me = currentRoom?.members?.find(member => member.uid === currentUser?.uid);
        const phase = currentRoom ? phaseOf(currentRoom) : '';
        const canScore = !!me && phase === 'playing' && currentRoom.members.length === 4 && serverFresh && !busy;
        document.getElementById('online-hu-btn').disabled = !canScore;
        document.getElementById('online-zimo-btn').disabled = !canScore;
        document.getElementById('online-undo-btn').disabled = !canScore
            || currentRoom.ownerUid !== currentUser.uid || !currentRoom.history?.length;
        dealerSelect.disabled = !me || phase !== 'playing' || currentRoom.ownerUid !== currentUser.uid || !serverFresh || busy;
        document.getElementById('online-start-btn').disabled = !me || phase !== 'waiting'
            || currentRoom.ownerUid !== currentUser.uid || currentRoom.members.length !== 4 || !serverFresh || busy;
        document.getElementById('online-start-btn').hidden = !me || currentRoom.ownerUid !== currentUser.uid;
        document.getElementById('online-end-btn').disabled = !canScore;
        ['online-waiting-exit-btn', 'online-game-exit-btn', 'online-finished-exit-btn'].forEach(id => {
            document.getElementById(id).disabled = !me || !serverFresh || busy;
        });
    }
    function closeActionModal(force = false) {
        if (busy && !force) return;
        actionModal.style.display = 'none';
        actionBody.replaceChildren();
    }
    function closeOthersModal() {
        othersModal.style.display = 'none';
    }
    function closeCalculatorModal() {
        calculatorModal.style.display = 'none';
        if (calculatorLayout.parentElement !== calculatorHome) {
            calculatorHome.insertBefore(calculatorLayout, calculatorNext);
        }
    }
    function openCalculatorModal() {
        if (!currentRoom || phaseOf(currentRoom) !== 'playing') return;
        document.getElementById('online-calculator-body').appendChild(calculatorLayout);
        calculatorModal.style.display = 'block';
    }
    function openActionModal(kind) {
        if (!currentRoom || phaseOf(currentRoom) !== 'playing' || !serverFresh || currentRoom.members.length !== 4 || busy) return;
        const me = currentRoom.members.find(member => member.uid === currentUser?.uid);
        if (!me) return;
        actionBody.replaceChildren();
        const heading = document.createElement('h3');
        heading.id = 'online-action-title';
        heading.textContent = kind === 'hu' ? '我胡牌' : '我自摸';
        const detail = document.createElement('p');
        detail.textContent = `贏家：${me.wind}位 ${me.name}　莊家：${currentRoom.dealerWind}位`;
        const form = document.createElement('form');
        form.className = 'online-action-form';
        if (kind === 'hu') {
            const label = document.createElement('span');
            label.className = 'online-field-label';
            label.textContent = '誰放槍？';
            const choices = document.createElement('div');
            choices.className = 'online-loser-choices';
            currentRoom.members.filter(member => member.uid !== me.uid).forEach(member => {
                const choice = document.createElement('label');
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'online-loser';
                radio.value = member.uid;
                radio.required = true;
                const text = document.createElement('span');
                text.textContent = `${member.wind} · ${member.name}`;
                choice.append(radio, text);
                choices.appendChild(choice);
            });
            form.append(label, choices);
        }
        const taiLabel = document.createElement('label');
        taiLabel.className = 'online-tai-label';
        taiLabel.textContent = '這局幾台？';
        const taiInput = document.createElement('input');
        taiInput.type = 'number';
        taiInput.min = '0';
        taiInput.max = '99';
        taiInput.value = '0';
        taiInput.required = true;
        taiLabel.appendChild(taiInput);
        const errorText = document.createElement('p');
        errorText.className = 'online-action-error';
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.textContent = '確認並同步點數';
        form.append(taiLabel, errorText, submit);
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (busy) return;
            const loserUid = kind === 'hu' ? form.querySelector('input[name="online-loser"]:checked')?.value : null;
            if (kind === 'hu' && !loserUid) {
                errorText.textContent = '請選擇放槍者。';
                return;
            }
            const operationId = actionId();
            submit.disabled = true;
            setBusy(true);
            try {
                const reference = roomRef(currentCode);
                await database.runTransaction(async transaction => {
                    const snapshot = await transaction.get(reference);
                    if (!snapshot.exists) throw new Error('房間已不存在。');
                    const data = snapshot.data();
                    if (phaseOf(data) !== 'playing') throw new Error('對局已結束，請查看結算。');
                    if (data.history.some(item => item.id === operationId)) return;
                    const result = core.applyRound(data, {
                        id: operationId,
                        kind,
                        winnerUid: currentUser.uid,
                        loserUid,
                        tai: Number(taiInput.value),
                        at: Date.now()
                    });
                    transaction.update(reference, {
                        members: result.members,
                        history: result.history,
                        ...(result.reachedLimit ? {
                            phase: 'finished', endReason: 'limit',
                            endedAt: firebase.firestore.FieldValue.serverTimestamp()
                        } : {}),
                        revision: (data.revision || 0) + 1,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                closeActionModal(true);
            } catch (error) { errorText.textContent = message(error); }
            finally { setBusy(false); submit.disabled = false; }
        });
        actionBody.append(heading, detail, form);
        actionModal.style.display = 'block';
        taiInput.focus();
    }
    async function updateDealer() {
        if (!currentRoom || phaseOf(currentRoom) !== 'playing' || !currentUser || !serverFresh || busy) return;
        const dealerWind = dealerSelect.value;
        setBusy(true);
        try {
            const reference = roomRef(currentCode);
            await database.runTransaction(async transaction => {
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists) throw new Error('房間已不存在。');
                const data = snapshot.data();
                if (data.ownerUid !== currentUser.uid) throw new Error('只有房主可以更換莊家。');
                transaction.update(reference, {
                    dealerWind,
                    revision: (data.revision || 0) + 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        } catch (error) {
            dealerSelect.value = currentRoom.dealerWind;
            setStatus(message(error), 'error');
        } finally { setBusy(false); }
    }
    async function undoRound() {
        if (!currentRoom || phaseOf(currentRoom) !== 'playing' || !currentUser || !serverFresh || busy) return;
        const lastId = currentRoom.history?.at(-1)?.id;
        setBusy(true);
        try {
            const reference = roomRef(currentCode);
            await database.runTransaction(async transaction => {
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists) throw new Error('房間已不存在。');
                const data = snapshot.data();
                if (data.history.at(-1)?.id !== lastId) throw new Error('牌局已更新，請確認最新紀錄再復原。');
                const result = core.undoLast(data, currentUser.uid);
                transaction.update(reference, {
                    ...result,
                    revision: (data.revision || 0) + 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        } catch (error) { setStatus(message(error), 'error'); }
        finally { setBusy(false); }
    }
    async function startOnlineGame() {
        if (!currentRoom || !serverFresh || busy) return;
        setBusy(true);
        try {
            const reference = roomRef(currentCode);
            await database.runTransaction(async transaction => {
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists) throw new Error('房間已解散。');
                const data = snapshot.data();
                if (data.ownerUid !== currentUser.uid) throw new Error('只有房主可以開始對局。');
                if (phaseOf(data) !== 'waiting' || data.members.length !== 4) throw new Error('請等四位玩家都入座。');
                transaction.update(reference, {
                    phase: 'playing',
                    startedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    revision: (data.revision || 0) + 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        } catch (error) { setStatus(message(error), 'error'); }
        finally { setBusy(false); }
    }
    async function endOnlineGame() {
        if (!currentRoom || phaseOf(currentRoom) !== 'playing' || !serverFresh || busy) return;
        setBusy(true);
        try {
            const reference = roomRef(currentCode);
            await database.runTransaction(async transaction => {
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists) throw new Error('房間已解散。');
                const data = snapshot.data();
                if (phaseOf(data) !== 'playing' || !data.members.some(member => member.uid === currentUser.uid)) {
                    throw new Error('目前無法結束這場對局。');
                }
                transaction.update(reference, {
                    phase: 'finished', endReason: 'manual',
                    endedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    revision: (data.revision || 0) + 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            closeOthersModal();
            closeCalculatorModal();
        } catch (error) { setStatus(message(error), 'error'); }
        finally { setBusy(false); }
    }
    async function exitOnlineRoom() {
        if (!currentCode || !currentUser || !serverFresh || busy) return;
        const code = currentCode;
        setBusy(true);
        try {
            const reference = roomRef(code);
            await database.runTransaction(async transaction => {
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists) return;
                if (!snapshot.data().members.some(member => member.uid === currentUser.uid)) {
                    throw new Error('你不是這桌的玩家。');
                }
                transaction.delete(reference);
            });
            if (currentCode === code) {
                stopListening();
                currentCode = null;
                currentRoom = null;
                rememberCode(null);
                if (hashCode() === code) history.replaceState(null, '', location.pathname + location.search);
                showLobby();
                setStatus('房間已解散，所有玩家都已離開。');
            }
        } catch (error) { setStatus(message(error), 'error'); }
        finally { setBusy(false); }
    }
    async function acquireWakeLock() {
        if (!wantsWakeLock || document.visibilityState !== 'visible') return;
        if (!navigator.wakeLock?.request) {
            wantsWakeLock = false;
            setStatus('這個瀏覽器無法保持螢幕常亮；牌局仍會自動保存。', 'warning');
            return;
        }
        try {
            const sentinel = await navigator.wakeLock.request('screen');
            if (!wantsWakeLock || document.visibilityState !== 'visible') {
                sentinel.release();
                return;
            }
            wakeSentinel = sentinel;
            wakeButton.textContent = '關閉螢幕常亮';
            wakeButton.setAttribute('aria-pressed', 'true');
            sentinel.addEventListener('release', () => {
                if (wakeSentinel !== sentinel) return;
                wakeSentinel = null;
                if (wantsWakeLock) {
                    wakeButton.textContent = '螢幕常亮暫停';
                    wakeButton.setAttribute('aria-pressed', 'false');
                }
            });
        } catch (_) {
            wantsWakeLock = false;
            setStatus('裝置未允許螢幕常亮；牌局仍會自動保存。', 'warning');
        }
    }
    function releaseWakeLock() {
        wantsWakeLock = false;
        wakeSentinel?.release();
        wakeSentinel = null;
        wakeButton.textContent = '保持螢幕常亮';
        wakeButton.setAttribute('aria-pressed', 'false');
    }
    function refreshFromServer() {
        if (!currentCode || !database || document.visibilityState !== 'visible') return;
        const code = currentCode;
        if (!unsubscribeRoom && !onlinePanel.hidden) listenToRoom(code);
        roomRef(code).get({ source: 'server' }).then(snapshot => {
            if (code !== currentCode) return;
            if (!snapshot.exists) {
                stopListening();
                currentCode = null;
                currentRoom = null;
                rememberCode(null);
                if (hashCode() === code) history.replaceState(null, '', location.pathname + location.search);
                showLobby();
                setStatus('房間已解散。', 'warning');
                return;
            }
            const data = snapshot.data();
            if (!data.members?.some(member => member.uid === currentUser?.uid)) {
                stopListening();
                currentCode = null;
                currentRoom = null;
                rememberCode(null);
                showLobby();
                setStatus('你已不在這桌，請重新加入。', 'warning');
                return;
            }
            if ((data.revision || 0) >= (currentRoom?.revision || 0)) currentRoom = data;
            serverFresh = navigator.onLine;
            connectionLabel.textContent = '已同步';
            connectionLabel.classList.remove('is-offline');
            setStatus('');
            renderSession();
        }).catch(error => {
            if (code !== currentCode) return;
            serverFresh = false;
            connectionLabel.textContent = '等待連線';
            connectionLabel.classList.add('is-offline');
            updateActions();
            setStatus(message(error), 'warning');
        });
    }

    localTab.addEventListener('click', () => setMode(false));
    onlineTab.addEventListener('click', () => setMode(true));
    document.getElementById('online-login-btn').addEventListener('click', async () => {
        try {
            await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
        } catch (error) { setStatus(`Google 登入失敗：${message(error)}`, 'error'); }
    });
    createForm.addEventListener('submit', createRoom);
    joinForm.addEventListener('submit', joinRoom);
    roomCodeInput.addEventListener('input', () => roomCodeInput.value = roomCodeInput.value.toUpperCase());
    document.getElementById('online-resume-btn').addEventListener('click', () => {
        const code = storedCode();
        if (code) openRoom(code);
    });
    document.getElementById('online-limit-enabled').addEventListener('change', event => {
        const enabled = event.target.checked;
        document.getElementById('online-limit-field').hidden = !enabled;
        document.getElementById('online-limit').required = enabled;
    });
    document.getElementById('online-copy-btn').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(joinUrl(currentCode));
            setStatus('邀請連結已複製，可直接傳給朋友。');
        } catch (_) { setStatus('無法複製，請讓朋友掃描 QR Code 或輸入房號。', 'warning'); }
    });
    document.getElementById('online-start-btn').addEventListener('click', startOnlineGame);
    document.getElementById('online-end-btn').addEventListener('click', endOnlineGame);
    ['online-waiting-exit-btn', 'online-game-exit-btn', 'online-finished-exit-btn'].forEach(id => {
        document.getElementById(id).addEventListener('click', exitOnlineRoom);
    });
    document.getElementById('online-hu-btn').addEventListener('click', () => openActionModal('hu'));
    document.getElementById('online-zimo-btn').addEventListener('click', () => openActionModal('zimo'));
    document.getElementById('online-others-btn').addEventListener('click', () => {
        if (!currentRoom || phaseOf(currentRoom) !== 'playing') return;
        othersModal.style.display = 'block';
    });
    document.getElementById('online-calculator-btn').addEventListener('click', openCalculatorModal);
    document.getElementById('online-others-close').addEventListener('click', closeOthersModal);
    document.getElementById('online-calculator-close').addEventListener('click', closeCalculatorModal);
    othersModal.addEventListener('click', event => { if (event.target === othersModal) closeOthersModal(); });
    calculatorModal.addEventListener('click', event => { if (event.target === calculatorModal) closeCalculatorModal(); });
    document.getElementById('online-undo-btn').addEventListener('click', undoRound);
    dealerSelect.addEventListener('change', updateDealer);
    document.getElementById('online-action-close').addEventListener('click', () => closeActionModal());
    actionModal.addEventListener('click', event => { if (event.target === actionModal) closeActionModal(); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && actionModal.style.display === 'block') closeActionModal();
        else if (event.key === 'Escape' && othersModal.style.display === 'block') closeOthersModal();
        else if (event.key === 'Escape' && calculatorModal.style.display === 'block') closeCalculatorModal();
    });
    document.addEventListener('click', event => {
        if (!currentCode) return;
        if (event.target.closest('.site-header nav, .header-actions, .score-mode-switch')) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true);
    wakeButton.addEventListener('click', async () => {
        if (wantsWakeLock) releaseWakeLock();
        else { wantsWakeLock = true; await acquireWakeLock(); }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshFromServer();
            if (wantsWakeLock && !wakeSentinel) acquireWakeLock();
        }
    });
    window.addEventListener('online', refreshFromServer);
    window.addEventListener('pageshow', refreshFromServer);
    window.addEventListener('offline', () => {
        serverFresh = false;
        connectionLabel.textContent = '等待連線';
        updateActions();
        if (currentCode) setStatus('暫時離線，恢復網路後會取得最新點數。', 'warning');
    });
    window.addEventListener('beforeunload', stopListening);

    if (typeof firebase !== 'undefined' && core && firebase.apps.length) {
        database = firebase.firestore();
        firebase.auth().onAuthStateChanged(user => {
            currentUser = user;
            autoRestoreDone = false;
            if (!user) {
                stopListening();
                currentRoom = null;
                currentCode = null;
                setSessionLocked(false);
                closeOthersModal();
                closeCalculatorModal();
                releaseWakeLock();
            } else {
                const defaultName = user.displayName || user.email?.split('@')[0] || '';
                document.getElementById('online-create-name').value ||= defaultName.slice(0, 20);
                document.getElementById('online-join-name').value ||= defaultName.slice(0, 20);
            }
            refreshView();
        });
    }
    if (hashCode()) {
        document.getElementById('nav-counter').click();
        setMode(true);
    }
});
