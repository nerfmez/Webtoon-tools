// Tunnel Crew Online v0.4 — card-table UX + shared action FX
import {
  cardByDefId, createLobby, startGameFromLobby, startNextRound, prepareRewards,
  previewPath, clearPreview, placePath, discardCard, playToolAction, playMap, playRockfall,
  chooseGoldReward, rewardDone, makePublicView, validatePathPlacement, rotatedDef, DIRS, DELTA,
  getPlayer
} from './engine.mjs';
import {makeBot, chooseBotTurn} from './bot.mjs';

const app = document.querySelector('#app');
const toastEl = document.querySelector('#toast');
let toastTimer = null;
let PeerCtor = null;
let peer = null;
let hostConn = null;
let conns = new Map();
let hostState = null;
let goldDeck = [];
let hostId = null;
let myId = null;
let resumeToken = null;
let roomCode = '';
let isHost = false;
let view = null;
let pendingPeek = null;
let roleSeenRound = 0;
let selectedCardUid = null;
let selectedRotation = 0;
let boardTransform = {x: 0, y: 0, scale: 1};
let currentScreen = 'home';
let hostPersistKey = null;
let botTimer = null;
let lastSeenEventId = 0;
let fxQueue = [];
let fxPlaying = false;
let suppressCardClickUntil = 0;
const CELL_W = 90, CELL_H = 64, WORLD_W=1200, WORLD_H=1200, ORIGIN_X=600, ORIGIN_Y=980;
const DISPLAY_DIR = {N:'W', E:'N', S:'E', W:'S'};

const EMOJI = {pick:'⛏️',lamp:'🏮',cart:'🛒'};
const ACTION_ICON = {
  break_pick:'💥⛏️', break_lamp:'💥🏮', break_cart:'💥🛒',
  fix_pick:'🧰⛏️', fix_lamp:'🧰🏮', fix_cart:'🧰🛒',
  fix_pick_lamp:'🧰', fix_pick_cart:'🧰', fix_lamp_cart:'🧰',
  map:'🗺️', rockfall:'🪨'
};

