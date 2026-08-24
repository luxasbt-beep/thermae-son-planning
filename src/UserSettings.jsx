import React,{useEffect,useMemo,useState}from'react';
import{supabase}from'./lib';
import'./team.css';

const euro=value=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(value||0);

export default function UserSettings({user,profile}){
  const[preview,setPreview]=useState('');
  const[hourlyWage,setHourlyWage]=useState(profile?.hourly_wage??'');
  const[age,setAge]=useState(profile?.age??'');
  const[sessions,setSessions]=useState([]);
  const[month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);
  useEffect(()=>{const path=profile?.avatar_url||'';setPreview(path?supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl:'');setHourlyWage(profile?.hourly_wage??'');setAge(profile?.age??'')},[profile]);
  useEffect(()=>{supabase.from('work_sessions').select('date,net_minutes').eq('user_id',user.id).eq('status','completed').then(({data})=>setSessions(data||[]))},[user.id]);
  const netMinutes=useMemo(()=>sessions.filter(session=>session.date?.startsWith(month)).reduce((total,session)=>total+(Number(session.net_minutes)||0),0),[sessions,month]);
  const earnings=netMinutes/60*(Number(hourlyWage)||0);
  const saveDetails=async()=>{const wage=hourlyWage===''?null:Number(hourlyWage),years=age===''?null:Number(age);if((wage!==null&&(!Number.isFinite(wage)||wage<0))||(years!==null&&(!Number.isInteger(years)||years<0||years>120)))return setMsg('Vul een geldig uurloon en een geldige leeftijd in.');setBusy(true);setMsg('');const{error}=await supabase.from('profiles').update({hourly_wage:wage,age:years}).eq('id',user.id);setBusy(false);setMsg(error?'Je gegevens konden niet worden opgeslagen.':'Uurloon en leeftijd opgeslagen.')};
  const upload=async event=>{const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/'))return setMsg('Kies een afbeelding.');if(file.size>5*1024*1024)return setMsg('De foto mag maximaal 5 MB zijn.');setBusy(true);setMsg('');const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),filePath=`${user.id}/avatar.${ext}`;const{error:uploadError}=await supabase.storage.from('avatars').upload(filePath,file,{contentType:file.type,upsert:true,cacheControl:'3600'});if(uploadError){setBusy(false);return setMsg('Profielfoto kon niet worden opgeslagen.')}const{error}=await supabase.from('profiles').update({avatar_url:filePath}).eq('id',user.id);if(error){setBusy(false);return setMsg('Profielfoto kon niet worden opgeslagen.')}setPreview(`${supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl}?v=${Date.now()}`);setBusy(false);setMsg('Profielfoto opgeslagen.')};
  return <><div className="pagehead"><div><div className="eyebrow">THERMAE SON</div><h2>Instellingen</h2><p>Pas je persoonlijke instellingen aan.</p></div></div><div className="card settings-photo"><div className="photo-preview">{preview?<img src={preview} alt="Profielfoto"/>:<div className="photo-placeholder">{(profile?.first_name||'T').slice(0,1).toUpperCase()}</div>}</div><div><h3>Profielfoto</h3><p>Kies een foto die bij jouw profiel en bij <b>Ons team</b> wordt getoond.</p><label className="primary upload-button">{busy?'Opslaan…':'Foto kiezen'}<input type="file" accept="image/*" onChange={upload} disabled={busy}/></label></div></div><div className="card form"><h3>Werk en salaris</h3><div className="tw"><label>Uurloon (€)<input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Bijvoorbeeld 12,50" value={hourlyWage} onChange={event=>setHourlyWage(event.target.value)}/></label><label>Leeftijd<input type="number" min="0" max="120" step="1" inputMode="numeric" value={age} onChange={event=>setAge(event.target.value)}/></label></div><button className="primary" onClick={saveDetails} disabled={busy}>{busy?'Opslaan…':'Opslaan'}</button>{msg&&<div className="notice">{msg}</div>}</div><div className="card"><div className="toolbar"><label>Maand<input type="month" value={month} onChange={event=>setMonth(event.target.value)}/></label></div><div className="stats"><div><small>Netto gewerkt</small><b>{Math.floor(netMinutes/60)}u {netMinutes%60}m</b></div><div><small>Deze maand verdiend</small><b>{euro(earnings)}</b></div></div><p>Pauzes tellen niet mee: de berekening gebruikt alleen je netto werktijd.</p></div></>;
}
