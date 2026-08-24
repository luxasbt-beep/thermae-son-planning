import fs from 'node:fs';

const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');

// Make this build-time patch idempotent: remove any earlier team/settings injections first.
s=s.replaceAll("import Team from'./Team';import UserSettings from'./UserSettings';",'');
s=s.replaceAll("import Team from'./Team';",'');
s=s.replaceAll("import UserSettings from'./UserSettings';",'');
s=s.replaceAll("<Route path=\"instellingen\" element={<UserSettings user={user} profile={profile}/>}/>",'');
s=s.replaceAll("<Route path=\"team\" element={<Team/>}/>" ,'');
s=s.replaceAll(",[ ['/team','Ons team'] ]",'');

// Restore exactly one pair of imports.
s=s.replace("import AdminAvailability from'./AdminAvailability';","import AdminAvailability from'./AdminAvailability';import Team from'./Team';import UserSettings from'./UserSettings';");

// Restore exactly one employee-side menu entry for each new page.
s=s.replace("['/profiel','Profiel']","['/profiel','Profiel'],['/instellingen','Instellingen'],['/team','Ons team']");

// Restore exactly one pair of routes.
s=s.replace(
  '<Route path="profiel" element={<Profile user={user} profile={profile}/>}/>',
  '<Route path="profiel" element={<Profile user={user} profile={profile}/>}/><Route path="instellingen" element={<UserSettings user={user} profile={profile}/>}/><Route path="team" element={<Team/>}/>'
);

// Remove the old central default-pause setting from the admin page.
if(s.includes('function Settings(){')&&!s.includes('De standaardpauze wordt niet meer centraal ingesteld')){
  s=s.replace(/function Settings\(\)\{[\s\S]*?\}\nexport default function App/,'function Settings(){return <Page title="Instellingen" sub="Algemene instellingen voor de planning."><div className="card"><b>Planning</b><p>De standaardpauze wordt niet meer centraal ingesteld. Pauzes worden na het stoppen van iedere dienst door de medewerker ingevuld.</p></div></Page>}\nexport default function App');
}

// Deduplicate any accidental repeated menu entry.
const teamLink="['/team','Ons team']";
const teamMatches=s.match(new RegExp(teamLink.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&'),'g'))||[];
if(teamMatches.length>1){
  let seen=0;
  s=s.replace(new RegExp(teamLink.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&'),'g'),m=>seen++===0?m:'');
}

fs.writeFileSync(p,s);
console.log('App patched idempotently: one Ons team, one Instellingen, no default-pause setting.');
