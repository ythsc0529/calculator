(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.OnlineScoreCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const WINDS = ['東', '南', '西', '北'];
    const MAX_ROUNDS = 500;

    function assertRoom(room) {
        if (!room || !Array.isArray(room.members) || !Array.isArray(room.history)) {
            throw new Error('牌局資料無效，請重新進入房間。');
        }
        if (!Number.isInteger(room.base) || !Number.isInteger(room.taiValue) || room.base < 0 || room.taiValue < 0) {
            throw new Error('牌局計分設定無效。');
        }
        if (room.scoreLimit != null && (!Number.isSafeInteger(room.scoreLimit) || room.scoreLimit <= 0)) {
            throw new Error('牌局輸分上限無效。');
        }
        if (new Set(room.members.map(member => member.uid)).size !== room.members.length
            || new Set(room.members.map(member => member.wind)).size !== room.members.length
            || room.members.some(member => !member.uid || !WINDS.includes(member.wind) || !Number.isFinite(member.score))) {
            throw new Error('牌局玩家資料無效，請重新進入房間。');
        }
    }

    function applyRound(room, action) {
        assertRoom(room);
        if (room.phase && room.phase !== 'playing') throw new Error('目前不是進行中的牌局。');
        if (room.members.length !== 4) throw new Error('四位玩家到齊後才能開始計分。');
        if (room.history.length >= MAX_ROUNDS) throw new Error('這桌的紀錄已滿，請另開新桌。');
        if (!['hu', 'zimo'].includes(action.kind)) throw new Error('計分類型無效。');
        const tai = Number(action.tai);
        if (!Number.isInteger(tai) || tai < 0 || tai > 99) throw new Error('台數請輸入 0 到 99。');
        const winnerIndex = room.members.findIndex(member => member.uid === action.winnerUid);
        if (winnerIndex < 0) throw new Error('你不是這桌的玩家。');
        const winner = room.members[winnerIndex];
        const loserIndex = action.kind === 'hu'
            ? room.members.findIndex(member => member.uid === action.loserUid)
            : -1;
        if (action.kind === 'hu' && (loserIndex < 0 || loserIndex === winnerIndex)) {
            throw new Error('請選擇其他三位玩家中的放槍者。');
        }
        const beforeScores = room.members.map(member => member.score);
        const deltas = [0, 0, 0, 0];
        if (action.kind === 'hu') {
            const payment = room.base + tai * room.taiValue;
            deltas[winnerIndex] += payment;
            deltas[loserIndex] -= payment;
        } else {
            room.members.forEach((member, index) => {
                if (index === winnerIndex) return;
                const payment = room.base + tai * room.taiValue;
                deltas[index] -= payment;
                deltas[winnerIndex] += payment;
            });
        }
        const members = room.members.map((member, index) => ({
            ...member,
            score: beforeScores[index] + deltas[index]
        }));
        const history = room.history.concat({
            id: action.id,
            sequence: room.history.length + 1,
            kind: action.kind,
            winnerUid: winner.uid,
            winnerName: winner.name,
            loserUid: loserIndex < 0 ? null : room.members[loserIndex].uid,
            loserName: loserIndex < 0 ? null : room.members[loserIndex].name,
            tai,
            beforeScores,
            deltas,
            at: action.at || Date.now()
        });
        return { members, history, reachedLimit: limitReached({ ...room, members }) };
    }

    function limitReached(room) {
        return Number.isInteger(room.scoreLimit) && room.scoreLimit > 0
            && room.members.some(member => member.score <= -room.scoreLimit);
    }

    function settle(room) {
        assertRoom(room);
        const debtors = room.members.filter(member => member.score < 0)
            .map(member => ({ name: `${member.wind}位 ${member.name}`, remaining: -member.score }));
        const creditors = room.members.filter(member => member.score > 0)
            .map(member => ({ name: `${member.wind}位 ${member.name}`, remaining: member.score }));
        const payments = [];
        let debtorIndex = 0;
        let creditorIndex = 0;
        while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
            const debtor = debtors[debtorIndex];
            const creditor = creditors[creditorIndex];
            const amount = Math.min(debtor.remaining, creditor.remaining);
            payments.push({ from: debtor.name, to: creditor.name, amount });
            debtor.remaining -= amount;
            creditor.remaining -= amount;
            if (debtor.remaining === 0) debtorIndex++;
            if (creditor.remaining === 0) creditorIndex++;
        }
        return payments;
    }

    function undoLast(room, actorUid) {
        assertRoom(room);
        if (room.ownerUid !== actorUid) throw new Error('只有房主可以復原上一局。');
        if (!room.history.length) throw new Error('目前沒有可復原的紀錄。');
        const history = room.history.slice(0, -1);
        const last = room.history[room.history.length - 1];
        if (!Array.isArray(last.beforeScores) || last.beforeScores.length !== room.members.length
            || last.beforeScores.some(score => !Number.isFinite(score))) {
            throw new Error('無法復原這局，請檢查牌局紀錄。');
        }
        const members = room.members.map((member, index) => ({
            ...member,
            score: last.beforeScores[index]
        }));
        return { members, history };
    }

    return { WINDS, MAX_ROUNDS, applyRound, undoLast, limitReached, settle };
});
