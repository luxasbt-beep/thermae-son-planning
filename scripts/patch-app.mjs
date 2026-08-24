import fs from 'node:fs';
const p='src/App.jsx';let s=fs.readFileSync(p,'utf8');
if(!s.includes("import Team from'./Team'"))s=s.replace("import AdminAvailability from'./AdminAvailability';","import AdminAvailability from'./AdminAvailability';import Team from'./Team';import UserSettings from'./UserSettings';");
if(!s.includes("['/team','Ons team']"))s=s.replace("['/profiel','Profiel']","['/profiel','Profiel'],['/instellingen','Instellingen'],['/team','Ons team']");
if(!s.includes('<Route path="team" element={<Team/>}/>'))s=s.replace('<Route path="profiel" element={<Profile user={user} profile={profile}/>}/>','<Route path="profiel" element={<Profile user={user} profile={profile}/>}/><Route path="instellingen" element={<UserSettings user={user} profile={profile}/>}/><Route path="team" element={<Team/>}/>');
if(s.includes('function Settings(){')&&!s.includes('De standaardpauze wordt niet meer centraal ingesteld'))s=s.replace(/function Settings\(\)\{[\s\S]*?\}\nexport default function App/,'function Settings(){return <Page title="Instellingen" sub="Algemene instellingen voor de planning."><div className="card"><b>Planning</b><p>De standaardpauze wordt niet meer centraal ingesteld. Pauzes worden na het stoppen van iedere dienst door de medewerker ingevuld.</p></div></Page>}\nexport default function App');
fs.writeFileSync(p,s);
console.log('App patched for team, profile photo settings and pause setting removal');
