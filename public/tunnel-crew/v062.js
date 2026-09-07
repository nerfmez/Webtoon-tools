(()=>{
  const faces=['🧔','🧙','👩‍🦰','🧔‍♂️','👴','👨‍🦳'];
  function txt(el){return el?.textContent?.trim()||''}
  function upgrade(){
    const shell=document.querySelector('.game-shell');
    if(!shell||shell.dataset.v062==='1') return;
    shell.dataset.v062='1'; shell.classList.add('v06');
    const header=shell.querySelector('.game-header');
    const board=shell.querySelector('.board-wrap');
    const hand=shell.querySelector('.hand-dock');
    if(!header||!board||!hand) return;
    const headRow=header.querySelector('.game-head-row');
    const round=txt(headRow?.querySelector('.round-title'));
    const turn=txt(headRow?.querySelector('.turn-banner'));
    const info=headRow?.querySelector('#infoBtn');
    const players=header.querySelector('.players-strip');
    const brand=document.createElement('div');brand.className='v06-brand';brand.innerHTML='<span class="v06-brand-mark">⛏️</span><span><b>Tunnel Crew</b><small>Trust the path • doubt the crew</small></span>';
    const top=document.createElement('div');top.className='v06-top';
    if(info){info.className='v06-hud-btn info';info.textContent='⚙';top.appendChild(info)}
    const room=document.createElement('button');room.type='button';room.className='v06-hud-btn';room.textContent='👥';room.title=round;top.appendChild(room);
    header.prepend(brand); if(players) header.appendChild(players); header.appendChild(top);
    shell.querySelectorAll('.player-chip').forEach((chip,i)=>{if(!chip.querySelector('.v06-portrait')){const p=document.createElement('span');p.className='v06-portrait';p.textContent=faces[i%faces.length];chip.prepend(p)}});
    const layout=document.createElement('div');layout.className='v06-layout';
    const left=document.createElement('aside');left.className='v06-left';
    const right=document.createElement('aside');right.className='v06-right';
    const roundBox=document.createElement('section');roundBox.className='v06-parch';roundBox.innerHTML=`<h3>${round||'รอบเกม'}</h3><p>${turn||'ขุดทางไปยังทองคำ'}</p>`;left.appendChild(roundBox);
    const piles=board.querySelectorAll('.pile-unit');
    if(piles[0]){const w=document.createElement('div');w.className='v06-pile';w.appendChild(piles[0]);left.appendChild(w)}
    const roleText=txt(hand.querySelector('.me-role'));
    const sab=/Saboteur/i.test(roleText);const role=document.createElement('section');role.className='v06-parch v06-role'+(sab?' sab':'');role.innerHTML=`<small>บทบาทของคุณ</small><b>${sab?'Saboteur':'Gold Miner'}</b><span>${sab?'ทำให้เส้นทางไปไม่ถึงทองโดยอย่าให้ถูกจับได้':'เชื่อมทางเดินจาก Start ไปให้ถึงทองคำ'}</span>`;left.appendChild(role);
    const log=document.createElement('section');log.className='v06-log';log.innerHTML=`<div class="v06-log-tabs"><b>Log</b><span>Chat</span></div><div class="v06-log-body"><div class="v06-log-row"><span class="v06-log-icon">🏮</span><div><strong>${turn||'กำลังเล่น'}</strong><small>ทุกการกระทำสำคัญจะแสดงให้ทั้งโต๊ะเห็น</small></div></div><div class="v06-log-row"><span class="v06-log-icon">👁</span><div><strong>Shared Preview</strong><small>ไพ่ทางเดินจะถูกทาบก่อนยืนยัน</small></div></div></div>`;right.appendChild(log);
    if(piles[1]){const w=document.createElement('div');w.className='v06-pile';w.appendChild(piles[1]);right.appendChild(w)}
    const actions=document.createElement('div');actions.className='v06-actions';const actionRail=board.querySelector('.board-action-rail');if(actionRail)actions.appendChild(actionRail);right.appendChild(actions);
    board.parentNode.insertBefore(layout,board);layout.append(left,board,right);
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
  const mo=new MutationObserver(()=>queueMicrotask(upgrade));mo.observe(document.documentElement,{childList:true,subtree:true});upgrade();
})();