const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyRound, undoLast, settle } = require('./online-score-core');

function room() {
    return {
        ownerUid: 'east', base: 5, taiValue: 2, dealerWind: '東',
        members: [
            { uid: 'east', wind: '東', name: '東', score: 0 },
            { uid: 'south', wind: '南', name: '南', score: 0 },
            { uid: 'west', wind: '西', name: '西', score: 0 },
            { uid: 'north', wind: '北', name: '北', score: 0 }
        ],
        history: []
    };
}

test('胡牌只由放槍者支付，點數總和維持零', () => {
    const initial = room();
    const result = applyRound(initial, {
        id: 'round-1', kind: 'hu', winnerUid: 'west', loserUid: 'south', tai: 3
    });
    assert.deepEqual(result.members.map(player => player.score), [0, -11, 11, 0]);
    assert.equal(result.members.reduce((total, player) => total + player.score, 0), 0);
    assert.deepEqual(initial.members.map(player => player.score), [0, 0, 0, 0]);
});

test('自摸由另外三家平均支付，不計莊家加成', () => {
    const result = applyRound(room(), { id: 'round-1', kind: 'zimo', winnerUid: 'east', tai: 2 });
    assert.deepEqual(result.members.map(player => player.score), [27, -9, -9, -9]);
});

test('任何座位自摸都使用同一種算法', () => {
    const result = applyRound(room(), { id: 'round-1', kind: 'zimo', winnerUid: 'west', tai: 2 });
    assert.deepEqual(result.members.map(player => player.score), [-9, -9, 27, -9]);
    const withoutDealer = room();
    delete withoutDealer.dealerWind;
    const sameResult = applyRound(withoutDealer, { id: 'round-1', kind: 'zimo', winnerUid: 'west', tai: 2 });
    assert.deepEqual(sameResult.members.map(player => player.score), result.members.map(player => player.score));
});

test('房主可以復原最後一局，其餘玩家不可', () => {
    const initial = room();
    const afterOne = applyRound(initial, {
        id: 'round-1', kind: 'hu', winnerUid: 'west', loserUid: 'south', tai: 3
    });
    const afterTwo = applyRound({ ...initial, ...afterOne }, {
        id: 'round-2', kind: 'zimo', winnerUid: 'east', tai: 1
    });
    assert.throws(() => undoLast({ ...initial, ...afterTwo }, 'south'), /房主/);
    const restored = undoLast({ ...initial, ...afterTwo }, 'east');
    assert.deepEqual(restored.members.map(player => player.score), afterOne.members.map(player => player.score));
    assert.equal(restored.history.length, 1);
});

test('未滿四人、選自己放槍、無效台數會拒絕計分', () => {
    const initial = room();
    assert.throws(() => applyRound({ ...initial, members: initial.members.slice(0, 3) }, {
        kind: 'zimo', winnerUid: 'east', tai: 1
    }), /四位玩家/);
    assert.throws(() => applyRound(initial, {
        kind: 'hu', winnerUid: 'east', loserUid: 'east', tai: 1
    }), /放槍者/);
    assert.throws(() => applyRound(initial, {
        kind: 'zimo', winnerUid: 'east', tai: -1
    }), /台數/);
});

test('任何玩家輸到設定上限時，該局結束後觸發結算', () => {
    const initial = { ...room(), phase: 'playing', scoreLimit: 10 };
    const result = applyRound(initial, {
        id: 'round-1', kind: 'hu', winnerUid: 'west', loserUid: 'south', tai: 3
    });
    assert.equal(result.reachedLimit, true);
    assert.deepEqual(settle({ ...initial, members: result.members }), [
        { from: '南位 南', to: '西位 西', amount: 11 }
    ]);
});

test('未達上限時繼續，且多家輸贏可拆分結算', () => {
    const initial = { ...room(), phase: 'playing', scoreLimit: 100 };
    const result = applyRound(initial, {
        id: 'round-1', kind: 'zimo', winnerUid: 'west', tai: 2
    });
    assert.equal(result.reachedLimit, false);
    assert.deepEqual(settle({ ...initial, members: result.members }), [
        { from: '東位 東', to: '西位 西', amount: 9 },
        { from: '南位 南', to: '西位 西', amount: 9 },
        { from: '北位 北', to: '西位 西', amount: 9 }
    ]);
});

test('結束後不能再計分，結算可分給兩位贏家', () => {
    const finished = room();
    finished.phase = 'finished';
    assert.throws(() => applyRound(finished, {
        id: 'late', kind: 'hu', winnerUid: 'south', loserUid: 'east', tai: 1
    }), /不是進行中/);
    finished.members[0].score = -15;
    finished.members[1].score = 10;
    finished.members[2].score = 5;
    assert.deepEqual(settle(finished), [
        { from: '東位 東', to: '南位 南', amount: 10 },
        { from: '東位 東', to: '西位 西', amount: 5 }
    ]);
});
