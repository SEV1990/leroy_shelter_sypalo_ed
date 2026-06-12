
// ── API layer ──────────────────────────────────────────────
const API='/api';
let authToken=localStorage.getItem('leroy_token')||'';
let animals=[];
let team=[];
let enclosures=[];
let settings={};
let collections={stat:[],evac_stat:[],partner:[],evac_step:[],chat:[]};

async function api(path,opts={}){
  opts.headers=opts.headers||{};
  if(authToken) opts.headers['Authorization']='Bearer '+authToken;
  const r=await fetch(API+path,opts);
  if(r.status===401){ authToken=''; localStorage.removeItem('leroy_token'); }
  return r;
}
async function getJSON(path,fallback){
  try{ const r=await fetch(API+path); return r.ok ? await r.json() : fallback; }
  catch(e){ return fallback; }
}
async function fetchAnimals(){ animals = await getJSON('/animals',[]); }
async function fetchTeam(){ team = await getJSON('/team',[]); }
async function fetchEnclosures(){ enclosures = await getJSON('/enclosures',[]); }
async function fetchSettings(){ settings = await getJSON('/settings',{}); }
async function fetchCollection(kind){ collections[kind] = await getJSON('/collections/'+kind,[]); }

// NAV
const PAGES=['home','animals','shelter','team','mission','schememap','help','about','silentfront','evacuation','contacts','admin'];
// Merged nav mapping
const NAV_MAP={'schememap':'shelter','about':'mission'};
function showPage(n){
  PAGES.forEach(p=>{
    document.getElementById('page-'+p).classList.remove('active');
    const l=document.getElementById('nav-'+p);if(l)l.classList.remove('active');
  });
  document.getElementById('page-'+n).classList.add('active');
  // highlight merged nav item
  const navId=NAV_MAP[n]||n;
  const l=document.getElementById('nav-'+navId);if(l)l.classList.add('active');
  window.scrollTo(0,0);
  if(n==='animals')renderAnimals('all');
  if(n==='admin')initAdmin();
}