function escapeHtml(s='') { return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function uid(prefix='p'){return `${prefix}_${crypto.getRandomValues(new Uint32Array(2)).join('')}`;}
function randomCode(){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const a=crypto.getRandomValues(new Uint32Array(6)); return [...a].map(n=>chars[n%chars.length]).join(''); }
function showToast(msg, ms=2200){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),ms); }
function sessionKey(code){return `tunnelcrew-session-${code}`;}
function saveSession(){ if(!roomCode||!myId||!resumeToken) return; localStorage.setItem(sessionKey(roomCode),JSON.stringify({roomCode,myId,resumeToken,isHost})); localStorage.setItem('tunnelcrew-last-room',roomCode); }
function persistHost(){ if(!isHost||!hostState||!hostPersistKey) return; try { localStorage.setItem(hostPersistKey,JSON.stringify({hostState,goldDeck,hostId,roomCode,resumeToken,myId})); } catch {} }
function loadHostSnapshot(code){ try { return JSON.parse(localStorage.getItem(`tunnelcrew-host-${code}`)||'null'); } catch { return null; } }
async function loadPeer(){ if(PeerCtor) return PeerCtor; try{ const mod=await import('https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm'); PeerCtor=mod.Peer; return PeerCtor; }catch(e){ console.error(e); throw new Error('โหลดระบบเชื่อมต่อ P2P ไม่สำเร็จ'); } }
function destroyNetwork(){ clearTimeout(botTimer); botTimer=null; try{hostConn?.close()}catch{}; hostConn=null; for(const c of conns.values()) try{c.close()}catch{}; conns.clear(); try{peer?.destroy()}catch{}; peer=null; }
function home(){ currentScreen='home'; selectedCardUid=null; view=null; lastSeenEventId=0; fxQueue=[]; fxPlaying=false; const last=localStorage.getItem('tunnelcrew-last-room'); const snap=last?loadHostSnapshot(last):null; app.innerHTML=`<main class="shell home-shell"><div class="brand"><div class="brand-mark">⛏️</div><div><h1>Tunnel Crew Online</h1><p>เกมการ์ดขุดเหมืองออนไลน์ hidden-role สำหรับเล่นกับเพื่อน</p></div></div><section class="hero mine-hero"><div class="hero-lantern">🏮</div><h2>สร้างอุโมงค์ไปหาทอง<br>หรือแอบทำให้มันพัง</h2><p>ยึดกติกาพื้นฐาน Saboteur พร้อม Shared Preview — ไพ่ทางเดินทุกใบจะถูกทาบให้ทั้งโต๊ะเห็นก่อนเจ้าของเทิร์นยืนยัน</p></section><div class="home-grid"><section class="panel"><h3>⛏️ สร้างโต๊ะ</h3><div class="field"><label>ชื่อของคุณ</label><input id="createName" maxlength="18" autocomplete="nickname" placeholder="เช่น BALL"></div><button class="btn primary wide" id="createBtn">สร้างห้องใหม่</button>${snap?`<button class="btn ghost wide" id="resumeHostBtn">เปิดห้อง ${escapeHtml(last)} ต่อ</button>`:''}</section><section class="panel"><h3>🚪 เข้าร่วมโต๊ะเพื่อน</h3><div class="field"><label>รหัสห้อง</label><input id="joinCode" class="room" maxlength="6" autocomplete="off" placeholder="ABC123"></div><div class="field"><label>ชื่อของคุณ</label><input id="joinName" maxlength="18" autocomplete="nickname" placeholder="ชื่อเล่น"></div><button class="btn primary wide" id="joinBtn">เข้าห้อง</button></section></div><p class="note"><span class="status-dot ok"></span>โฮสต์เป็นเครื่องของเจ้าของห้องใน V1 และต้องเปิดเกมไว้ระหว่างเล่น</p></main>`; document.querySelector('#createBtn').addEventListener('click',()=>createRoom(false)); document.querySelector('#joinBtn').addEventListener('click',joinRoom); document.querySelector('#resumeHostBtn')?.addEventListener('click',()=>resumeHost(last)); }
function validProfile(name){ name=(name||'').trim(); if(name.length<1) return {ok:false,msg:'ใส่ชื่อของคุณ'}; return {ok:true,name}; }
async function createRoom(){ const v=validProfile(document.querySelector('#createName').value); if(!v.ok){showToast(v.msg);return} roomCode=randomCode(); isHost=true; hostId=uid('p'); myId=hostId; resumeToken=uid('r'); hostPersistKey=`tunnelcrew-host-${roomCode}`; hostState=createLobby({id:hostId,name:v.name,resumeToken,score:0}); goldDeck=[]; saveSession(); persistHost(); renderConnecting('กำลังเปิดห้อง…'); try{ const Peer=await loadPeer(); peer=new Peer(`tunnelcrew-${roomCode}`); peer.on('open',()=>{ setupHostPeer(); broadcastViews(); }); peer.on('connection',setupIncomingConnection); peer.on('error',err=>{ console.error(err); if(err.type==='unavailable-id') { showToast('รหัสห้องชนกับห้องอื่น ลองสร้างใหม่อีกครั้ง'); destroyNetwork(); setTimeout(home,700); } else showToast(`เชื่อมต่อไม่สำเร็จ: ${err.type||err.message}`); }); }catch(e){showToast(e.message);home()} }
function resumeHost(code){ const snap=loadHostSnapshot(code); if(!snap){showToast('ไม่พบข้อมูลห้องเดิม');return} destroyNetwork(); ({hostState,goldDeck,hostId,roomCode,resumeToken,myId}=snap); isHost=true; hostPersistKey=`tunnelcrew-host-${roomCode}`; renderConnecting('กำลังเปิดห้องเดิม…'); loadPeer().then(Peer=>{peer=new Peer(`tunnelcrew-${roomCode}`);peer.on('open',()=>{setupHostPeer();broadcastViews()});peer.on('connection',setupIncomingConnection);peer.on('error',e=>showToast(e.type||e.message))}).catch(e=>{showToast(e.message);home()}); }
function joinRoom(){ const code=(document.querySelector('#joinCode').value||'').trim().toUpperCase(); const v=validProfile(document.querySelector('#joinName').value); if(code.length!==6){showToast('รหัสห้องต้องมี 6 ตัว');return} if(!v.ok){showToast(v.msg);return} destroyNetwork(); roomCode=code; isHost=false; const old=JSON.parse(localStorage.getItem(sessionKey(code))||'null'); myId=old?.myId||uid('p'); resumeToken=old?.resumeToken||uid('r'); saveSession(); renderConnecting('กำลังเข้าห้อง…'); loadPeer().then(Peer=>{peer=new Peer();peer.on('open',()=>{hostConn=peer.connect(`tunnelcrew-${code}`,{reliable:true});hostConn.on('open',()=>hostConn.send({type:'join',player:{id:myId,name:v.name,resumeToken}}));hostConn.on('data',onClientData);hostConn.on('close',()=>showToast('การเชื่อมต่อกับ Host หลุด'));});peer.on('error',e=>{console.error(e);showToast(`เชื่อมต่อไม่สำเร็จ: ${e.type||e.message}`)})}).catch(e=>{showToast(e.message);home()}); }
function renderConnecting(msg){currentScreen='connecting';app.innerHTML=`<main class="center-screen"><div class="loader"></div><h2>${escapeHtml(msg)}</h2><p>รหัสห้อง: <strong>${escapeHtml(roomCode)}</strong></p><button class="btn ghost" id="cancelConnect">ยกเลิก</button></main>`;document.querySelector('#cancelConnect').onclick=()=>{destroyNetwork();home()};}
function setupHostPeer(){ }
function setupIncomingConnection(c){conns.set(c.peer,c);c.on('data',m=>onHostData(c,m));c.on('close',()=>{conns.delete(c.peer);const p=hostState?.players.find(p=>p.connPeer===c.peer);if(p){p.online=false;broadcastViews()}});}
function onHostData(c,msg){ if(!msg||typeof msg!=='object')return; if(msg.type==='join'){ let p=hostState.players.find(p=>p.resumeToken===msg.player.resumeToken); if(p){p.id=msg.player.id;p.name=msg.player.name;p.online=true;p.connPeer=c.peer;}else{ if(hostState.players.length>=10){c.send({type:'error',message:'ห้องเต็ม'});return} p={...msg.player,online:true,isBot:false,broken:{pick:false,lamp:false,cart:false},hand:[],score:0,connPeer:c.peer}; hostState.players.push(p);} c.playerId=p.id; broadcastViews(); return;} if(c.playerId) handleAction(c.playerId,msg); }
function onClientData(m){ if(m?.type==='view'){view=m.view;processEvents();renderByPhase();}else if(m?.type==='peek')pendingPeek=m.goalType;else if(m?.type==='error')showToast(m.message||'เกิดข้อผิดพลาด'); }
function sendAction(action){ if(isHost) handleAction(myId,action); else if(hostConn?.open) hostConn.send(action); }
function broadcastViews(){ if(!isHost)return; view=makePublicView(hostState,myId,{roomCode,hostId}); renderByPhase(); for(const c of conns.values())if(c.open&&c.playerId)c.send({type:'view',view:makePublicView(hostState,c.playerId,{roomCode,hostId})}); persistHost(); scheduleBot(); }
function renderByPhase(){ if(!view)return; if(view.phase==='lobby')renderLobby();else renderGame(); }
function scheduleBot(){clearTimeout(botTimer);botTimer=null;if(!isHost||!hostState)return;const p=getPlayer(hostState,hostState.currentPlayerId);if(!p?.isBot||hostState.phase!=='playing')return;botTimer=setTimeout(()=>{const act=chooseBotTurn(hostState,p.id);if(!act)return;handleAction(p.id,act);},450);}
function renderLobby(){ currentScreen='lobby'; app.innerHTML=`<main class="shell lobby-shell"><header class="topline"><div><div class="eyebrow">ห้อง</div><div class="room-code">${escapeHtml(roomCode)}</div></div><button class="btn ghost" id="leaveBtn">ออก</button></header><section class="panel"><div class="section-title"><h3>ผู้เล่น</h3><span>${view.players.length}/10</span></div><div class="player-list" id="playerList">${view.players.map(renderLobbyPlayer).join('')}</div>${isHost?`<div class="actions bot-actions"><button class="btn small" id="addBotBtn" ${view.players.length>=10?'disabled':''}>＋ เพิ่มบอท</button><button class="btn small ghost" id="removeBotBtn" ${view.players.some(p=>p.isBot)?'':'disabled'}>− ลบบอท</button><button class="btn small ghost" id="fillBotsBtn" ${view.players.length>=5?'disabled':''}>🤖 เติมถึง 5 คน</button></div>`:''}</section><section class="panel"><h3>ผู้เล่นอายุน้อยที่สุด</h3><p class="small-note">ใช้เลือกผู้เริ่มรอบแรกตามกติกาพื้นฐาน</p><div class="youngest-list">${view.players.map(p=>`<button class="youngest ${p.id===view.firstPlayerId?'selected':''}" data-youngest="${p.id}" ${!isHost?'disabled':''}>${escapeHtml(p.name)}</button>`).join('')}</div>${isHost?`<button class="btn primary wide" id="startBtn" ${view.players.length<3?'disabled':''}>เริ่มเกม</button>`:''}</section></main>`; document.querySelector('#leaveBtn').onclick=()=>{destroyNetwork();home()}; if(isHost){document.querySelector('#addBotBtn')?.addEventListener('click',()=>hostAddBot(1));document.querySelector('#removeBotBtn')?.addEventListener('click',hostRemoveBot);document.querySelector('#fillBotsBtn')?.addEventListener('click',()=>hostAddBot(Math.max(0,5-hostState.players.length)));document.querySelectorAll('[data-youngest]').forEach(b=>b.onclick=()=>{hostState.firstPlayerId=b.dataset.youngest;broadcastViews()});document.querySelector('#startBtn')?.addEventListener('click',hostStartGame);} }
function renderLobbyPlayer(p){return `<div class="lobby-player ${p.id===myId?'me':''}"><span>${p.isBot?'🤖':'👤'}</span><strong>${escapeHtml(p.name)}</strong><small>${p.id===hostId?'Host':''}${p.id===myId?' · คุณ':''}</small></div>`;}
function hostAddBot(count=1){if(!isHost||hostState?.phase!=='lobby')return;const requested=Math.max(0,Math.floor(Number(count)||0));for(let i=0;i<requested&&hostState.players.length<10;i++){const botIndex=hostState.players.filter(p=>p.isBot).length;hostState.players.push(makeBot(`bot_${uid('b')}`,`Bot ${botIndex+1}`));}persistHost();broadcastViews();}
function hostRemoveBot(){if(!isHost||hostState?.phase!=='lobby')return;const i=hostState.players.map(p=>p.isBot).lastIndexOf(true);if(i>=0){hostState.players.splice(i,1);persistHost();broadcastViews();}}
function hostStartGame(){if(!isHost)return;hostState=startGameFromLobby(hostState);broadcastViews();}
function handleAction(playerId,a){if(!isHost||!hostState)return;try{if(a.type==='previewPath')hostState=previewPath(hostState,playerId,a.cardUid,a.x,a.y,a.rotation||0);else if(a.type==='clearPreview')hostState=clearPreview(hostState,playerId);else if(a.type==='placePath')hostState=placePath(hostState,playerId);else if(a.type==='discard')hostState=discardCard(hostState,playerId,a.cardUid);else if(a.type==='tool')hostState=playToolAction(hostState,playerId,a.cardUid,a.targetId);else if(a.type==='map'){const r=playMap(hostState,playerId,a.cardUid,a.goalUid);hostState=r.state;const c=[...conns.values()].find(c=>c.playerId===playerId);if(playerId===myId)pendingPeek=r.goalType;else c?.send({type:'peek',goalType:r.goalType});}else if(a.type==='rockfall')hostState=playRockfall(hostState,playerId,a.cardUid,a.targetUid);else if(a.type==='chooseGold')hostState=chooseGoldReward(hostState,playerId,a.goldUid);else if(a.type==='continue'){if(hostState.round>=3)hostState={...hostState,phase:'gameOver'};else hostState=startNextRound(hostState);} broadcastViews();}catch(e){console.warn(e);if(playerId===myId)showToast(e.message||'ทำรายการไม่ได้');}}
function renderGame(){currentScreen='game'; const me=view.me; app.innerHTML=`<main class="game-shell"><header class="game-top"><div class="round-chip">รอบ ${view.round}/3</div><div class="role-chip">${me?.role==='saboteur'?'🧨 Saboteur':'⛏️ Gold Miner'}</div><div class="turn-chip">${view.currentPlayerId===myId?'เทิร์นคุณ':`เทิร์น ${escapeHtml(view.players.find(p=>p.id===view.currentPlayerId)?.name||'-')}`}</div></header><section class="table"><div class="players-rail">${view.players.map(renderPlayerChip).join('')}</div><div class="board-viewport"><div class="board" id="board"></div></div><div class="piles"><div class="pile">กองจั่ว<br><b>${view.deckCount}</b></div><div class="pile">กองทิ้ง<br><b>${view.discardCount}</b></div></div></section><section class="hand-wrap"><div class="hand" id="hand">${(me?.hand||[]).map(renderHandCard).join('')}</div><div class="hand-actions"><button class="btn small danger" id="discardBtn">ทิ้ง</button><button class="btn small ghost" id="clearBtn">ยกเลิก</button></div></section></main>`; bindGame(); fitBoard(); }
function renderPlayerChip(p){return `<div class="player-chip ${p.id===view.currentPlayerId?'turn':''} ${p.online?'':'offline'}" data-player-id="${p.id}"><div class="chip-top"><span class="chip-name">${escapeHtml(p.name)}${p.id===myId?' (คุณ)':''}</span><span class="chip-cards">🎴 ${p.handCount}</span></div><div class="tools">${['pick','lamp','cart'].map(t=>`<span class="tool ${p.broken?.[t]?'broken':''}" data-tool="${t}">${EMOJI[t]}</span>`).join('')}${p.role?`<span class="role-reveal">${p.role==='saboteur'?'🧨':'✨'}</span>`:''}</div></div>`;}
function renderHandCard(c){const def=cardByDefId(c.defId);return `<button class="hand-card ${c.kind==='action'?'action':''} ${selectedCardUid===c.uid?'selected':''}" data-card="${c.uid}">${c.kind==='path'?`<span class="mini-path">${def?.label||'PATH'}</span>`:`<span class="action-icon">${ACTION_ICON[c.defId]||'🎴'}</span>`}<span class="card-name">${escapeHtml(def?.name||c.defId)}</span></button>`;}
function bindGame(){document.querySelectorAll('[data-card]').forEach(b=>{b.addEventListener('click',()=>{if(performance.now()<suppressCardClickUntil)return;selectedCardUid=selectedCardUid===b.dataset.card?null:b.dataset.card;renderGame()});});document.querySelector('#discardBtn').onclick=()=>{if(!selectedCardUid)return showToast('เลือกการ์ดก่อน');sendAction({type:'discard',cardUid:selectedCardUid});selectedCardUid=null};document.querySelector('#clearBtn').onclick=()=>{selectedCardUid=null;sendAction({type:'clearPreview'});renderGame()};}
function fitBoard(){const vp=document.querySelector('.board-viewport'),b=document.querySelector('#board');if(!vp||!b)return;const s=Math.min(vp.clientWidth/WORLD_W,vp.clientHeight/WORLD_H,1);b.style.transform=`translate(-50%,-50%) scale(${s})`;}
function processEvents(){if(!view?.events)return;for(const ev of view.events){if(ev.id<=lastSeenEventId)continue;lastSeenEventId=ev.id;fxQueue.push(ev);}if(!fxPlaying)playNextFx();}
function playNextFx(){const ev=fxQueue.shift();if(!ev){fxPlaying=false;return}fxPlaying=true;showToast(ev.text||'');setTimeout(playNextFx,450);}
function modal(inner,onReady){const back=document.createElement('div');back.className='modal-back';back.innerHTML=`<div class="modal">${inner}</div>`;document.body.appendChild(back);back.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>back.remove()));onReady?.(back);return back;}
function runVisualDemo(){home();}
const __params=new URLSearchParams(location.search); if((location.hostname==='127.0.0.1'||location.hostname==='localhost')&&__params.get('smoke')==='1'){} else if(__params.get('demo')==='1') runVisualDemo(); else home();
