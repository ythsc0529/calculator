const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyRound, undoLast } = require('./online-score-core');

function room(dealerWind = '東') {
    return {
        ownerUid: 'east', base: 5, taiValue: 2, dealerWind,
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

test('莊家自摸時三家各加付一台', () => {
    const result = applyRound(room(), { id: 'round-1', kind: 'zimo', winnerUid: 'east', tai: 2 });
    assert.deepEqual(result.members.map(player => player.score), [33, -11, -11, -11]);
});

test('閒家自摸時莊家額外支付一台', () => {
    const result = applyRound(room(), { id: 'round-1', kind: 'zimo', winnerUid: 'west', tai: 2 });
    assert.deepEqual(result.members.map(player => player.score), [-11, -9, 29, -9]);
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