// ADMIN ACCESS (JWT-based)
function isAuthed(){ return !!authToken; }
function toggleAdmin(){ showPage('admin'); }
async function adminLogin(){
  const pass=document.getElementById('adm-pass').value;
  if(!pass) return;
  try{
    const r=await fetch(API+'/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pass})});
    if(!r.ok){ alert('❌ Невірний пароль'); return; }
    const d=await r.json(); authToken=d.token; localStorage.setItem('leroy_token',authToken);
    document.getElementById('adm-pass').value='';
    document.getElementById('nav-admin').classList.add('visible');
    initAdmin();
  }catch(e){ alert('Помилка з’єднання'); }
}
function adminLogout(){
  authToken=''; localStorage.removeItem('leroy_token');
  document.getElementById('nav-admin').classList.remove('visible');
  initAdmin();
}
let adminCurrentTab='animals';
function initAdmin(){
  const authed=isAuthed();
  document.getElementById('admin-login').style.display=authed?'none':'';
  document.getElementById('admin-panel').style.display=authed?'':'none';
  if(authed){
    const btn=document.querySelector(`.adm-tab[onclick*="'${adminCurrentTab}'"]`);
    adminTab(adminCurrentTab, btn||document.querySelector('.adm-tab'));
  }
}

// ANIMALS
const sL={shelter:'В шелтері',foster:'На перетримці',adopted:'Прилаштований'};
const sC={shelter:'ss',foster:'sf',adopted:'sa'};
// Photo URLs come straight from the API/server now.
function rp(u){ return u||''; }
function aCard(a){
  const ph=a.photo?`<img src="${rp(a.photo)}" alt="${a.name}" onerror="this.style.display='none'">`:'<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:56px;">'+(a.type==='dog'?'🐕':'🐈')+'</div>';
  return`<div class="acard"><div class="aphoto">${ph}</div><div class="abody"><div class="aname">${a.name}</div><div class="metarow"><span class="chip">${a.type==='dog'?'Собака':'Кіт'}</span><span class="chip">${a.gender==='м'?'♂ Хлопець':'♀ Дівчина'}</span><span class="chip">${a.age}</span></div>${a.breed?`<div style="font-size:12px;color:var(--GD);margin-bottom:8px;">${a.breed}</div>`:''}<span class="sbadge ${sC[a.status]}">${sL[a.status]}</span>${a.status!=='adopted'?`<button class="abtn" onclick="adoptClick('${a.name}')">Хочу взяти ${a.type==='cat'?'кота':'пса'}</button>`:''}</div></div>`;
}
function renderAnimals(f){
  const g=document.getElementById('animals-grid');
  const d=f==='all'?animals.filter(a=>a.status!=='adopted'):f==='dog'?animals.filter(a=>a.type==='dog'&&a.status!=='adopted'):f==='cat'?animals.filter(a=>a.type==='cat'&&a.status!=='adopted'):animals.filter(a=>a.status===f);
  g.innerHTML=d.map(a=>aCard(a)).join('');
}
function filterAnimals(f,btn){document.querySelectorAll('.fb').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderAnimals(f);}
function adoptClick(name){showPage('contacts');setTimeout(()=>{const s=document.querySelector('#page-contacts select');if(s)s.value='Хочу взяти тварину';const t=document.querySelector('#page-contacts textarea');if(t)t.value=`Мене цікавить ${name}.`;},100);}

// ── ADMIN: tab switching ─────────────────────────────────
const ADM_TABS={
  animals:renderAdmin, team:renderTeamAdmin, scheme:renderEnclosuresAdmin,
  texts:renderTextsAdmin, photos:renderPhotosAdmin,
  stats:async()=>{ await renderColAdmin('stat'); await renderColAdmin('evac_stat'); }, partners:()=>renderColAdmin('partner'),
  evac:()=>renderColAdmin('evac_step'), chat:()=>renderColAdmin('chat'),
  contacts:loadSettingsForm, requests:renderRequests,
};
function adminTab(t,btn){
  if(!ADM_TABS[t]) t='animals';
  adminCurrentTab=t;
  document.querySelectorAll('.adm-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  Object.keys(ADM_TABS).forEach(s=>{const el=document.getElementById('adm-sec-'+s);if(el)el.style.display=s===t?'':'none';});
  ADM_TABS[t]();
}
function adminFail(r){ if(r.status===401){alert('Сесія завершилась — увійдіть знову');initAdmin();return true;} alert('Помилка'); return false; }

// ── ADMIN: animals (add / edit / delete) ─────────────────
async function renderAdmin(){
  await fetchAnimals();
  document.getElementById('admin-tbody').innerHTML=animals.map((a,i)=>`<tr><td>${i+1}</td><td><strong>${esc(a.name)}</strong></td><td>${a.type==='dog'?'🐕':'🐈'}</td><td>${a.gender==='м'?'♂':'♀'}</td><td>${esc(a.age)}</td><td><span class="sbadge ${sC[a.status]}">${sL[a.status]}</span></td><td><button class="edit-btn" onclick="editAnimal(${a.id})">Редагувати</button><button class="del-btn" onclick="delAnimal(${a.id})">Видалити</button></td></tr>`).join('');
}
function resetAnimalForm(){
  document.getElementById('a-id').value='';
  ['a-name','a-age','a-breed','a-desc','a-photo'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('a-photofile').value='';
  document.getElementById('a-type').value='dog';document.getElementById('a-gender').value='м';document.getElementById('a-status').value='shelter';
  document.getElementById('a-formtitle').textContent='Нова тварина';
  document.getElementById('a-cancel').style.display='none';
}
function editAnimal(id){
  const a=animals.find(x=>x.id===id);if(!a)return;
  document.getElementById('a-id').value=a.id;
  document.getElementById('a-name').value=a.name||'';
  document.getElementById('a-type').value=a.type||'dog';
  document.getElementById('a-gender').value=a.gender||'м';
  document.getElementById('a-age').value=a.age||'';
  document.getElementById('a-breed').value=a.breed||'';
  document.getElementById('a-status').value=a.status||'shelter';
  document.getElementById('a-desc').value=a.desc||a.descr||'';
  document.getElementById('a-photo').value='';
  document.getElementById('a-photofile').value='';
  document.getElementById('a-formtitle').textContent='Редагувати: '+a.name;
  document.getElementById('a-cancel').style.display='';
  document.getElementById('adm-sec-animals').scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveAnimal(){
  const id=document.getElementById('a-id').value;
  const n=document.getElementById('a-name').value.trim();
  if(!n){alert('Введіть ім\'я');return;}
  const fd=new FormData();
  fd.append('name',n);
  ['type','gender','age','breed','status','desc'].forEach(k=>fd.append(k,document.getElementById('a-'+k).value));
  const photoUrl=document.getElementById('a-photo').value.trim();
  if(photoUrl) fd.append('photo',photoUrl);
  const file=document.getElementById('a-photofile').files[0];
  if(file) fd.append('photofile',file);
  const r=await api('/animals'+(id?'/'+id:''),{method:id?'PUT':'POST',body:fd});
  if(!r.ok){ adminFail(r); return; }
  resetAnimalForm();
  alert(id?'✅ Збережено':`✅ ${n} додано!`);
  await renderAdmin();
  renderAnimalsPublic();
}
async function delAnimal(id){
  if(!confirm('Видалити?'))return;
  const r=await api('/animals/'+id,{method:'DELETE'});
  if(!r.ok){ adminFail(r); return; }
  await renderAdmin();
  renderAnimalsPublic();
}

// ── ADMIN: team (add / edit / delete) ────────────────────
async function renderTeamAdmin(){
  await fetchTeam();
  document.getElementById('team-tbody').innerHTML=team.map(t=>`<tr><td>${t.sort}</td><td><strong>${esc(t.name)}</strong></td><td>${esc(t.role||'')}</td><td><button class="edit-btn" onclick="editTeam(${t.id})">Редагувати</button><button class="del-btn" onclick="delTeam(${t.id})">Видалити</button></td></tr>`).join('')||'<tr><td colspan="4" style="color:var(--GD);padding:20px;">Поки порожньо</td></tr>';
}
function resetTeamForm(){
  document.getElementById('t-id').value='';
  ['t-name','t-role','t-desc','t-sort','t-photo'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('t-photofile').value='';
  document.getElementById('t-formtitle').textContent='Новий учасник команди';
  document.getElementById('t-cancel').style.display='none';
}
function editTeam(id){
  const t=team.find(x=>x.id===id);if(!t)return;
  document.getElementById('t-id').value=t.id;
  document.getElementById('t-name').value=t.name||'';
  document.getElementById('t-role').value=t.role||'';
  document.getElementById('t-desc').value=t.descr||'';
  document.getElementById('t-sort').value=t.sort||0;
  document.getElementById('t-photo').value='';document.getElementById('t-photofile').value='';
  document.getElementById('t-formtitle').textContent='Редагувати: '+t.name;
  document.getElementById('t-cancel').style.display='';
  document.getElementById('adm-sec-team').scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveTeam(){
  const id=document.getElementById('t-id').value;
  const n=document.getElementById('t-name').value.trim();
  if(!n){alert('Введіть ім\'я');return;}
  const fd=new FormData();
  fd.append('name',n);
  fd.append('role',document.getElementById('t-role').value);
  fd.append('desc',document.getElementById('t-desc').value);
  fd.append('sort',document.getElementById('t-sort').value||'0');
  const photoUrl=document.getElementById('t-photo').value.trim();
  if(photoUrl) fd.append('photo',photoUrl);
  const file=document.getElementById('t-photofile').files[0];
  if(file) fd.append('photofile',file);
  const r=await api('/team'+(id?'/'+id:''),{method:id?'PUT':'POST',body:fd});
  if(!r.ok){ adminFail(r); return; }
  resetTeamForm();
  await renderTeamAdmin();
  renderTeamPublic();
}
async function delTeam(id){
  if(!confirm('Видалити?'))return;
  const r=await api('/team/'+id,{method:'DELETE'});
  if(!r.ok){ adminFail(r); return; }
  await renderTeamAdmin();
  renderTeamPublic();
}

// ── ADMIN: enclosures / scheme (add / edit / delete) ─────
const ENC_STATUS={occ:'Зайнятий',empty:'Порожній',nof:'Не функціонує'};
async function renderEnclosuresAdmin(){
  await fetchEnclosures();
  document.getElementById('enc-tbody').innerHTML=enclosures.map(e=>`<tr><td>${e.code?'#'+esc(e.code):'—'}</td><td>${esc(e.occupant||'')}</td><td>${ENC_STATUS[e.status]||e.status}</td><td>${e.span}</td><td>${e.block==='top'?'Верхній':'Нижній'}</td><td>${e.sort}</td><td><button class="edit-btn" onclick="editEnclosure(${e.id})">Редагувати</button><button class="del-btn" onclick="delEnclosure(${e.id})">Видалити</button></td></tr>`).join('')||'<tr><td colspan="7" style="color:var(--GD);padding:20px;">Поки порожньо</td></tr>';
}
function resetEnclosureForm(){
  document.getElementById('e-id').value='';
  ['e-code','e-occupant','e-sort'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('e-status').value='occ';document.getElementById('e-span').value='1';document.getElementById('e-block').value='top';
  document.getElementById('e-formtitle').textContent='Новий вольєр';
  document.getElementById('e-cancel').style.display='none';
}
function editEnclosure(id){
  const e=enclosures.find(x=>x.id===id);if(!e)return;
  document.getElementById('e-id').value=e.id;
  document.getElementById('e-code').value=e.code||'';
  document.getElementById('e-occupant').value=e.occupant||'';
  document.getElementById('e-status').value=e.status||'occ';
  document.getElementById('e-span').value=String(e.span||1);
  document.getElementById('e-block').value=e.block||'top';
  document.getElementById('e-sort').value=e.sort||0;
  document.getElementById('e-formtitle').textContent='Редагувати вольєр '+(e.code?'#'+e.code:'');
  document.getElementById('e-cancel').style.display='';
  document.getElementById('adm-sec-scheme').scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveEnclosure(){
  const id=document.getElementById('e-id').value;
  const body={
    code:document.getElementById('e-code').value,
    occupant:document.getElementById('e-occupant').value,
    status:document.getElementById('e-status').value,
    span:document.getElementById('e-span').value,
    block:document.getElementById('e-block').value,
    sort:document.getElementById('e-sort').value||'0',
  };
  const r=await api('/enclosures'+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){ adminFail(r); return; }
  resetEnclosureForm();
  await renderEnclosuresAdmin();
  renderSchemePublic();
}
async function delEnclosure(id){
  if(!confirm('Видалити?'))return;
  const r=await api('/enclosures/'+id,{method:'DELETE'});
  if(!r.ok){ adminFail(r); return; }
  await renderEnclosuresAdmin();
  renderSchemePublic();
}

// ── ADMIN: settings (contacts) ───────────────────────────
const SETTING_KEYS=['contact_site','contact_instagram','contact_telegram','contact_address'];
async function loadSettingsForm(){
  await fetchSettings();
  SETTING_KEYS.forEach(k=>{const el=document.getElementById('s-'+k);if(el)el.value=settings[k]||'';});
}
async function saveSettings(){
  const body={};
  SETTING_KEYS.forEach(k=>{const el=document.getElementById('s-'+k);if(el)body[k]=el.value;});
  const r=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){ adminFail(r); return; }
  alert('✅ Збережено');
  await fetchSettings();
  applySettings();
}

// ── REQUESTS (contact + evacuation) ──────────────────────
const REQTYPE={contact:'Контакт',evacuation:'Евакуація'};
async function renderRequests(){
  const r=await api('/requests');
  if(!r.ok){ if(r.status===401)initAdmin(); return; }
  const rows=await r.json();
  document.getElementById('requests-tbody').innerHTML = rows.length
    ? rows.map(q=>`<tr><td style="white-space:nowrap;">${new Date(q.created_at).toLocaleString('uk-UA')}</td><td>${REQTYPE[q.type]||q.type}</td><td><strong>${esc(q.name||'')}</strong><br><span style="color:var(--GD);">${esc(q.contact||'')}</span></td><td style="max-width:320px;">${esc(q.message||'')}</td><td><button class="del-btn" onclick="delRequest(${q.id})">Видалити</button></td></tr>`).join('')
    : '<tr><td colspan="5" style="color:var(--GD);padding:20px;">Поки немає заявок</td></tr>';
}
async function delRequest(id){
  if(!confirm('Видалити заявку?'))return;
  const r=await api('/requests/'+id,{method:'DELETE'});
  if(r.ok)renderRequests(); else if(r.status===401)initAdmin();
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

// ── PUBLIC FORMS ─────────────────────────────────────────
async function submitContact(){
  const name=document.getElementById('ct-name').value.trim();
  const contact=document.getElementById('ct-contact').value.trim();
  const subject=document.getElementById('ct-subject').value;
  const message=document.getElementById('ct-message').value.trim();
  if(!name||!contact){alert('Вкажіть ім’я та контакт');return;}
  const r=await fetch(API+'/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,contact,subject,message})});
  if(r.ok){ alert('Дякуємо! Зв’яжемось найближчим часом.'); ['ct-name','ct-contact','ct-message'].forEach(i=>document.getElementById(i).value=''); }
  else alert('Не вдалося надіслати. Спробуйте пізніше.');
}
async function submitEvacuation(){
  const contact=document.getElementById('ev-contact').value.trim();
  const location=document.getElementById('ev-location').value.trim();
  const animalsTxt=document.getElementById('ev-animals').value.trim();
  const details=document.getElementById('ev-details').value.trim();
  if(!contact||!location){alert('Вкажіть контакт і місце перебування тварини');return;}
  const r=await fetch(API+'/evacuation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact,location,animals:animalsTxt,details})});
  if(r.ok){ alert('Дякуємо! Ваш запит прийнято. Зв’яжемось найближчим часом.'); ['ev-contact','ev-location','ev-animals','ev-details'].forEach(i=>document.getElementById(i).value=''); }
  else alert('Не вдалося надіслати. Спробуйте пізніше.');
}

// CHATBOT
const BR={'взяти':'Обери тварину в каталозі, натисни "Хочу взяти" і заповни форму 🐾','донат':'Приймаємо через Monobank, PrivatBank, PayPal та IBAN. Розділ "Допомогти шелтеру".','задонатити':'Приймаємо через Monobank, PrivatBank, PayPal та IBAN.','волонтер':'Виїзди, перетримка, SMM, пошук родин. Напиши через Контакти.','шелтер':'Leroy Shelter в Обухівці, Дніпропетровщина. З 2024 року.','де':'Обухівка, Дніпропетровська область.','корм':'Сухий/вологий корм і ветпрепарати. Привезти або передати через волонтерів.'};
function toggleChat(){document.getElementById('chatbot').classList.toggle('open');}
function addMsg(t,w){const m=document.getElementById('cmsgs');const d=document.createElement('div');d.className='cmsg '+w;d.textContent=t;m.appendChild(d);m.scrollTop=m.scrollHeight;}
function sendChat(){const i=document.getElementById('cinp');const t=i.value.trim();if(!t)return;addMsg(t,'usr');i.value='';document.getElementById('cquick').style.display='none';setTimeout(()=>{const lo=t.toLowerCase();let r='Для деталей — Instagram @saveanimals_ukraine або Контакти 🐾';for(const[k,v]of Object.entries(BR)){if(lo.includes(k)){r=v;break;}}addMsg(r,'bot');},500);}
function quickMsg(t){document.getElementById('cinp').value=t;sendChat();}

// DONATE
const DI={'Monobank':{t:'Monobank банка',b:'Переказ на банку «Shelter Leroy».',r:[['📱','Посилання на банку'],['💬','Коментар: «Для тварин»'],['🤝','Дякуємо!']]},'PrivatBank':{t:'PrivatBank',b:'Картка організації.',r:[['💳','4149 xxxx xxxx xxxx'],['📄','Призначення: «Допомога шелтеру»']]},'PayPal':{t:'PayPal',b:'Для міжнародних донорів.',r:[['📧','saveanimals@org.ua'],['🌍','Будь-яка валюта']]},'IBAN':{t:'Банківський переказ',b:'Для юридичних осіб.',r:[['🏦','UA xx xxxx xxxx xxxx xxxx xxxx x'],['📋','ЄДРПОУ: xxxxxxxx']]}};
function showDonate(type){const d=DI[type];document.getElementById('mt').textContent=d.t;document.getElementById('mb').textContent=d.b;document.getElementById('mr').innerHTML=d.r.map(([i,t])=>`<div class="mrow"><span>${i}</span><span>${t}</span></div>`).join('');document.getElementById('dm').classList.add('open');}
function closeDonate(){document.getElementById('dm').classList.remove('open');}
document.getElementById('dm').addEventListener('click',function(e){if(e.target===this)closeDonate();});

// ── PUBLIC RENDERERS (data-driven sections) ──────────────
async function renderAnimalsPublic(){ await fetchAnimals(); renderAnimals('all'); }

function teamCard(t){
  const ph=t.photo?`<img src="${t.photo}" alt="${esc(t.name)}">`:'';
  return`<div class="tcard"><div class="tphoto">${ph}</div><div class="tbody"><div class="tname">${esc(t.name)}</div><div class="trole">${esc(t.role||'')}</div><p class="tdesc">${esc(t.descr||'')}</p></div></div>`;
}
function renderTeamPublic(){
  const g=document.getElementById('team-grid');
  if(g) g.innerHTML=team.map(teamCard).join('');
}

function encCell(e){
  const cls=e.status==='occ'?' occ':e.status==='nof'?' nof':'';
  const span=e.span===2?' style="grid-column:span 2"':'';
  const code=e.code?`<span class="vn">#${esc(e.code)}</span>`:'';
  return`<div class="vcell${cls}"${span}>${code}${esc(e.occupant||'')}</div>`;
}
function renderSchemePublic(){
  const top=document.getElementById('scm-top'), bottom=document.getElementById('scm-bottom');
  if(!top||!bottom) return;
  top.innerHTML=enclosures.filter(e=>e.block==='top').map(encCell).join('');
  bottom.innerHTML=enclosures.filter(e=>e.block==='bottom').map(encCell).join('');
  const occ=enclosures.filter(e=>e.status==='occ').length;
  const emp=enclosures.filter(e=>e.status==='empty'&&e.code).length;
  const nof=enclosures.filter(e=>e.status==='nof').length;
  const s=document.getElementById('scm-summary');
  if(s) s.textContent=`Зайнято: ${occ} · Порожніх: ${emp} · Не функціонує: ${nof}`;
}

function applySettings(){
  document.querySelectorAll('[data-setting]').forEach(el=>{
    const v=settings[el.getAttribute('data-setting')];
    if(v!==undefined&&v!=='') el.textContent=v;
  });
}

// INIT
fetchAnimals().then(()=>renderAnimals('all'));
fetchTeam().then(renderTeamPublic);
fetchEnclosures().then(renderSchemePublic);
fetchSettings().then(applySettings);
if(authToken){ document.getElementById('nav-admin').classList.add('visible'); }

// Override animalCard to support i18n


// ══ LOCALIZATION ══════════════════════════════════════════
let currentLang = 'uk';

const T = {
  uk: {
    home:'Головна', animals:'Наші тварини', shelter:'Наш шелтер',
    team:'Суперкоманда', mission:'Про нас', help:'Допомогти',
    silentfront:'Тихий фронт', evacuation:'Евакуація', contacts:'Контакти', admin:'Адмін',
    navsub:'Другий шанс на безпечне життя для евакуйованих тварин',
    adopt_tag:'Наші підопічні',
    adopt_h:'Подаруй шанс<br>на справжнє<br>життя',
    adopt_p:'Кожен з наших підопічних пережив евакуацію, стрес і страх. Вони заслуговують на справжній дім — теплий, безпечний і наповнений любов\'ю.',
    adopt_btn:'Всі тварини шелтеру →',
    ms_tag:'Місія та візія шелтеру',
    ms_h:'Їхній порятунок —<br>питання людяності<br>навіть у найважчі часи',
    ms_p:'ГО «Захист тварин України» з 2022 року рятує тварин з прифронтових зон. З 2024-го діє Leroy Shelter — безпечне місце для евакуйованих собак і котів.',
    mv:['Людяність|Допомога тим, хто не може попросити самостійно','Гуманне ставлення|Тільки терпіння, любов і фахова допомога','Безперервна робота|Виїзди в 5 областях попри небезпеку','Нові родини|2 800+ тварин вже знайшли свій дім'],
    hero_h:'ТИХИЙ<br>ФРОНТ<br>ВОЛОНТЕРСТВА',
    hero_p:'Захист і порятунок тварин, які постраждали від війни. Евакуація, лікування та пошук нових родин.',
    hero_b:['Наші тварини','Допомогти','Евакуація'],
    anim_tag:'Наші підопічні', anim_h:'Вони чекають<br>на тебе',
    anim_p:'Кожен з них пережив евакуацію і заслуговує на справжній дім.',
    f_all:'Всі', f_dog:'Собаки', f_cat:'Коти', f_sh:'В шелтері', f_fo:'На перетримці',
    dog:'Собака', cat:'Кіт', male:'♂ Хлопець', female:'♀ Дівчина',
    s_shelter:'В шелтері', s_foster:'На перетримці', s_adopted:'Прилаштований',
    adopt_dog:'Хочу взяти пса', adopt_cat:'Хочу взяти кота',
    team_tag:'Наші волонтери', team_h:'Супер<br>команда',
    team_p:'Вони доглядають, лікують, соціалізують і знаходять нові родини для кожного підопічного шелтеру.',
    team_cta_h:'Доєднатись до команди?',
    team_cta_p:'Якщо тобі не байдуже, якщо хочеш бути поруч — ми чекаємо. Досвід не потрібен, потрібне серце.',
    team_cta_btn:'Написати нам',
    shelter_tag:'Наш шелтер', shelter_h:'Leroy Shelter',
    shelter_p1:'З літа 2024 року працює центр перетримки «Leroy Shelter» — безпечне місце для евакуйованих собак з Донеччини та Дніпропетровщини.',
    shelter_p2:'Тут тварини отримують безпеку, догляд і шанс знайти нову родину. Шелтер в Обухівці, Дніпропетровська обл.',
    shelter_btn1:'Схема вольєрів', shelter_btn2:'Допомогти шелтеру',
    sc1_t:'Безпека', sc1_p:'Захищене місце подалі від зони бойових дій. Закриті вольєри, охорона, цілодобовий нагляд.',
    sc2_t:'Догляд', sc2_p:'Щоденне годування, ветеринарна допомога, соціалізація та прогулянки. Кожна тварина під наглядом.',
    sc3_t:'Нова родина', sc3_p:'Активна робота з пошуку постійних господарів. Публікації, заходи, Telegram-канал.',
    miss_tag:'Про нас', miss_h:'Захист і порятунок тварин',
    miss_q:'«Їхній порятунок — питання людяності навіть у найважчі часи. Ми — їхній голос там, де більше нікого немає.»',
    miss_b1h:'Хто ми', miss_b1p:'ГО «Захист тварин України» — волонтерська організація з березня 2022 року.',
    miss_b2h:'Наша місія', miss_b2p:'Забезпечити безпеку, медичну допомогу та нові домівки для тварин, що постраждали від війни.',
    miss_b3h:'Географія', miss_b3p:'Регулярні евакуації з Донецької, Херсонської, Запорізької, Харківської та Сумської областей.',
    miss_b4h:'Цінності', miss_b4p:'Людяність, гуманне ставлення, допомога тим, хто не може попросити сам.',
    about_tag:'Про організацію', about_h:'ГО «Захист<br>тварин України»',
    about_p:'З березня 2022 року ми працюємо з тваринами, які постраждали внаслідок воєнних дій.',
    tl_tag:'Хронологія', tl_h:'Як ми зростали',
    vals_tag:'Наші цінності', vals_h:'Філософія емпатії',
    sf_tag:'Тихий фронт', sf_h:'Тихий фронт<br>волонтерства',
    sf_p:'Захист і порятунок тварин у війні — це невидима, але критично важлива робота.',
    sf_btn:'Підтримати місію',
    evac_tag:'Евакуація тварин', evac_h:'Евакуація —<br>це не просто<br>перевезення',
    evac_p:'Безпека, логістика, медицина та тимчасове розміщення. Комплексна робота у прифронтових зонах.',
    evac_req_tag:'Запит на евакуацію', evac_req_h:'Потрібна евакуація<br>тварини?',
    evac_req_p:'Якщо ваша тварина або тварини знайомих перебувають у небезпечному районі — залиш заявку.',
    evac_req_btn:'Надіслати запит на евакуацію',
    help_tag:'Долучитись', help_h:'Допоможи<br>тваринам',
    help_p:'Кожна гривня рятує життя. Кожна година волонтерства — це надія.',
    ct_tag:'Зв\'язатись з нами', ct_h:'Контакти',
    ct_p:'Маєш питання, хочеш взяти тварину або стати волонтером? Напиши.',
    ct_form_h:'Написати нам',
    ct_lbl1:'Ваше ім\'я', ct_ph1:'Олена Шевченко',
    ct_lbl2:'Телефон або Email', ct_ph2:'+380 xx xxx xx xx або email@gmail.com',
    ct_lbl3:'Тема', ct_lbl4:'Повідомлення', ct_ph4:'Розкажіть більше...',
    ct_btn:'Надіслати повідомлення',
    partners:'Партнери та підтримка',
    chat_name:'ПОМІЧНИК ШЕЛТЕРУ', chat_sub:'Відповідаємо на питання',
    chat_ph:'Напишіть питання...', chat_lbl:'Написати нам',
    footer_desc:'Волонтерський притулок для евакуйованих тварин. Частина ГО «Захист тварин України».',
    footer_loc:'Обухівка, Дніпропетровська обл. · з 2024 року',
    footer_copy:'© 2024 Shelter Leroy · ГО «Захист тварин України»',
    footer_made:'Зроблено з ❤️ волонтерами',
    scm_tag:'Схема шелтеру', scm_h:'Карта вольєрів',
    scm_p:'Актуальна схема розміщення тварин у шелтері Leroy',
    leg_occ:'Зайнятий', leg_emp:'Порожній', leg_nof:'Не функціонує',

    adopt_title:'Подаруй шанс<br>на справжнє<br>життя',
    adopt_desc:"Кожен з наших підопічних пережив евакуацію, стрес і страх. Вони заслуговують на справжній дім — теплий, безпечний і наповнений любов'ю.",
    anim_title:'Вони чекають<br>на тебе',
    ct_title:'Контакти',
    filter_all:'Всі',
    hero_title:'ТИХИЙ<br>ФРОНТ<br>ВОЛОНТЕРСТВА',
    hero_sub:'Захист і порятунок тварин, які постраждали від війни. Евакуація, лікування та пошук нових родин.',
    ms_body:'ГО «Захист тварин України» з 2022 року рятує тварин з прифронтових зон. З 2024-го діє Leroy Shelter — безпечне місце для евакуйованих собак і котів.',
    ms_title:'Їхній порятунок —<br>питання людяності<br>навіть у найважчі часи',
    nav_sub:'Другий шанс на безпечне життя для евакуйованих тварин',
    partners_label:'Партнери та підтримка',
    team_title:'Супер<br>команда',
    miss_tag:'Про нас',

    val1_h:'Людяність',val1_p:'Порятунок тварин — питання людяності навіть у найважчі часи.',
    val2_h:'Гуманне ставлення',val2_p:'Жодного насильства. Тільки терпіння, любов і фахова допомога.',
    val3_h:'Допомога без слів',val3_p:'Тварини не можуть попросити самі. Ми — їхній голос.',
  },
  en: {
    home:'Home', animals:'Our Animals', shelter:'Our Shelter',
    team:'Super Team', mission:'About Us', help:'Help Us',
    silentfront:'Silent Front', evacuation:'Evacuation', contacts:'Contacts', admin:'Admin',
    navsub:'A second chance at a safe life for evacuated animals',
    adopt_tag:'Our Residents',
    adopt_h:'Give a chance<br>at a real<br>life',
    adopt_p:'Every one of our animals survived evacuation, stress and fear. They deserve a real home — warm, safe and full of love.',
    adopt_btn:'All shelter animals →',
    ms_tag:'Mission & Vision',
    ms_h:'Their rescue is<br>a matter of humanity<br>even in the hardest times',
    ms_p:'Save Animals Ukraine has been rescuing animals from frontline areas since 2022. Since 2024, Leroy Shelter has been a safe haven for evacuated dogs and cats.',
    mv:['Humanity|Help for those who cannot ask on their own','Humane care|Only patience, love and professional help','Non-stop work|Missions in 5 regions despite the danger','New families|2 800+ animals have already found their home'],
    hero_h:'THE SILENT<br>FRONT OF<br>VOLUNTEERING',
    hero_p:'Protection and rescue of animals affected by war. Evacuation, treatment and finding new families.',
    hero_b:['Our Animals','Help Us','Evacuation'],
    anim_tag:'Our Residents', anim_h:'They are waiting<br>for you',
    anim_p:'Each of them survived evacuation and deserves a real home.',
    f_all:'All', f_dog:'Dogs', f_cat:'Cats', f_sh:'In Shelter', f_fo:'In Foster',
    dog:'Dog', cat:'Cat', male:'♂ Male', female:'♀ Female',
    s_shelter:'In Shelter', s_foster:'In Foster', s_adopted:'Adopted',
    adopt_dog:'I want this dog', adopt_cat:'I want this cat',
    team_tag:'Our Volunteers', team_h:'Super<br>Team',
    team_p:'They care for, treat, socialise and find new families for every shelter resident.',
    team_cta_h:'Join the team?',
    team_cta_p:'If you care and want to be part of this — we are waiting. No experience needed, just a big heart.',
    team_cta_btn:'Contact us',
    shelter_tag:'Our Shelter', shelter_h:'Leroy Shelter',
    shelter_p1:'Since summer 2024, the Leroy Shelter has operated as a safe haven for evacuated dogs from Donetsk and Dnipropetrovsk regions.',
    shelter_p2:'Animals here receive safety, care and a chance to find a new family. Located in Obuhivka, Dnipropetrovsk region.',
    shelter_btn1:'Enclosure map', shelter_btn2:'Help the shelter',
    sc1_t:'Safety', sc1_p:'A protected place far from the combat zone. Enclosed kennels, security, 24/7 supervision.',
    sc2_t:'Care', sc2_p:'Daily feeding, veterinary care, socialisation and walks. Every animal is supervised.',
    sc3_t:'New family', sc3_p:'Active search for permanent owners. Posts, events, Telegram channel.',
    miss_tag:'About Us', miss_h:'Protection & rescue of animals',
    miss_q:'"Their rescue is a matter of humanity even in the hardest times. We are their voice where no one else is left."',
    miss_b1h:'Who we are', miss_b1p:'Save Animals Ukraine NGO — a volunteer organisation since March 2022.',
    miss_b2h:'Our mission', miss_b2p:'To provide safety, medical care and new homes for animals affected by war.',
    miss_b3h:'Geography', miss_b3p:'Regular evacuations from Donetsk, Kherson, Zaporizhzhia, Kharkiv and Sumy regions.',
    miss_b4h:'Values', miss_b4p:'Humanity, humane treatment, help for those who cannot ask themselves.',
    about_tag:'About the NGO', about_h:'Save Animals<br>Ukraine NGO',
    about_p:'Since March 2022 we have been working with animals affected by the war.',
    tl_tag:'Timeline', tl_h:'How we grew',
    vals_tag:'Our values', vals_h:'Philosophy of empathy',
    sf_tag:'Silent Front', sf_h:'The silent front<br>of volunteering',
    sf_p:'Protecting and rescuing animals in war is invisible but critically important work.',
    sf_btn:'Support the mission',
    evac_tag:'Animal evacuation', evac_h:'Evacuation is<br>more than just<br>transportation',
    evac_p:'Safety, logistics, medicine and temporary shelter. Complex work in frontline areas.',
    evac_req_tag:'Evacuation request', evac_req_h:'Need an animal<br>evacuated?',
    evac_req_p:'If your animal or a friend\'s animal is in a dangerous area — submit a request.',
    evac_req_btn:'Submit evacuation request',
    help_tag:'Get Involved', help_h:'Help<br>the animals',
    help_p:'Every hryvnia saves a life. Every hour of volunteering is hope.',
    ct_tag:'Get in touch', ct_h:'Contacts',
    ct_p:'Have a question, want to adopt or volunteer? Write to us.',
    ct_form_h:'Write to us',
    ct_lbl1:'Your name', ct_ph1:'Jane Smith',
    ct_lbl2:'Phone or Email', ct_ph2:'+380 xx xxx xx xx or email@gmail.com',
    ct_lbl3:'Subject', ct_lbl4:'Message', ct_ph4:'Tell us more...',
    ct_btn:'Send message',
    partners:'Partners & Support',
    chat_name:'SHELTER ASSISTANT', chat_sub:'Answering your questions',
    chat_ph:'Type your question...', chat_lbl:'Contact us',
    footer_desc:'A volunteer shelter for evacuated animals. Part of Save Animals Ukraine NGO.',
    footer_loc:'Obuhivka, Dnipropetrovsk region · since 2024',
    footer_copy:'© 2024 Shelter Leroy · Save Animals Ukraine NGO',
    footer_made:'Made with ❤️ by volunteers',
    scm_tag:'Shelter map', scm_h:'Enclosure map',
    scm_p:'Current layout of animals in Leroy Shelter',
    leg_occ:'Occupied', leg_emp:'Empty', leg_nof:'Non-functional',
    adopt_title:'Give a chance<br>at a real<br>life',
    adopt_desc:'Every one of our animals survived evacuation, stress and fear. They deserve a real home — warm, safe and full of love.',
    anim_title:'They are waiting<br>for you',
    ct_title:'Contacts',
    filter_all:'All',
    hero_title:'THE SILENT<br>FRONT OF<br>VOLUNTEERING',
    hero_sub:'Protection and rescue of animals affected by war. Evacuation, treatment and finding new families.',
    ms_body:'Save Animals Ukraine has been rescuing animals from frontline areas since 2022. Since 2024, Leroy Shelter has been a safe haven for evacuated dogs and cats.',
    ms_title:'Their rescue is<br>a matter of humanity<br>even in the hardest times',
    nav_sub:'A second chance at a safe life for evacuated animals',
    partners_label:'Partners & Support',
    team_title:'Super<br>Team',
    miss_tag:'About Us',

    val1_h:'Humanity',val1_p:'Rescuing animals is a matter of humanity even in the hardest times.',
    val2_h:'Humane care',val2_p:'No violence. Only patience, love and professional help.',
    val3_h:'Help without words',val3_p:'Animals cannot ask for themselves. We are their voice.',

  }
};

function setLang(lang) {
  currentLang = lang;
  const L = T[lang];

  // Toggle buttons
  document.getElementById('btn-uk').classList.toggle('active', lang==='uk');
  document.getElementById('btn-en').classList.toggle('active', lang==='en');
  document.title = lang==='uk'
    ? 'Shelter Leroy — для евакуйованих тварин'
    : 'Shelter Leroy — for evacuated animals';

  // ── Universal: update ALL data-i18n elements ────────────
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = L[key];
    if (val === undefined) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else {
      el.innerHTML = val;
    }
  });

  // ── Nav links (by ID) ────────────────────────────────────
  ['home','animals','shelter','team','mission','help','silentfront','evacuation','contacts','admin'].forEach(k => {
    const e = document.getElementById('nav-' + k);
    if (e && L[k]) e.textContent = L[k];
  });

  // ── Mission strip values (dynamic markup) ────────────────
  document.querySelectorAll('.mv-text').forEach((el, i) => {
    if (!L.mv || !L.mv[i]) return;
    const [s, sp] = L.mv[i].split('|');
    const strong = el.querySelector('strong'), span = el.querySelector('span');
    if (strong) strong.textContent = s;
    if (span) span.textContent = sp;
  });

  // ── Mission page blocks ───────────────────────────────────
  const mbKeys = [['miss_b1h','miss_b1p'],['miss_b2h','miss_b2p'],
                  ['miss_b3h','miss_b3p'],['miss_b4h','miss_b4p']];
  document.querySelectorAll('.mb').forEach((b, i) => {
    if (!mbKeys[i]) return;
    const h2 = b.querySelector('h2'), p = b.querySelector('p');
    if (h2 && L[mbKeys[i][0]]) h2.textContent = L[mbKeys[i][0]];
    if (p && L[mbKeys[i][1]]) p.textContent = L[mbKeys[i][1]];
  });

  // ── Hero buttons ─────────────────────────────────────────
  const hBtns = document.querySelectorAll('.hero-btns a');
  (L.hero_b || []).forEach((t, i) => { if (hBtns[i]) hBtns[i].textContent = t; });

  // ── Shelter card texts ───────────────────────────────────
  const scKeys = [['sc1_t','sc1_p'],['sc2_t','sc2_p'],['sc3_t','sc3_p']];
  document.querySelectorAll('.shelt-card').forEach((c, i) => {
    if (!scKeys[i]) return;
    const t = c.querySelector('.shelt-card-t'), p = c.querySelector('p');
    if (t && L[scKeys[i][0]]) t.textContent = L[scKeys[i][0]];
    if (p && L[scKeys[i][1]]) p.textContent = L[scKeys[i][1]];
  });

  // ── About page timeline (static) — leave as-is ──────────

  // ── Val cards ────────────────────────────────────────────
  const valKeys = [['val1_h','val1_p'],['val2_h','val2_p'],['val3_h','val3_p']];
  document.querySelectorAll('.val-card').forEach((c, i) => {
    if (!valKeys[i]) return;
    const h3 = c.querySelector('h3'), p = c.querySelector('p');
    if (h3 && L[valKeys[i][0]]) h3.textContent = L[valKeys[i][0]];
    if (p && L[valKeys[i][1]]) p.textContent = L[valKeys[i][1]];
  });

  // ── Contacts form labels/placeholders ────────────────────
  const ctLabels = document.querySelectorAll('.ct-form .fg label');
  [L.ct_lbl1, L.ct_lbl2, L.ct_lbl3, L.ct_lbl4].forEach((v, i) => {
    if (ctLabels[i] && v) ctLabels[i].textContent = v;
  });
  const ctInputs = document.querySelectorAll('.ct-form input, .ct-form textarea');
  [L.ct_ph1, L.ct_ph2, L.ct_ph4].forEach((v, i) => {
    if (ctInputs[i] && v) ctInputs[i].placeholder = v;
  });
  const ctSel = document.querySelector('.ct-form select');
  // Leave select options — add topic options
  if (ctSel && lang === 'en') {
    ctSel.options[0].text = 'I want to adopt an animal';
    ctSel.options[1].text = 'Volunteering';
    ctSel.options[2].text = 'Donation / Partnership';
    ctSel.options[3].text = 'Animal evacuation';
    ctSel.options[4].text = 'Other';
  } else if (ctSel) {
    ctSel.options[0].text = 'Хочу взяти тварину';
    ctSel.options[1].text = 'Волонтерство';
    ctSel.options[2].text = 'Донат / партнерство';
    ctSel.options[3].text = 'Евакуація тварини';
    ctSel.options[4].text = 'Інше';
  }

  // ── Chat ─────────────────────────────────────────────────
  const chatN = document.querySelector('.chead-n'); if (chatN) chatN.textContent = L.chat_name;
  const chatS = document.querySelector('.chead-s'); if (chatS) chatS.textContent = L.chat_sub;
  const chatI = document.getElementById('cinp'); if (chatI) chatI.placeholder = L.chat_ph;
  const chatLbl = document.querySelector('.cbub-label'); if (chatLbl) chatLbl.textContent = L.chat_lbl;

  // ── Re-render animal cards ───────────────────────────────
  const grid = document.getElementById('animals-grid');
  if (grid && grid.children.length > 0) renderAnimals('all');

  // ── Filter button labels ─────────────────────────────────
  const fbKeys = ['f_all','f_dog','f_cat','f_sh','f_fo'];
  document.querySelectorAll('.fb').forEach((b, i) => {
    if (L[fbKeys[i]]) b.textContent = L[fbKeys[i]];
  });
}

// Override animalCard to use currentLang
function animalCard(a) {
  const L=T[currentLang];
  const sL={shelter:L.s_shelter,foster:L.s_foster,adopted:L.s_adopted};
  const sC={shelter:'ss',foster:'sf',adopted:'sa'};
  const typeLabel = a.type==='dog' ? L.dog : L.cat;
  const genderLabel = a.gender==='м' ? L.male : L.female;
  const adoptTxt = a.type==='cat' ? L.adopt_cat : L.adopt_dog;
  const ph=a.photo
    ?`<img src="${rp(a.photo)}" alt="${a.name}" onerror="this.style.display='none'">`
    :`<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:56px;">${a.type==='dog'?'🐕':'🐈'}</div>`;
  return`<div class="acard">
    <div class="aphoto">${ph}</div>
    <div class="abody">
      <div class="aname">${a.name}</div>
      <div class="metarow">
        <span class="chip">${typeLabel}</span>
        <span class="chip">${genderLabel}</span>
        <span class="chip">${a.age}</span>
      </div>
      ${a.breed?`<div style="font-size:12px;color:var(--GD);margin-bottom:8px;">${a.breed}</div>`:''}
      <span class="sbadge ${sC[a.status]}">${sL[a.status]}</span>
      ${a.status!=='adopted'?`<button class="abtn" onclick="adoptClick('${a.name}')">${adoptTxt}</button>`:''}
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════
   ▓▓▓ MODERNIZATION JS — v2 ▓▓▓
═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // ── 1. NAV scroll shrink ─────────────────────────────────
  const nav = document.querySelector('nav');
  let lastY = 0;
  function onScroll(){
    const y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 30);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // ── 2. Auto-tag elements for reveal ──────────────────────
  function tagReveals(root){
    root = root || document;
    const sel = [
      '.h1', '.desc', '.tag', '.btn-k', '.btn-y', '.btn-ol',
      '.ac', '.acard', '.tcard', '.shelt-card', '.evs', '.evst',
      '.pcard', '.hcard', '.vcard', '.hfcard', '.evz', '.sfst',
      '.mv', '.tli', '.mb', '.sf-slide', '.sf-slide-rev',
      '.partners-label', '.adm-form', '.ev-ri li',
      '.miss-big', '.miss-q', '.ms-title', '.ms-body',
      '.shelt-card-t', '.evs-t', '.evs-n',
      '.ci', '.fcol'
    ].join(',');
    root.querySelectorAll(sel).forEach((el,i)=>{
      if (el.hasAttribute('data-reveal')) return;
      el.setAttribute('data-reveal','');
      // stagger inside grids by parent index of siblings
      const idx = [...el.parentElement.children].indexOf(el);
      if (idx >= 0 && idx < 6) el.setAttribute('data-d', String(idx+1));
    });
    // h1 special anim on the one currently in active page
    document.querySelectorAll('.page.active .h1').forEach(h=>{
      h.classList.add('h1-anim');
    });
  }

  // ── 3. IntersectionObserver for reveal + counters ───────
  let io;
  function initObserver(){
    if (io) io.disconnect();
    io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (e.isIntersecting){
          e.target.classList.add('in');
          // counters
          if (e.target.matches('.sfst-n, .evst-n, .evs-n')){
            animateCounter(e.target);
          }
          io.unobserve(e.target);
        }
      });
    }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});

    document.querySelectorAll('[data-reveal], .sfst, .evst, .sfst-n, .evst-n').forEach(el=>{
      io.observe(el);
    });
  }

  // ── 4. Counter animator ─────────────────────────────────
  function animateCounter(el){
    if (el.dataset.counted) return;
    const raw = el.textContent.trim();
    const m = raw.match(/^(\d[\d\s]*)(.*)$/);
    if (!m) return;
    const target = parseInt(m[1].replace(/\s/g,''),10);
    if (isNaN(target) || target < 5) return;
    const suffix = m[2] || '';
    el.dataset.counted = '1';
    const dur = 1400;
    const start = performance.now();
    function tick(now){
      const t = Math.min(1,(now-start)/dur);
      const eased = 1 - Math.pow(1-t,3);
      const val = Math.round(target * eased);
      el.textContent = val.toLocaleString('uk-UA').replace(/,/g,' ') + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = m[1] + suffix;
    }
    el.textContent = '0' + suffix;
    requestAnimationFrame(tick);
  }

  // ── 5. Partner marquee duplication ───────────────────────
  function setupMarquee(){
    const grid = document.querySelector('.partners-grid');
    if (!grid || grid.dataset.dup) return;
    grid.dataset.dup = '1';
    const html = grid.innerHTML;
    grid.innerHTML = html + html; // duplicate for seamless loop
  }

  // ── 6. Card mouse-follow glow ────────────────────────────
  function setupGlow(){
    document.querySelectorAll('.pcard, .hcard, .vcard').forEach(card=>{
      if (card.dataset.glow) return;
      card.dataset.glow = '1';
      card.addEventListener('mousemove',(e)=>{
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX-r.left)/r.width*100)+'%');
        card.style.setProperty('--my', ((e.clientY-r.top)/r.height*100)+'%');
      });
    });
  }

  // ── 7. Hero image entrance ───────────────────────────────
  function heroLoad(){
    const hero = document.querySelector('.hero-r');
    if (!hero) return;
    setTimeout(()=>hero.classList.add('loaded'), 150);
  }

  // ── 8. Magnetic buttons (subtle) ─────────────────────────
  function setupMagnet(){
    document.querySelectorAll('.btn-k, .btn-y, .btn-ol, .fsub').forEach(btn=>{
      if (btn.dataset.mag) return;
      btn.dataset.mag = '1';
      btn.addEventListener('mousemove',(e)=>{
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width/2) * .15;
        const y = (e.clientY - r.top - r.height/2) * .15;
        btn.style.transform = `translate(${x}px, ${y}px) translateY(-3px)`;
      });
      btn.addEventListener('mouseleave',()=>{
        btn.style.transform = '';
      });
    });
  }

  // ── Hero slideshow ───────────────────────────────────────
  function setupHeroSlides(){
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const numEl = document.getElementById('hero-num');
    if (!slides.length) return;
    let idx = 0;
    function go(i){
      idx = (i + slides.length) % slides.length;
      slides.forEach((s,n)=>s.classList.toggle('active', n===idx));
      dots.forEach((d,n)=>d.classList.toggle('active', n===idx));
      if (numEl) numEl.textContent = String(idx+1).padStart(2,'0');
    }
    dots.forEach(d=>d.addEventListener('click',()=>{go(parseInt(d.dataset.idx,10));resetTimer();}));
    let t = setInterval(()=>go(idx+1), 5000);
    function resetTimer(){clearInterval(t);t=setInterval(()=>go(idx+1),5000);}
  }

  // ── Banner counters (data-target) ────────────────────────
  function setupBannerCounters(){
    const io2 = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (!e.isIntersecting) return;
        const el = e.target;
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        const target = parseInt(el.dataset.target,10);
        const dur = 1600, start = performance.now();
        function tick(now){
          const t = Math.min(1,(now-start)/dur);
          const eased = 1 - Math.pow(1-t,3);
          el.textContent = Math.round(target*eased).toLocaleString('uk-UA').replace(/,/g,' ');
          if (t<1) requestAnimationFrame(tick);
          else el.textContent = target.toLocaleString('uk-UA').replace(/,/g,' ');
        }
        requestAnimationFrame(tick);
        el.closest('.sb-item') && el.closest('.sb-item').classList.add('in');
        io2.unobserve(el);
      });
    },{threshold:.4});
    document.querySelectorAll('[data-target]').forEach(el=>io2.observe(el));
  }

  // ── 9. Subtle parallax on hero images ────────────────────
  function setupParallax(){
    const imgs = document.querySelectorAll('.hero-r-img img');
    window.addEventListener('scroll',()=>{
      const y = window.scrollY;
      if (y > 700) return;
      imgs.forEach(img=>{
        img.style.transform = `scale(1.04) translateY(${y * .08}px)`;
      });
    }, {passive:true});
  }

  // ── 10. Smooth scrollbar ─────────────────────────────────
  const css = document.createElement('style');
  css.textContent = `
    ::-webkit-scrollbar{width:10px;height:10px;}
    ::-webkit-scrollbar-track{background:rgba(13,13,13,.04);}
    ::-webkit-scrollbar-thumb{background:rgba(13,13,13,.25);border-radius:10px;border:2px solid transparent;background-clip:content-box;}
    ::-webkit-scrollbar-thumb:hover{background:var(--K);background-clip:content-box;}
  `;
  document.head.appendChild(css);

  // ── Page-switch hook ─────────────────────────────────────
  const origShow = window.showPage;
  if (typeof origShow === 'function'){
    window.showPage = function(n){
      origShow(n);
      requestAnimationFrame(()=>{
        // Remove existing reveals tags & h1-anim, re-init for new page
        document.querySelectorAll('.h1-anim').forEach(el=>el.classList.remove('h1-anim','in'));
        document.querySelectorAll('[data-reveal]').forEach(el=>el.classList.remove('in'));
        tagReveals();
        initObserver();
        setupGlow();
        setupMagnet();
      });
    };
  }

  // ── Image error fallback (unsplash blocked in some envs) ─
  function setupImgFallback(){
    document.querySelectorAll('img').forEach(img=>{
      if (img.dataset.fb) return;
      img.dataset.fb = '1';
      const swap = ()=>{
        const p = img.parentElement;
        if (!p) return;
        p.style.background = 'linear-gradient(135deg,#e8e5df 0%,#c4c0b8 100%)';
        p.style.position = p.style.position || 'relative';
        img.style.opacity = '0';
        if (!p.querySelector('.img-fb')){
          const ph = document.createElement('div');
          ph.className = 'img-fb';
          ph.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:11px;color:#6b6860;letter-spacing:1px;text-transform:uppercase;background-image:repeating-linear-gradient(45deg,transparent 0 12px,rgba(13,13,13,.04) 12px 14px);';
          ph.textContent = '◐ photo';
          p.appendChild(ph);
        }
      };
      if (img.complete && img.naturalWidth === 0) swap();
      img.addEventListener('error', swap);
    });
  }

  // ── Init ─────────────────────────────────────────────────
  function init(){
    setupImgFallback();
    setupHeroSlides();
    setupBannerCounters();
    tagReveals();
    setupMarquee();
    setupGlow();
    setupMagnet();
    heroLoad();
    setupParallax();
    initObserver();
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-tag when animals grid renders
  const grid = document.getElementById('animals-grid');
  if (grid){
    new MutationObserver(()=>{
      tagReveals(grid);
      grid.querySelectorAll('.acard').forEach(el=>io && io.observe(el));
    }).observe(grid,{childList:true});
  }
})();

/* ═══════════════════════════════════════════════════════════
   ▓▓▓ EDITABLE CONTENT (CMS layer) ▓▓▓
═══════════════════════════════════════════════════════════ */

// ── Public renderers (bilingual; pick by currentLang) ──────
function pick(o,base){ return o[base+'_'+currentLang]||o[base+'_uk']||''; }

function nl2br(s){ return esc(s).replace(/\n/g,'<br>'); }
function renderStats(){
  const el=document.getElementById('sf-stats'); if(!el)return;
  el.innerHTML=collections.stat.map(s=>`<div class="sfst"><div class="sfst-n">${esc(s.value||'')}</div><div class="sfst-l">${esc(pick(s,'label'))}</div></div>`).join('');
}
function renderEvacStats(){
  const el=document.getElementById('ev-stats-grid'); if(!el)return;
  el.innerHTML=collections.evac_stat.map(s=>`<div class="evst"><div class="evst-n">${esc(s.value||'')}</div><div class="evst-l">${nl2br(pick(s,'label'))}</div></div>`).join('');
}
function renderPartners(){
  const el=document.getElementById('partners-grid'); if(!el)return;
  el.innerHTML=collections.partner.map(p=>`<div class="pcard"><h3>${esc(pick(p,'title'))}</h3><p>${esc(pick(p,'text'))}</p></div>`).join('');
}
function renderEvacSteps(){
  const el=document.getElementById('evs-grid'); if(!el)return;
  el.innerHTML=collections.evac_step.map(s=>`<div class="evs"><div class="evs-n">${esc(s.num||'')}</div><div class="evs-t">${esc(pick(s,'title'))}</div><p>${esc(pick(s,'text'))}</p></div>`).join('');
}
function renderChatQuick(){
  const q=document.getElementById('cquick'); if(!q)return;
  q.innerHTML=collections.chat.filter(c=>pick(c,'quick')).map(c=>`<button class="cqb" onclick="quickChat(${c.id})">${esc(pick(c,'quick'))}</button>`).join('');
}
function renderDynamic(){ renderStats(); renderEvacStats(); renderPartners(); renderEvacSteps(); renderChatQuick(); }

// ── Chatbot (data-driven, bilingual) — overrides earlier stubs ──
function chatReplyFor(text){
  const lo=text.toLowerCase();
  for(const it of collections.chat){ if(it.keyword && lo.includes(String(it.keyword).toLowerCase())) return pick(it,'reply'); }
  return currentLang==='en'
    ? 'For details — Instagram @saveanimals_ukraine or the Contacts page 🐾'
    : 'Для деталей — Instagram @saveanimals_ukraine або сторінка Контакти 🐾';
}
function sendChat(){
  const i=document.getElementById('cinp'); const t=i.value.trim(); if(!t)return;
  addMsg(t,'usr'); i.value='';
  const q=document.getElementById('cquick'); if(q)q.style.display='none';
  setTimeout(()=>addMsg(chatReplyFor(t),'bot'),450);
}
function quickMsg(t){ const i=document.getElementById('cinp'); if(i)i.value=t; sendChat(); }
function quickChat(id){
  const it=collections.chat.find(c=>c.id===id); if(!it)return;
  addMsg(pick(it,'quick'),'usr');
  const q=document.getElementById('cquick'); if(q)q.style.display='none';
  setTimeout(()=>addMsg(pick(it,'reply'),'bot'),450);
}

// ── Apply text overrides + photo overrides ─────────────────
function mergeTextOverrides(){
  Object.entries(settings).forEach(([k,v])=>{
    const m=k.match(/^t:(uk|en):(.+)$/);
    if(m && v!=='') T[m[1]][m[2]]=v;
  });
}
function applyPhotos(){
  document.querySelectorAll('[data-photo]').forEach(img=>{
    const v=settings['photo_'+img.getAttribute('data-photo')];
    if(v) img.src=v;
  });
}

// Re-render dynamic content whenever language changes.
const _setLangBase=setLang;
setLang=function(l){ _setLangBase(l); renderDynamic(); };

async function loadContent(){
  await Promise.all([fetchSettings(),fetchCollection('stat'),fetchCollection('evac_stat'),fetchCollection('partner'),fetchCollection('evac_step'),fetchCollection('chat')]);
  mergeTextOverrides();
  applyPhotos();
  applySettings();
  setLang(currentLang);
}
loadContent();

/* ─────────────── ADMIN: texts ─────────────── */
const TEXT_GROUPS=[
  {h:'Hero (головна)',keys:[['hero_title','Заголовок'],['hero_sub','Підзаголовок']]},
  {h:'Блок «Подаруй шанс»',keys:[['adopt_title','Заголовок'],['adopt_desc','Опис']]},
  {h:'Місія (головна)',keys:[['ms_title','Заголовок'],['ms_body','Текст']]},
  {h:'Сторінка «Про нас»',keys:[['miss_q','Цитата'],['miss_b1h','Блок 1 — заголовок'],['miss_b1p','Блок 1 — текст'],['miss_b2h','Блок 2 — заголовок'],['miss_b2p','Блок 2 — текст'],['miss_b3h','Блок 3 — заголовок'],['miss_b3p','Блок 3 — текст'],['miss_b4h','Блок 4 — заголовок'],['miss_b4p','Блок 4 — текст']]},
  {h:'Шелтер',keys:[['shelter_p1','Абзац 1'],['shelter_p2','Абзац 2']]},
  {h:'Евакуація',keys:[['evac_h','Заголовок'],['evac_p','Текст'],['evac_req_h','Форма — заголовок'],['evac_req_p','Форма — текст']]},
  {h:'Футер',keys:[['footer_desc','Опис'],['footer_loc','Локація']]},
];
function renderTextsAdmin(){
  const host=document.getElementById('adm-sec-texts');
  let html='<div class="adm-form"><h3>Тексти сайту (українською / англійською)</h3><p style="color:var(--GD);font-size:13px;margin-bottom:14px;">Теги на кшталт &lt;br&gt; можна залишати — вони працюють як перенос рядка.</p>';
  TEXT_GROUPS.forEach(g=>{
    html+=`<div style="margin:20px 0 6px;font-weight:800;color:var(--K);text-transform:uppercase;font-size:13px;letter-spacing:.5px;">${g.h}</div>`;
    g.keys.forEach(([k,label])=>{
      html+=`<div class="g2"><div class="fg"><label>${label} (UA)</label><textarea id="txt-${k}-uk">${esc(T.uk[k]||'')}</textarea></div><div class="fg"><label>${label} (EN)</label><textarea id="txt-${k}-en">${esc(T.en[k]||'')}</textarea></div></div>`;
    });
  });
  html+='<button class="add-btn" onclick="saveTexts()">Зберегти всі тексти</button></div>';
  host.innerHTML=html;
}
async function saveTexts(){
  const body={};
  TEXT_GROUPS.forEach(g=>g.keys.forEach(([k])=>{
    body['t:uk:'+k]=document.getElementById('txt-'+k+'-uk').value;
    body['t:en:'+k]=document.getElementById('txt-'+k+'-en').value;
  }));
  const r=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){ adminFail(r); return; }
  await fetchSettings(); mergeTextOverrides(); setLang(currentLang);
  alert('✅ Тексти збережено');
}

/* ─────────────── ADMIN: photos ─────────────── */
const PHOTO_SLOTS=[['hero1','Hero — слайд 1'],['hero2','Hero — слайд 2'],['hero3','Hero — слайд 3'],['hero4','Hero — слайд 4'],['shelter','Фото шелтеру'],['about','Фото «Про нас»'],['sf_hero','Тихий фронт — фото']];
function currentPhotoSrc(slot){ const img=document.querySelector('[data-photo="'+slot+'"]'); return img?img.getAttribute('src'):''; }
function renderPhotosAdmin(){
  const host=document.getElementById('adm-sec-photos');
  host.innerHTML='<div class="adm-form"><h3>Фото сайту</h3>'+PHOTO_SLOTS.map(([slot,label])=>
    `<div class="fg" style="border-bottom:1px solid #eee;padding-bottom:16px;margin-bottom:16px;"><label>${label}</label>
      <img src="${currentPhotoSrc(slot)}" style="max-width:180px;max-height:120px;border-radius:4px;display:block;margin:6px 0 10px;object-fit:cover;background:#eee;">
      <input type="file" id="photo-${slot}" accept="image/*">
      <button class="add-btn" style="margin-top:10px;" onclick="uploadPhoto('${slot}')">Завантажити нове</button></div>`
  ).join('')+'</div>';
}
async function uploadPhoto(slot){
  const f=document.getElementById('photo-'+slot).files[0];
  if(!f){ alert('Оберіть файл'); return; }
  const fd=new FormData(); fd.append('photofile',f);
  const r=await api('/upload',{method:'POST',body:fd});
  if(!r.ok){ adminFail(r); return; }
  const {url}=await r.json();
  const r2=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({['photo_'+slot]:url})});
  if(!r2.ok){ adminFail(r2); return; }
  await fetchSettings(); applyPhotos(); renderPhotosAdmin();
  alert('✅ Фото оновлено');
}

/* ─────────────── ADMIN: collections (generic) ─────────────── */
const COL_SCHEMA={
  stat:{heading:'Лічильники «Тихий фронт»',fields:[['value','Число','in'],['label_uk','Підпис (UA)','in'],['label_en','Підпис (EN)','in']],cols:['value','label_uk']},
  evac_stat:{heading:'Цифри на сторінці «Евакуація»',fields:[['value','Число','in'],['label_uk','Підпис (UA, новий рядок = перенос)','area'],['label_en','Підпис (EN, новий рядок = перенос)','area']],cols:['value','label_uk']},
  partner:{fields:[['title_uk','Назва (UA)','in'],['title_en','Назва (EN)','in'],['text_uk','Опис (UA)','area'],['text_en','Опис (EN)','area']],cols:['title_uk','title_en']},
  evac_step:{fields:[['num','№','in'],['title_uk','Заголовок (UA)','in'],['title_en','Заголовок (EN)','in'],['text_uk','Текст (UA)','area'],['text_en','Текст (EN)','area']],cols:['num','title_uk']},
  chat:{fields:[['keyword','Ключове слово','in'],['quick_uk','Кнопка (UA)','in'],['quick_en','Кнопка (EN)','in'],['reply_uk','Відповідь (UA)','area'],['reply_en','Відповідь (EN)','area']],cols:['keyword','quick_uk']},
};
const COL_SEC={stat:'stats',evac_stat:'stats',partner:'partners',evac_step:'evac',chat:'chat'};
function colHeader(kind,c){ const f=COL_SCHEMA[kind].fields.find(x=>x[0]===c); return f?f[1]:c; }
function colFormHTML(kind){
  const s=COL_SCHEMA[kind];
  const fields=s.fields.map(([f,label,type])=>type==='area'
    ?`<div class="fg"><label>${label}</label><textarea id="col-${kind}-${f}"></textarea></div>`
    :`<div class="fg"><label>${label}</label><input type="text" id="col-${kind}-${f}"></div>`).join('');
  const heading=s.heading?`<div style="margin:6px 0 14px;font-weight:800;color:var(--K);text-transform:uppercase;font-size:14px;letter-spacing:.5px;">${s.heading}</div>`:'';
  return heading+`<div class="adm-form" style="margin-bottom:28px;">
    <h3 id="col-${kind}-title">Новий запис</h3>
    <input type="hidden" id="col-${kind}-id">
    ${fields}
    <div class="fg"><label>Порядок</label><input type="number" id="col-${kind}-sort"></div>
    <button class="add-btn" onclick="saveCol('${kind}')">Зберегти</button>
    <button class="del-btn" id="col-${kind}-cancel" style="margin-left:8px;display:none;" onclick="resetColForm('${kind}')">Скасувати</button>
  </div>
  <table class="adm-table"><thead><tr>${s.cols.map(c=>'<th>'+colHeader(kind,c)+'</th>').join('')}<th>Дії</th></tr></thead><tbody id="coltb-${kind}"></tbody></table>`;
}
async function renderColAdmin(kind){
  const sec=document.getElementById('adm-sec-'+COL_SEC[kind]);
  let wrap=document.getElementById('colwrap-'+kind);
  if(!wrap){ wrap=document.createElement('div'); wrap.id='colwrap-'+kind; wrap.innerHTML=colFormHTML(kind); sec.appendChild(wrap); }
  await fetchCollection(kind);
  const s=COL_SCHEMA[kind];
  document.getElementById('coltb-'+kind).innerHTML=collections[kind].map(it=>
    `<tr>${s.cols.map(c=>'<td>'+esc(it[c]||'')+'</td>').join('')}<td><button class="edit-btn" onclick="editCol('${kind}',${it.id})">Редагувати</button><button class="del-btn" onclick="delCol('${kind}',${it.id})">Видалити</button></td></tr>`
  ).join('')||`<tr><td colspan="${s.cols.length+1}" style="color:var(--GD);padding:20px;">Поки порожньо</td></tr>`;
}
function editCol(kind,id){
  const it=collections[kind].find(x=>x.id===id); if(!it)return;
  document.getElementById('col-'+kind+'-id').value=it.id;
  COL_SCHEMA[kind].fields.forEach(([f])=>{document.getElementById('col-'+kind+'-'+f).value=it[f]||'';});
  document.getElementById('col-'+kind+'-sort').value=it.sort||0;
  document.getElementById('col-'+kind+'-title').textContent='Редагувати запис';
  document.getElementById('col-'+kind+'-cancel').style.display='';
  document.getElementById('adm-sec-'+COL_SEC[kind]).scrollIntoView({behavior:'smooth',block:'start'});
}
function resetColForm(kind){
  document.getElementById('col-'+kind+'-id').value='';
  COL_SCHEMA[kind].fields.forEach(([f])=>{document.getElementById('col-'+kind+'-'+f).value='';});
  document.getElementById('col-'+kind+'-sort').value='';
  document.getElementById('col-'+kind+'-title').textContent='Новий запис';
  document.getElementById('col-'+kind+'-cancel').style.display='none';
}
async function saveCol(kind){
  const id=document.getElementById('col-'+kind+'-id').value;
  const body={sort:document.getElementById('col-'+kind+'-sort').value||'0'};
  COL_SCHEMA[kind].fields.forEach(([f])=>{body[f]=document.getElementById('col-'+kind+'-'+f).value;});
  const r=await api('/collections/'+kind+(id?'/'+id:''),{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){ adminFail(r); return; }
  resetColForm(kind);
  await renderColAdmin(kind);
  await refreshPublicCollection(kind);
}
async function delCol(kind,id){
  if(!confirm('Видалити?'))return;
  const r=await api('/collections/'+kind+'/'+id,{method:'DELETE'});
  if(!r.ok){ adminFail(r); return; }
  await renderColAdmin(kind);
  await refreshPublicCollection(kind);
}
async function refreshPublicCollection(kind){
  await fetchCollection(kind);
  ({stat:renderStats,evac_stat:renderEvacStats,partner:renderPartners,evac_step:renderEvacSteps,chat:renderChatQuick}[kind]||(()=>{}))();
}

