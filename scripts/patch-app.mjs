import fs from 'node:fs';

const p = 'src/App.jsx';
let s = fs.readFileSync(p, 'utf8');

const removeAll = (value) => {
  while (s.includes(value)) s = s.replace(value, '');
};

// Remove previously injected team/settings imports and routes.
removeAll("import Team from'./Team';");
removeAll("import UserSettings from'./UserSettings';");
removeAll('<Route path="instellingen" element={<UserSettings user={user} profile={profile}/>}/>');
removeAll('<Route path="team" element={<Team/>}/>');

// Remove every injected employee-side menu entry, then add exactly one of each.
removeAll("['/instellingen','Instellingen'],");
removeAll("['/team','Ons team'],");
removeAll("['/team','Ons team']");

// Add exactly one pair of imports.
const adminImport = "import AdminAvailability from'./AdminAvailability';";
if (s.includes(adminImport)) {
  s = s.replace(adminImport, adminImport + "import Team from'./Team';import UserSettings from'./UserSettings';");
}

// Add exactly one employee-side menu entry pair.
const profileMenu = "['/profiel','Profiel']";
if (s.includes(profileMenu)) {
  s = s.replace(profileMenu, profileMenu + ",[" + "'/instellingen','Instellingen'],['/team','Ons team']");
}

// Add exactly one pair of routes after the profile route.
const profileRoute = '<Route path="profiel" element={<Profile user={user} profile={profile}/>}/>';
if (s.includes(profileRoute)) {
  s = s.replace(
    profileRoute,
    profileRoute + '<Route path="instellingen" element={<UserSettings user={user} profile={profile}/>}/><Route path="team" element={<Team/>}/>'
  );
}

// Remove the old central default-pause setting.
if (s.includes('function Settings(){') && !s.includes('De standaardpauze wordt niet meer centraal ingesteld')) {
  s = s.replace(
    /function Settings\(\)\{[\s\S]*?\}\nexport default function App/,
    'function Settings(){return <Page title="Instellingen" sub="Algemene instellingen voor de planning."><div className="card"><b>Planning</b><p>De standaardpauze wordt niet meer centraal ingesteld. Pauzes worden na het stoppen van iedere dienst door de medewerker ingevuld.</p></div></Page>}\nexport default function App'
  );
}

fs.writeFileSync(p, s);
console.log('App patched safely: one Ons team, one Instellingen, no default-pause setting.');
