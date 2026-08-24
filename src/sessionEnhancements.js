import { supabase } from './lib';

const injectStyles = () => {
  if (document.getElementById('session-enhancement-styles')) return;
  const style = document.createElement('style');
  style.id = 'session-enhancement-styles';
  style.textContent = `
    .ts-modal-backdrop{position:fixed;inset:0;background:rgba(15,49,45,.38);backdrop-filter:blur(5px);display:grid;place-items:center;padding:18px;z-index:9999}
    .ts-modal{width:min(460px,100%);background:#fff;border:1px solid #dce9e6;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(15,49,45,.2)}
    .ts-modal h3{margin:0 0 6px;font-size:22px;color:#17312f}.ts-modal p{margin:0 0 18px;color:#6c817d;font-size:14px}
    .ts-modal label{display:grid;gap:7px;margin:13px 0;font-size:13px;font-weight:700;color:#3c5651}.ts-modal input,.ts-modal textarea{width:100%;padding:12px;border:1px solid #d7e4e1;border-radius:11px;background:#fff;color:#17312f}.ts-modal textarea{min-height:110px;resize:vertical}
    .ts-modal-actions{display:flex;gap:10px;margin-top:18px}.ts-modal-actions button{flex:1;border:0;border-radius:11px;padding:12px 15px;font-weight:700;cursor:pointer}.ts-cancel{background:#edf4f2;color:#174842}.ts-confirm{background:#c94a4a;color:#fff}.ts-error{margin-top:10px;padding:10px 12px;border-radius:9px;background:#fff0f0;color:#a33;font-size:13px}
    .ts-avatar-wrap{display:flex;align-items:center;gap:18px;padding:18px;background:linear-gradient(135deg,#f2faf8,#ffffff);border:1px solid #dfe9e6;border-radius:18px;margin-bottom:4px}
    .ts-avatar{width:88px;height:88px;border-radius:50%;object-fit:cover;background:#e4f3ef;border:3px solid #fff;box-shadow:0 8px 20px rgba(15,118,110,.12)}
    .ts-avatar-initials{display:grid;place-items:center;font-weight:800;font-size:25px;color:#0f766e}
    .ts-avatar-actions{display:flex;gap:8px;flex-wrap:wrap}.ts-avatar-actions button,.ts-team-link{border:0;border-radius:10px;padding:10px 13px;font-weight:750;cursor:pointer}.ts-avatar-upload{background:#0f766e;color:#fff}.ts-avatar-remove{background:#edf4f2;color:#31564f}.ts-hidden-file{display:none}
    .ts-team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-top:16px}.ts-team-card{background:#fff;border:1px solid #dfe9e6;border-radius:18px;padding:20px 15px;text-align:center;box-shadow:0 8px 22px rgba(20,58,52,.04)}.ts-team-avatar{width:82px;height:82px;border-radius:50%;object-fit:cover;margin:0 auto 12px;background:#e4f3ef}.ts-team-name{font-weight:800;color:#17312f}.ts-team-role{margin-top:4px;color:#7b8d89;font-size:12px}.ts-team-empty{grid-column:1/-1}
    @media(max-width:800px){.ts-avatar-wrap{align-items:flex-start}.ts-avatar-actions{flex-direction:column}.ts-avatar-actions button{width:100%}.ts-team-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
};

const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const initials = (first,last) => `${(first||'').trim().charAt(0)}${(last||'').trim().charAt(0)}`.toUpperCase() || 'TS';

const currentProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user:null, profile:null };
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return { user, profile };
};

const photoUrl = (profile) => {
  if (!profile?.avatar_url) return '';
  if (/^https?:\/\//.test(profile.avatar_url)) return profile.avatar_url;
  return supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl;
};

const showStopDialog = async () => {
  injectStyles();
  if (document.querySelector('.ts-modal-backdrop')) return;
  const backdrop = document.createElement('div');
  backdrop.className = 'ts-modal-backdrop';
  backdrop.innerHTML = `<div class="ts-modal" role="dialog" aria-modal="true" aria-labelledby="ts-stop-title"><h3 id="ts-stop-title">Dienst afronden</h3><p>Vul nog even je pauze en een korte beschrijving van je werkzaamheden in.</p><label>Pauze (minuten)<input id="ts-break" type="number" min="0" step="1" value="0" inputmode="numeric"></label><label>Wat heb je gedaan?<textarea id="ts-activity" placeholder="Bijvoorbeeld: balie, schoonmaak, keuken, klanten geholpen…"></textarea></label><div id="ts-error" class="ts-error" hidden></div><div class="ts-modal-actions"><button type="button" class="ts-cancel">Doorgaan met werken</button><button type="button" class="ts-confirm">Dienst stoppen</button></div></div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector('.ts-cancel').addEventListener('click', close);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
  backdrop.querySelector('.ts-confirm').addEventListener('click', async () => {
    const button = backdrop.querySelector('.ts-confirm'); const errorBox = backdrop.querySelector('#ts-error');
    const breakMinutes = Math.max(0, Number(backdrop.querySelector('#ts-break').value || 0)); const activityNote = backdrop.querySelector('#ts-activity').value.trim();
    button.disabled = true; button.textContent = 'Opslaan…'; errorBox.hidden = true;
    try {
      const { user } = await currentProfile(); if (!user) throw new Error('not_logged_in');
      const { data: active } = await supabase.from('work_sessions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(); if (!active) throw new Error('no_active_session');
      const end = new Date(); const totalMinutes = Math.max(0, Math.round((end.getTime() - Date.parse(active.start_time)) / 60000)); if (breakMinutes > totalMinutes) throw new Error('break_too_long');
      const { error } = await supabase.from('work_sessions').update({end_time:end.toISOString(),total_minutes:totalMinutes,break_minutes:breakMinutes,net_minutes:Math.max(0,totalMinutes-breakMinutes),activity_note:activityNote,status:'completed'}).eq('id', active.id).eq('user_id', user.id); if (error) throw error;
      close(); window.location.reload();
    } catch (error) {
      errorBox.textContent = error?.message === 'break_too_long' ? 'De pauze kan niet langer zijn dan de totale dienstduur.' : 'De dienst kon niet worden opgeslagen. Probeer het opnieuw.';
      errorBox.hidden = false; button.disabled = false; button.textContent = 'Dienst stoppen';
    }
  });
};

const addProfilePhotoUi = async () => {
  if (!location.hash.includes('/profiel') || document.getElementById('ts-avatar-card')) return;
  injectStyles();
  const form = document.querySelector('.form'); if (!form) return;
  const { profile } = await currentProfile(); if (!profile) return;
  const url = photoUrl(profile);
  const card = document.createElement('div'); card.className = 'ts-avatar-wrap'; card.id = 'ts-avatar-card';
  const img = document.createElement('img'); img.className = `ts-avatar${url ? '' : ' ts-avatar-initials'}`; img.alt = 'Profielfoto';
  if (url) img.src = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`; else { img.src='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><circle cx="44" cy="44" r="44" fill="#e4f3ef"/><text x="44" y="52" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#0f766e">${initials(profile.first_name,profile.last_name)}</text></svg>`); }
  const content = document.createElement('div'); content.innerHTML = `<div style="font-weight:800;color:#17312f;margin-bottom:5px">Profielfoto</div><div style="color:#7b8d89;font-size:12px;margin-bottom:10px">Dit is de foto die je collega's bij <b>Ons team</b> zien.</div><div class="ts-avatar-actions"><button type="button" class="ts-avatar-upload">Foto kiezen</button><button type="button" class="ts-avatar-remove">Foto verwijderen</button></div>`;
  const input = document.createElement('input'); input.type='file'; input.accept='image/png,image/jpeg,image/webp'; input.className='ts-hidden-file';
  card.append(img, content, input); form.prepend(card);
  const uploadBtn=content.querySelector('.ts-avatar-upload'), removeBtn=content.querySelector('.ts-avatar-remove');
  uploadBtn.addEventListener('click',()=>input.click());
  input.addEventListener('change', async()=>{
    const file=input.files?.[0]; if(!file) return; if(file.size>5*1024*1024){alert('De foto mag maximaal 5 MB zijn.');return;}
    uploadBtn.disabled=true; uploadBtn.textContent='Uploaden…';
    try{
      const { user } = await currentProfile(); if(!user) throw new Error();
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase(); const path=`${user.id}/profile.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg',cacheControl:'3600'}); if(uploadError) throw uploadError;
      const { error:updateError } = await supabase.from('profiles').update({avatar_url:path}).eq('id',user.id); if(updateError) throw updateError;
      window.location.reload();
    }catch(e){alert('De profielfoto kon niet worden opgeslagen.');uploadBtn.disabled=false;uploadBtn.textContent='Foto kiezen';}
  });
  removeBtn.addEventListener('click',async()=>{
    try{const { user }=await currentProfile(); if(!user) return; if(profile.avatar_url) await supabase.storage.from('avatars').remove([profile.avatar_url]); await supabase.from('profiles').update({avatar_url:null}).eq('id',user.id); window.location.reload();}catch(e){alert('De profielfoto kon niet worden verwijderd.');}
  });
};

const renderTeam = async () => {
  injectStyles();
  const section = document.querySelector('.layout section'); if(!section) return;
  section.innerHTML = `<div class="pagehead"><div><div class="eyebrow">THERMAE SON</div><h2>Ons team</h2><p>Alle actieve medewerkers van Thermae Son.</p></div></div><div class="ts-team-grid"><div class="card ts-team-empty">Teamleden laden…</div></div>`;
  const grid=section.querySelector('.ts-team-grid');
  const { data, error } = await supabase.from('profiles').select('id,first_name,last_name,role,avatar_url,active').eq('active',true).order('first_name');
  if(error){grid.innerHTML='<div class="card ts-team-empty">Het team kon niet worden geladen.</div>';return;}
  grid.innerHTML=(data||[]).map(p=>{const url=photoUrl(p);const av=url?`<img class="ts-team-avatar" src="${escapeHtml(url)}" alt="">`:`<div class="ts-team-avatar ts-avatar-initials">${escapeHtml(initials(p.first_name,p.last_name))}</div>`;return `<div class="ts-team-card">${av}<div class="ts-team-name">${escapeHtml(`${p.first_name||''} ${p.last_name||''}`.trim())}</div><div class="ts-team-role">${p.role==='admin'?'Beheerder':p.role==='developer'?'Maker':'Medewerker'}</div></div>`;}).join('') || '<div class="card ts-team-empty">Er zijn nog geen actieve medewerkers.</div>';
};

const ensureTeamLink = () => {
  if (document.getElementById('ts-team-nav')) return;
  const nav=document.querySelector('.layout nav'); if(!nav) return;
  const link=document.createElement('a'); link.id='ts-team-nav'; link.href='#/ons-team'; link.textContent='Ons team'; link.style.textDecoration='none'; link.style.color='inherit';
  link.addEventListener('click',event=>{event.preventDefault(); location.hash='/ons-team'; renderTeam();});
  nav.appendChild(link);
};

export const installSessionEnhancements = () => {
  injectStyles();
  const handler = event => { const button=event.target?.closest?.('button'); if(!button) return; if(button.textContent.trim()!=='STOP DIENST') return; event.preventDefault(); event.stopPropagation(); showStopDialog(); };
  document.addEventListener('click',handler,true);
  const observer=new MutationObserver(()=>{ensureTeamLink(); addProfilePhotoUi(); if(location.hash==='#/ons-team') renderTeam();});
  observer.observe(document.body,{childList:true,subtree:true});
  ensureTeamLink();
  addProfilePhotoUi();
  if(location.hash==='#/ons-team') renderTeam();
  return ()=>{document.removeEventListener('click',handler,true);observer.disconnect();};
};