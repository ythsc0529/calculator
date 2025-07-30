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
    
    // --- 初始化函數 ---
    function init() {
        setupNavigation();
        setupCalculator();
        setupChallenge();
        setupCounter();
        setupModals();
        setupSettings();
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
        taishuTableBtn.addEventListener('click', showTaishuTable); // 綁定台數表事件
    }

    // --- 新增：顯示台數表 ---
    function showTaishuTable() {
        closeModal(settingsModal);
        const tableHTML = `
            <div class="modal-text-content">
                <h3>台灣麻將台數表 (南部台)</h3>
                <p style="text-align:center; color:#555;">此台數以南部台為準 (無花台且見字一台)</p>
                
                <h4>1台</h4>
                <ul>
                    <li><strong>莊家：</strong>胡牌玩家為莊家時，加1台。</li>
                    <li><strong>連莊、拉莊：</strong>莊家胡牌或流局即可連莊。每連1次，額外加1台(連莊)，其餘三家也要多付1台(拉莊)，俗稱「連N拉N」。</li>
                    <li><strong>門清：</strong>胡牌時，手牌無任何吃、碰、明槓。</li>
                    <li><strong>不求人：</strong>門清狀態下，胡牌的牌為自摸。通常會與門清、自摸合併計算，稱為「門清一摸三」。</li>
                    <li><strong>自摸：</strong>胡牌的牌由自己摸進，三家皆需支付。</li>
                    <li><strong>搶槓：</strong>聽牌時，胡走別人加槓的牌 (僅限明槓補牌)。</li>
                    <li><strong>見字：</strong>手中有任一「東、南、西、北、中、發、白」的刻子(三張同牌)。每組1台。</li>
                    <li><strong>槓上開花：</strong>因開槓補牌而自摸胡牌。</li>
                    <li><strong>海底撈月：</strong>牌牆最後一張牌自摸胡牌。</li>
                </ul>

                <h4>2台</h4>
                <ul>
                    <li><strong>平胡：</strong>牌型由5組順子及1組對子組成，手牌無字牌，且非自摸、獨聽、單吊胡牌，必須是聽雙面(兩面聽)。</li>
                    <li><strong>全求人：</strong>手牌皆為吃、碰、槓，只剩最後一張牌單吊胡別人。</li>
                    <li><strong>三暗刻：</strong>手中有三組自己摸進的刻子(非碰牌形成)。</li>
                </ul>

                <h4>4台</h4>
                <ul>
                    <li><strong>碰碰胡：</strong>牌型由5組刻子及1組對子組成。</li>
                    <li><strong>小三元：</strong>「中、發、白」三種牌，其中兩種為刻子，一種為對子。</li>
                    <li><strong>湊一色(混一色)：</strong>牌型由字牌及「萬、筒、條」其中一種花色組成。</li>
                </ul>

                <h4>5台</h4>
                <ul>
                    <li><strong>四暗刻：</strong>手中有四組自己摸進的刻子。</li>
                </ul>

                <h4>8台</h4>
                <ul>
                    <li><strong>MIGI (咪幾/立直)：</strong>在開局前8張牌內即聽牌，且過程中無人吃碰槓。需在摸牌後宣告，若無宣告則不計。</li>
                    <li><strong>五暗刻：</strong>手中有五組自己摸進的刻子。</li>
                    <li><strong>大三元：</strong>「中、發、白」三種牌皆為刻子。</li>
                    <li><strong>小四喜：</strong>「東、南、西、北」四種牌，其中三種為刻子，一種為對子。</li>
                    <li><strong>清一色：</strong>整副牌由「萬、筒、條」其中一種花色組成，無字牌。</li>
                    <li><strong>字一色：</strong>整副牌全由字牌組成。可與大小三元、大小四喜的台數疊加計算。</li>
                </ul>

                <h4>16台</h4>
                <ul>
                    <li><strong>天胡：</strong>莊家取完牌後立即胡牌。不另計門清、不求人、自摸、MIGI等台數。</li>
                    <li><strong>大四喜：</strong>「東、南、西、北」四種牌皆為刻子。</li>
                </ul>

                <p class="disclaimer">麻將僅供娛樂，朋友講好就好，嚴禁賭博。</p>
            </div>
        `;
        showModal(mainModal, tableHTML);
    }

    // --- 顯示隱私權政策 ---
    function showPrivacyPolicy() {
        closeModal(settingsModal);
        const policyHTML = `
            <div class="modal-text-content" id="privacy-policy-content">
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
                <p>若您對本隱私權政策有任何疑問，歡迎隨時與我們聯繫 (此處為範本，無實際聯絡方式)。</p>
            </div>
        `;
        showModal(mainModal, policyHTML);
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
        // 清空主要 modal 的內容以防下次開啟時殘留
        if (modal.id === 'modal') {
            mainModalBody.innerHTML = '';
        }
    }
    
    // 以下為其他不變的函式...
    // ... (此處省略與之前版本完全相同的函式以節省篇幅) ...
    // ... (實際貼上時請使用完整檔案) ...
    function setupNavigation(){navButtons.forEach(e=>{e.addEventListener("click",()=>{const t=e.id.replace("nav-","")+"-section";navButtons.forEach(e=>e.classList.remove("active")),e.classList.add("active"),contentSections.forEach(e=>{e.classList.toggle("active",e.id===t)})})})}function createTileImage(e,t="mahjong-tile"){const n=document.createElement("img");return n.src=`images/${e}.svg`,n.alt=e,n.className=t,n.dataset.tile=e,n}function createTileImageHtml(e){return`<img src="images/${e}.svg" alt="${e}" class="mahjong-tile">`}function sortHand(e){return e.slice().sort((e,t)=>ALL_TILES.indexOf(e)-ALL_TILES.indexOf(t))}function setupCalculator(){for(const[e,t]of Object.entries(TILE_TYPES)){const n=document.createElement("div");n.className="tile-category",n.textContent=t,tileSelectionGrid.appendChild(n),TILES[e].forEach(e=>{const t=createTileImage(e);t.addEventListener("click",()=>addTileToHand(e)),tileSelectionGrid.appendChild(t)})}clearHandBtn.addEventListener("click",clearHand),calculateBtn.addEventListener("click",calculateHand)}function addTileToHand(e){userHand.length>=17?alert("手牌最多17張"):userHand.filter(t=>t===e).length>=4?alert(`"${e}" 已經有4張了`):(userHand.push(e),renderUserHand())}function removeTileFromHand(e){const t=sortHand(userHand),n=userHand.indexOf(t[e]);n>-1&&userHand.splice(n,1),renderUserHand()}function renderUserHand(){userHandDisplay.innerHTML="";const e=sortHand(userHand);e.forEach((t,n)=>{const a=createTileImage(t);a.addEventListener("click",()=>removeTileFromHand(n)),userHandDisplay.appendChild(a)})}function clearHand(){userHand=[],renderUserHand(),calculatorResultArea.innerHTML="",calculatorResultArea.style.display="none"}function calculateHand(){calculatorResultArea.innerHTML="",calculatorResultArea.style.display="block";const e=userHand.length;if(0===e)return void(calculatorResultArea.innerHTML="<h3>請先輸入您的手牌</h3>");if(e%3!=1&&e%3!=2)return void(calculatorResultArea.innerHTML="<h3>牌數錯誤，非聽牌或胡牌的牌數，已相公</h3>");const t=getHandCounts(userHand);if(e%3==2&&isWinningHand(t))return void(calculatorResultArea.innerHTML="<h3>恭喜，您已胡牌！</h3>");let n=findDiscardToTing(userHand);if(n.length>0){let e="<h3>打聽建議：</h3>";return n.forEach(t=>{e+=`<div class="result-group">打 <div class="tile-group">${createTileImageHtml(t.discard)}</div> 聽 <div class="tile-group">${t.ting.map(createTileImageHtml).join("")}</div></div>`}),void(calculatorResultArea.innerHTML=e)}let a=findTing(userHand);if(a.length>0){let e="<h3>已聽牌，聽：</h3>";return e+=`<div class="result-group"><div class="tile-group">${a.map(createTileImageHtml).join("")}</div></div>`,void(calculatorResultArea.innerHTML=e)}calculatorResultArea.innerHTML="<h3>還未聽牌</h3>"}function getHandCounts(e){const t={};return ALL_TILES.forEach(e=>t[e]=0),e.forEach(e=>t[e]++),t}function isWinningHand(e,t=0){if(Object.values(e).every(e=>0===e))return!0;if(0===t){for(const n of ALL_TILES)if(e[n]>=2&&(e[n]-=2,isWinningHand(e,t+1)))return e[n]+=2,!0;return e[n]+=2,!1}const n=ALL_TILES.find(t=>e[t]>0);if(!n)return!0;if(e[n]>=3&&(e[n]-=3,isWinningHand(e,t+1)))return e[n]+=3,!0;e[n]+=3;const a=n.slice(-1);if(["萬","筒","條"].includes(a)){const o=parseInt(n);if(o<=7){const i=`${o+1}${a}`,l=`${o+2}${a}`;if(e[i]>0&&e[l]>0)return e[n]--,e[i]--,e[l]--,isWinningHand(e,t+1)?(e[n]++,e[i]++,e[l]++,!0):(e[n]++,e[i]++,e[l]++,!1)}}return!1}function findTing(e){const t=new Set,n=getHandCounts(e);for(const a of ALL_TILES)if(n[a]<4){const o=[...e,a];isWinningHand(getHandCounts(o))&&t.add(a)}return sortHand(Array.from(t))}function findDiscardToTing(e){const t=[],n=Array.from(new Set(e));for(const a of n){const n=[...e];n.splice(n.indexOf(a),1);const o=findTing(n);o.length>0&&t.push({discard:a,ting:o})}return t}function setupChallenge(){challengeTingBtn.addEventListener("click",()=>startChallenge("ting")),challengeDaTingBtn.addEventListener("click",()=>startChallenge("da-ting")),nextChallengeBtn.addEventListener("click",()=>startChallenge(challengeState.mode))}function startChallenge(e){challengeTingBtn.classList.toggle("active","ting"===e),challengeDaTingBtn.classList.toggle("active","da-ting"===e),challengeFeedback.innerHTML="",challengeAnswerArea.innerHTML="",nextChallengeBtn.style.display="none",challengeState.mode=e;const t=["m","p","s"][Math.floor(3*Math.random())],n=TILE_TYPES[t],a=TILES[t],o="ting"===e?13:14,i=generateChallengeHand(a,o);if(challengeState.hand=i,"ting"===e?(challengeQuestion.textContent=`[練習聽牌] 這副 ${n} 牌聽什麼？`,challengeState.correctAnswer=findTing(i)):(challengeQuestion.textContent=`[練習打聽] 這副 ${n} 牌該打哪張，聽什麼？`,challengeState.correctAnswer=findDiscardToTing(i)),0===challengeState.correctAnswer.length)return void startChallenge(e);challengeHandDisplay.innerHTML="",sortHand(i).forEach(e=>{challengeHandDisplay.appendChild(createTileImage(e))}),challengeAnswerArea.innerHTML="<h4>請點選答案 (可複選)</h4>";const l=document.createElement("div");l.className="tile-group",a.forEach(e=>{const t=createTileImage(e);t.addEventListener("click",()=>t.classList.toggle("selected")),l.appendChild(t)}),challengeAnswerArea.appendChild(l);const c=document.createElement("button");c.textContent="確定答案",c.onclick=checkChallengeAnswer,challengeAnswerArea.appendChild(c)}function generateChallengeHand(e,t){let n=[],a=[];e.forEach(e=>n.push(e,e,e,e));for(;a.length<t&&n.length>0;){let e=Math.floor(Math.random()*n.length);a.push(n.splice(e,1)[0])}return a}function checkChallengeAnswer(){const e=Array.from(document.querySelectorAll("#challenge-answer-area .mahjong-tile.selected")).map(e=>e.dataset.tile);let t=!1;if("ting"===challengeState.mode)t=e.length===challengeState.correctAnswer.length&&e.every(e=>challengeState.correctAnswer.includes(e));else{const n=e[0];t=1===e.length&&challengeState.correctAnswer.some(e=>e.discard===n)}challengeFeedback.style.display="block",challengeFeedback.innerHTML=t?'<h3 style="color: green;">答對了！</h3>':'<h3 style="color: red;">答錯了！</h3>';let n="<h4>正確答案：</h4>";"ting"===challengeState.mode?n+=`<div class="tile-group">${challengeState.correctAnswer.map(createTileImageHtml).join("")}</div>`:challengeState.correctAnswer.forEach(e=>{n+=`<div class="result-group">打 <div class="tile-group">${createTileImageHtml(e.discard)}</div> 聽 <div class="tile-group">${e.ting.map(createTileImageHtml).join("")}</div></div>`}),challengeFeedback.innerHTML+=n,nextChallengeBtn.style.display="inline-block",challengeAnswerArea.querySelector("button").disabled=!0}function setupCounter(){startGameBtn.addEventListener("click",startGame),zimoBtn.addEventListener("click",handleZimo),huBtn.addEventListener("click",handleHu),settleBtn.addEventListener("click",handleSettle)}function getRandomEmoji(){return EMOJIS[Math.floor(Math.random()*EMOJIS.length)]}function startGame(){const e=document.getElementById("player1-name").value||"東家",t=document.getElementById("player2-name").value||"南家",n=document.getElementById("player3-name").value||"西家",a=document.getElementById("player4-name").value||"北家";players=[{id:1,name:e,score:0,emoji:getRandomEmoji()},{id:2,name:t,score:0,emoji:getRandomEmoji()},{id:3,name:n,score:0,emoji:getRandomEmoji()},{id:4,name:a,score:0,emoji:getRandomEmoji()}];const o=document.getElementById("stake-select").value.split("/");stake.base=parseInt(o[0]),stake.台=parseInt(o[1]),counterSetup.style.display="none",counterMain.style.display="block",updateScoreboard()}function updateScoreboard(){players.forEach(e=>{const t=document.getElementById(`player-display-${e.id}`);t.innerHTML=`<div class="emoji">${e.emoji}</div><h4>${e.name}</h4><div class="score ${e.score>=0?"positive":"negative"}">${e.score}</div>`})}function handleZimo(){let e='<h3>自摸</h3><p>誰自摸？</p><div class="modal-options">';players.forEach(t=>{e+=`<label><input type="radio" name="winner" value="${t.id}">${t.name}</label>`}),e+='</div><p>誰是莊家？</p><div class="modal-options">',players.forEach(t=>{e+=`<label><input type="radio" name="dealer" value="${t.id}">${t.name}</label>`}),e+='</div><p>幾台？</p><input type="number" id="tai-input" min="0" value="0" style="width: 100%; padding: 8px;"><button id="confirm-zimo-btn">確定</button>',showModal(mainModal,e),document.getElementById("confirm-zimo-btn").addEventListener("click",()=>{const e=parseInt(document.querySelector('input[name="winner"]:checked')?.value),t=parseInt(document.querySelector('input[name="dealer"]:checked')?.value),n=parseInt(document.getElementById("tai-input").value)||0;if(!e||!t)return void alert("請選擇自摸者和莊家");let a=n;e===t&&a++;let o=0;players.forEach(n=>{if(n.id!==e){let i=stake.base+a*stake.台;n.id===t&&(i+=stake.台),n.score-=i,o+=i}}),players.find(t=>t.id===e).score+=o,updateScoreboard(),closeModal(mainModal)})}function handleHu(){let e='<h3>胡牌</h3><p>誰胡牌？</p><div class="modal-options">';players.forEach(t=>{e+=`<label><input type="radio" name="winner" value="${t.id}">${t.name}</label>`}),e+='</div><p>誰放槍？</p><div class="modal-options">',players.forEach(t=>{e+=`<label><input type="radio" name="loser" value="${t.id}">${t.name}</label>`}),e+='</div><p>幾台？</p><input type="number" id="tai-input" min="0" value="0" style="width: 100%; padding: 8px;"><button id="confirm-hu-btn">確定</button>',showModal(mainModal,e),document.getElementById("confirm-hu-btn").addEventListener("click",()=>{const e=parseInt(document.querySelector('input[name="winner"]:checked')?.value),t=parseInt(document.querySelector('input[name="loser"]:checked')?.value),n=parseInt(document.getElementById("tai-input").value)||0;if(!e||!t||e===t)return void alert("請正確選擇胡牌者和放槍者");const a=stake.base+n*stake.台;players.find(t=>t.id===e).score+=a,players.find(e=>e.id===t).score-=a,updateScoreboard(),closeModal(mainModal)})}function handleSettle(){let e="<h3>結算</h3><h4>最終分數</h4>";const t=[...players].sort((e,t)=>t.score-e.score);t.forEach(t=>{e+=`<p>${t.name}: ${t.score}</p>`}),e+='<p style="margin-top: 1rem; font-size: 0.9em; color: #666;">注意：此為各玩家總得分。</p><button id="reset-game-btn" style="margin-top: 1rem;">回到設定</button>',showModal(mainModal,e),document.getElementById("reset-game-btn").addEventListener("click",()=>{counterMain.style.display="none",counterSetup.style.display="block",closeModal(mainModal)})}
    
    init();
});