(function(){
  const esc = typeof escapeHtml==='function'?escapeHtml:(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function avatarUrl(i){return `./assets-v07/avatar${(i%5)+1}.webp`;}
  function eventText(ev){
    const actor=(typeof playerName==='function'?playerName(ev.actorId):'ผู้เล่น');
    if(ev.type==='path_play') return [actor,'วางทางเดิน'];
    if(ev.type==='discard') return [actor,'ทิ้งไพ่'];
    if(ev.type==='draw') return [actor,'จั่วไพ่'];
    if(ev.type==='tool_action') return [actor,ev.mode==='break'?'ก่อวินาศกรรม':'ซ่อมอุปกรณ์'];
    if(ev.type==='map_action') return [actor,'ใช้แผนที่'];
    if(ev.type==='rockfall') return [actor,'ทำหินถล่ม'];
    if(ev.type==='goal_reveal') return [actor,ev.goalType==='gold'?'พบทอง!':'เปิดเป้าหมาย'];
    if(ev.type==='round_start') return ['ระบบ',`เริ่มรอบ ${ev.round}`];
    return [actor,'กำลังขุด...'];
  }
  window.__tcV07EventFeed=function(){
    const events=(view?.events||[]).slice(-5).reverse();
    if(!events.length) return '<div class="v07-log-empty">ยังไม่มีเหตุการณ์</div>';
    return events.map(ev=>{const [a,t]=eventText(ev);return `<div class="v07-log-row"><span class="v07-log-dot"></span><div><b>${esc(a)}</b><small>${esc(t)}</small></div></div>`}).join('');
  };
  window.__tcV07Player=function(p,i){
    const mine=p.id===myId;
    return `<div class="v07-player ${p.id===view.currentPlayerId?'turn':''} ${p.online?'':'offline'}" data-player-id="${p.id}">
      <div class="v07-portrait" style="background-image:url('${avatarUrl(i)}')"></div>
      <div class="v07-player-copy"><b>${esc(p.name)}${mine?' <em>(คุณ)</em>':''}</b><span>${p.role?(p.role==='saboteur'?'Saboteur':'Miner'):' '} · 🂠 ${p.handCount}</span></div>
      <div class="v07-tools">${['pick','lamp','cart'].map(t=>`<i class="${p.broken?.[t]?'bad':''}">${EMOJI[t]}</i>`).join('')}</div>
    </div>`;
  };
  window.__tcV07HandCard=function(c,myTurn){
    const d=cardByDefId(c.defId), sel=c.uid===selectedCardUid?'selected':'';
    if(c.kind==='path') return `<button class="hand-card path-hand ${sel}" data-card="${c.uid}" data-kind="path" ${myTurn?'':'disabled'} aria-label="${esc(d.name)}"><span class="v07-card-paper">${tunnelSvg(c.defId,c.uid===selectedCardUid?selectedRotation:0)}</span></button>`;
    const tone=d.action==='break'?'danger':d.action==='fix'?'repair':d.action==='map'?'map':'rockfall';
    const art=d.action==='break'?'action_red.webp':d.action==='fix'?'action_green.webp':d.action==='map'?'action_map.webp':'action_red.webp';
    return `<button class="hand-card action ${tone} ${sel}" data-card="${c.uid}" data-kind="action" ${myTurn?'':'disabled'} style="--card-art:url('./assets-v07/${art}')"><span class="v07-action-title">${esc(d.name)}</span></button>`;
  };

  renderGame=function(){
    currentScreen='game';
    const me=view.me; if(!me)return;
    if(selectedCardUid && !me.hand.some(c=>c.uid===selectedCardUid)){ selectedCardUid=null; selectedRotation=0; }
    const turnP=view.players.find(p=>p.id===view.currentPlayerId);
    const myTurn=view.currentPlayerId===myId && view.phase==='playing';
    const roleName=me.role==='saboteur'?'Saboteur':'Gold Miner';
    const previewMine=view.sharedPreview?.playerId===myId;
    const selected=view.me.hand.find(c=>c.uid===selectedCardUid);
    const selectedDef=selected?cardByDefId(selected.defId):null;
    app.innerHTML=`<main class="v07-game">
      <header class="v07-topbar">
        <div class="v07-logo"><div class="v07-logo-mark">⛏</div><div><strong>Tunnel Crew</strong><small>TRUST THE PATH — QUESTION THE MINER</small></div></div>
        <div class="v07-players">${view.players.map((p,i)=>__tcV07Player(p,i)).join('')}</div>
        <div class="v07-top-actions"><button class="v07-icon-btn" id="infoBtn" aria-label="กติกา">⚙</button><div class="v07-online">● ${view.players.filter(p=>p.online).length}/${view.players.length}</div></div>
      </header>

      <section class="v07-stage">
        <aside class="v07-left">
          <div class="v07-round-card"><div class="v07-pickaxes">⚒</div><b>รอบ ${view.round} / 3</b><span>${view.phase==='playing'?`ตาของ ${esc(turnP?.name||'')}`:phaseText(view)}</span><small>${myTurn?'ถึงตาคุณแล้ว':'จับตาดูการขุดของทุกคน'}</small></div>
          <div class="v07-deck-station"><div class="v07-deck" id="drawPile"></div><b>กองจั่ว</b><span>${view.deckCount} ใบ</span></div>
          <div class="v07-role-card"><small>YOUR ROLE</small><div class="v07-role-row"><div class="v07-role-avatar" style="background-image:url('${avatarUrl(Math.max(0,view.players.findIndex(p=>p.id===myId)))}')"></div><div><b>${roleName}</b><span>${me.role==='saboteur'?'หยุดคนขุดทองโดยอย่าให้ถูกจับได้':'สร้างทางจากทางเข้าไปให้ถึงทอง'}</span></div></div><div class="v07-gold">ทองสะสม ${me.score}</div></div>
        </aside>

        <section class="board-wrap v07-board" id="boardWrap">
          <div class="v07-table-glow"></div><div class="v07-table-scratches"></div>
          <div class="world" id="world"></div>
          <div class="board-tip" id="gameMessage">${selectionInstruction(myTurn)}</div>
        </section>

        <aside class="v07-right">
          <div class="v07-chat"><div class="v07-tabs"><b>Log</b><span>Chat</span></div><div class="v07-log">${__tcV07EventFeed()}</div></div>
          <div class="v07-discard-wrap"><div class="v07-discard" id="discardPile"></div><div><b>กองทิ้ง</b><span>${view.discardCount||0} ใบ</span></div></div>
          <div class="v07-controls ${selectedCardUid?'show':''}" id="boardActionRail">
            <div class="v07-control-label">${selectedDef?esc(selectedDef.name):'เลือกไพ่ก่อน'}</div>
            <div class="v07-control-grid">
              <button class="rail-btn rotate" id="rotateBtn" ${selected?.kind==='path'?'':'disabled'}>↻<span>หมุน</span></button>
              ${previewMine?'<button class="rail-btn confirm" id="confirmPath">✓<span>วางจริง</span></button>':'<button class="rail-btn confirm" disabled>✓<span>วางจริง</span></button>'}
              <button class="rail-btn cancel" id="cancelBtn" ${selectedCardUid?'':'disabled'}>×<span>ยกเลิก</span></button>
            </div>
            ${selectedCardUid?'<button class="v07-discard-btn" id="discardBtn">ทิ้งไพ่ใบนี้</button>':''}
          </div>
        </aside>
      </section>

      <footer class="hand-dock v07-handdock"><div class="v07-hand-title"><span>ไพ่ในมือ</span><small>${myTurn?'ลากขึ้นโต๊ะ หรือแตะเพื่อเลือก':'รอเทิร์นของคุณ'}</small></div><div class="hand">${me.hand.map(c=>__tcV07HandCard(c,myTurn)).join('')}</div></footer>
      <div class="fx-layer" id="fxLayer"></div>
    </main>`;
    renderBoard(); setupBoardGestures(); setupGameControls(myTurn); setupCardDragging(myTurn); playNewEvents();
    if(view.round>roleSeenRound && view.phase==='playing'){roleSeenRound=view.round;showRoleModal(me.role)}
    if(view.phase==='reward') showRewardModal();
    if(view.phase==='game_over') showGameOverModal();
  };

  fitBoard=function(){
    const wrap=document.querySelector('#boardWrap'); if(!wrap)return;
    const r=wrap.getBoundingClientRect(); if(r.width<2||r.height<2)return;
    const pts=[{x:0,y:0},{x:8,y:-2},{x:8,y:0},{x:8,y:2},...(view?.board||[]),...(view?.goals||[])];
    if(view?.sharedPreview)pts.push(view.sharedPreview);
    const px=pts.map(p=>displayPoint(p.x,p.y));
    const halfW=45,halfH=32,padX=Math.max(22,r.width*.06),padY=Math.max(18,r.height*.06);
    const minX=Math.min(...px.map(p=>p.px))-halfW,maxX=Math.max(...px.map(p=>p.px))+halfW;
    const minY=Math.min(...px.map(p=>p.py))-halfH,maxY=Math.max(...px.map(p=>p.py))+halfH;
    const contentW=maxX-minX,contentH=maxY-minY;
    const maxScale=window.innerWidth<900?.82:1.0;
    const scale=Math.max(.28,Math.min(maxScale,(r.width-padX*2)/contentW,(r.height-padY*2)/contentH));
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    boardTransform={scale,x:r.width/2-cx*scale,y:r.height/2-cy*scale};applyBoardTransform();
  };
})();
