const STORAGE_KEY = 'workhub-checkpoint-05';

const users = [
  { id: 'u1', name: 'Alson Chen', initials: 'AC', role: 'Executive', email: 'alson@company.mv' },
  { id: 'u2', name: 'Sarah Kim', initials: 'SK', role: 'Project Lead', email: 'sarah@company.mv' },
  { id: 'u3', name: 'Alex Noor', initials: 'AN', role: 'Engineer', email: 'alex@company.mv' },
  { id: 'u4', name: 'Mika Ross', initials: 'MR', role: 'Designer', email: 'mika@company.mv' },
  { id: 'u5', name: 'Emma Davis', initials: 'ED', role: 'QA Engineer', email: 'emma@company.mv' },
];

const projects = [
  { id: 'p1', key: 'AQUA', name: 'AquaDesk', description: 'Resort excursions and activity booking & operations system for Maldives.', status: 'Active', progress: 68, color: '#18b8a3', lead: 'u2', members: ['u1','u2','u3','u4','u5'], due: 'Oct 31, 2026' },
  { id: 'p2', key: 'SV', name: 'SignVeli', description: 'Global e-signature and document workflow SaaS.', status: 'Active', progress: 61, color: '#8b5cf6', lead: 'u1', members: ['u1','u3','u4'], due: 'Nov 18, 2026' },
  { id: 'p3', key: 'AIB', name: 'AIB Portal', description: 'CA Maldives Accountants in Business registration portal.', status: 'Active', progress: 89, color: '#e6a62b', lead: 'u3', members: ['u1','u3','u5'], due: 'Oct 24, 2026' },
  { id: 'p4', key: 'PMS', name: 'Internal PMS', description: 'Company project management and agent orchestration platform.', status: 'Planning', progress: 42, color: '#4f6cf7', lead: 'u1', members: ['u1','u2','u3','u4','u5'], due: 'Nov 30, 2026' },
];

const seedIssues = [
  { id:'i1', key:'AQUA-1', projectId:'p1', type:'Epic', title:'Improve Booking Experience', description:'Improve the full guest booking experience from discovery through confirmation.', status:'In Progress', priority:'High', assignee:'u2', reporter:'u1', parentId:null, due:'Oct 30, 2026', progress:65 },
  { id:'i2', key:'AQUA-11', projectId:'p1', type:'User Story', title:'Streamline Guest Booking Flow', description:'Create a clearer and faster booking journey for resort guests.', status:'In Progress', priority:'High', assignee:'u2', reporter:'u1', parentId:'i1', due:'Oct 25, 2026', progress:60, story:{asA:'resort guest', want:'to be able to book activities through a simple and beautiful flow', soThat:'I can quickly reserve my preferred excursions without manual requests'} },
  { id:'i3', key:'AQUA-111', projectId:'p1', type:'Task', title:'Create booking form UI', description:'Create a modern and responsive booking form for guests to select activities, date, number of participants and additional requirements.', status:'In Progress', priority:'High', assignee:'u2', reporter:'u3', parentId:'i2', due:'Oct 20, 2026', progress:80 },
  { id:'i4', key:'AQUA-111-1', projectId:'p1', type:'Sub-task', title:'Design form layout', description:'Define field groupings, interaction states and responsive layout.', status:'Done', priority:'Medium', assignee:'u4', reporter:'u2', parentId:'i3', due:'Oct 18, 2026', progress:100 },
  { id:'i5', key:'AQUA-111-2', projectId:'p1', type:'Sub-task', title:'Implement form UI', description:'Build the booking form UI with validation states.', status:'In Progress', priority:'High', assignee:'u3', reporter:'u2', parentId:'i3', due:'Oct 20, 2026', progress:70 },
  { id:'i6', key:'AQUA-112', projectId:'p1', type:'Task', title:'Implement availability check', description:'Connect the booking flow to live availability rules.', status:'To Do', priority:'Medium', assignee:'u3', reporter:'u2', parentId:'i2', due:'Oct 22, 2026', progress:20 },
  { id:'i7', key:'AQUA-112-1', projectId:'p1', type:'Sub-task', title:'Integrate inventory API', description:'Read inventory and capacity before allowing booking confirmation.', status:'To Do', priority:'Medium', assignee:'u3', reporter:'u2', parentId:'i6', due:'Oct 21, 2026', progress:0 },
  { id:'i8', key:'AQUA-112-2', projectId:'p1', type:'Sub-task', title:'Handle edge cases', description:'Handle sold-out, partially available, and late-changing inventory.', status:'To Do', priority:'Medium', assignee:'u5', reporter:'u2', parentId:'i6', due:'Oct 22, 2026', progress:0 },
  { id:'i9', key:'AQUA-113', projectId:'p1', type:'Task', title:'Send booking confirmation', description:'Send a confirmation event and present a useful success state.', status:'Done', priority:'Low', assignee:'u3', reporter:'u2', parentId:'i2', due:'Oct 23, 2026', progress:100 },
  { id:'i10', key:'AQUA-12', projectId:'p1', type:'User Story', title:'Guest Management', description:'Keep guest records and booking context easy to understand.', status:'To Do', priority:'Medium', assignee:'u5', reporter:'u1', parentId:'i1', due:'Oct 28, 2026', progress:15, story:{asA:'resort staff member', want:'to see a guest profile and recent booking context', soThat:'I can serve the guest without switching between disconnected screens'} },
  { id:'i11', key:'AQUA-2', projectId:'p1', type:'Epic', title:'Marine Operations', description:'Weather, dive, fleet and equipment operations.', status:'In Progress', priority:'High', assignee:'u3', reporter:'u1', parentId:null, due:'Nov 15, 2026', progress:20 },
  { id:'i12', key:'AQUA-21', projectId:'p1', type:'User Story', title:'Weather Intelligence', description:'Give operations staff a clear marine weather picture.', status:'In Review', priority:'High', assignee:'u3', reporter:'u1', parentId:'i11', due:'Oct 26, 2026', progress:75, story:{asA:'marine operations staff member', want:'a reliable weather status for each activity window', soThat:'I can make safer dispatch decisions'} },
  { id:'i13', key:'AQUA-211', projectId:'p1', type:'Task', title:'Integrate OpenWeather API', description:'Normalize the provider weather response into the product status model.', status:'In Review', priority:'Medium', assignee:'u3', reporter:'u1', parentId:'i12', due:'Oct 24, 2026', progress:88 },
  { id:'i14', key:'AQUA-22', projectId:'p1', type:'User Story', title:'Fleet and Gear Management', description:'Track available vessels and equipment accurately.', status:'To Do', priority:'High', assignee:'u5', reporter:'u1', parentId:'i11', due:'Nov 7, 2026', progress:10, story:{asA:'operations coordinator', want:'one reliable view of fleet and gear availability', soThat:'I can allocate resources without conflicting counts'} },
  { id:'i15', key:'AQUA-3', projectId:'p1', type:'Epic', title:'Staff & Resource Management', description:'Staff assignment, roster and operational resources.', status:'To Do', priority:'Medium', assignee:'u2', reporter:'u1', parentId:null, due:'Nov 20, 2026', progress:0 },
  { id:'i16', key:'AQUA-4', projectId:'p1', type:'Epic', title:'Reporting & Analytics', description:'Operational and management reporting.', status:'To Do', priority:'Low', assignee:'u1', reporter:'u1', parentId:null, due:'Nov 30, 2026', progress:0 },

  { id:'s1', key:'SV-82', projectId:'p2', type:'Task', title:'Approver review consistency', description:'Keep the approver view aligned with the sealed document.', status:'In Review', priority:'High', assignee:'u1', reporter:'u3', parentId:null, due:'Oct 17, 2026', progress:90 },
  { id:'s2', key:'SV-91', projectId:'p2', type:'Task', title:'Templates workflow polish', description:'Polish the template creation and use flow.', status:'In Progress', priority:'Medium', assignee:'u4', reporter:'u1', parentId:null, due:'Oct 21, 2026', progress:62 },
  { id:'a1', key:'AIB-12', projectId:'p3', type:'Task', title:'Fix upload validation issue', description:'Ensure latest employee template uploads validate correctly.', status:'In Progress', priority:'High', assignee:'u3', reporter:'u1', parentId:null, due:'Oct 18, 2026', progress:65 },
  { id:'pms1', key:'PMS-7', projectId:'p4', type:'Task', title:'Create activity tracking', description:'Persist project and issue activity as auditable events.', status:'To Do', priority:'High', assignee:'u1', reporter:'u1', parentId:null, due:'Oct 23, 2026', progress:15 },
];

const seedNotes = [
  { id:'n1', issueId:'i3', author:'u2', created:'2 days ago', label:'Design', title:'Form Requirements', body:'• Support different activity types (dive, snorkel, sunset, etc.)\n• Date and time selection\n• Number of participants\n• Guest details (auto-fill if logged in)\n• Special requirements field' },
  { id:'n2', issueId:'i3', author:'u3', created:'Yesterday', label:'Technical', title:'Implementation Approach', body:'• Use the existing component library\n• Ensure mobile responsiveness\n• Integrate with availability API (AQUA-112)' },
  { id:'n3', issueId:'i2', author:'u1', created:'3 days ago', label:'Product', title:'Keep this frictionless', body:'The guest should understand the next step without needing staff guidance. Avoid an overly long wizard unless the activity truly needs it.' },
];

const seedComments = [
  { id:'c1', issueId:'i3', author:'u5', created:'4 hours ago', body:'Should we show activity images on the form? It may make the experience easier to scan.' },
  { id:'c2', issueId:'i3', author:'u2', created:'2 hours ago', body:'Yes, but keep them compact on desktop and make sure the mobile flow stays fast.' },
];

const seedAttachments = [
  { id:'f1', issueId:'i2', name:'guest-booking-flow.pdf', size:'2.4 MB', type:'PDF', created:'Yesterday', author:'u2' },
  { id:'f2', issueId:'i3', name:'booking-form-reference.png', size:'860 KB', type:'Image', created:'4 hours ago', author:'u4' },
];

const seedActivity = [
  { id:'ac1', projectId:'p1', issueId:'i3', actor:'u2', action:'changed status', detail:'AQUA-111 · To Do → In Progress', time:'12 min ago' },
  { id:'ac2', projectId:'p1', issueId:'i13', actor:'u3', action:'moved issue to review', detail:'AQUA-211 · Integrate OpenWeather API', time:'31 min ago' },
  { id:'ac3', projectId:'p2', issueId:'s1', actor:'u1', action:'updated issue', detail:'SV-82 · Approver review consistency', time:'1 hr ago' },
  { id:'ac4', projectId:'p1', issueId:'i9', actor:'u3', action:'completed issue', detail:'AQUA-113 · Send booking confirmation', time:'2 hrs ago' },
  { id:'ac5', projectId:'p3', issueId:'a1', actor:'u5', action:'commented', detail:'AIB-12 · Fix upload validation issue', time:'3 hrs ago' },
  { id:'ac6', projectId:'p1', issueId:'i2', actor:'u1', action:'added note', detail:'AQUA-11 · Streamline Guest Booking Flow', time:'5 hrs ago' },
  { id:'ac7', projectId:'p4', issueId:'pms1', actor:'u1', action:'created issue', detail:'PMS-7 · Create activity tracking', time:'Yesterday' },
];

const allowedChildren = {
  'Epic': ['User Story'],
  'User Story': ['Task'],
  'Task': ['Sub-task'],
  'Sub-task': [],
};

const state = loadState();
let ui = {
  signedIn: new URLSearchParams(location.search).get('demo') === '1',
  page: 'dashboard',
  projectId: 'p1',
  projectTab: 'issues',
  selectedIssueId: 'i3',
  detailTab: 'details',
  modal: null,
  modalParentId: null,
  collapsed: new Set(),
  toast: [],
  role: 'Executive',
};
const qp = new URLSearchParams(location.search);
if (qp.get('page')) ui.page = qp.get('page');
if (qp.get('tab')) ui.projectTab = qp.get('tab');

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && saved.issues) return saved;
  } catch(e){}
  return {
    issues: structuredClone(seedIssues),
    notes: structuredClone(seedNotes),
    comments: structuredClone(seedComments),
    attachments: structuredClone(seedAttachments),
    activity: structuredClone(seedActivity),
  };
}

function persist(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function user(id){ return users.find(u=>u.id===id) || users[0]; }
function project(id){ return projects.find(p=>p.id===id) || projects[0]; }
function issue(id){ return state.issues.find(i=>i.id===id); }
function initials(name){ return name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(); }
function esc(str=''){ return String(str).replace(/[&<>'"]/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[s])); }
function dateNow(){ return 'Just now'; }

function icon(name){
  const paths = {
    dashboard:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    projects:'<path d="M4 5.5h6l2 2h8v11H4z"/><path d="M4 8h16"/>',
    work:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    inbox:'<path d="M4 5h16v13H4z"/><path d="M4 13h4l2 3h4l2-3h4"/>',
    team:'<circle cx="9" cy="9" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M4 20c0-3 2-5 5-5s5 2 5 5M14 15c3 0 5 1.8 5 4.5"/>',
    reports:'<path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.7-1.7.9-1.9-2.2-2.2-1.9.9-1.7-.7L10.5 2h-3l-.7 2.1-1.7.7-1.9-.9L1 6.1 1.9 8l-.7 1.7L-1 10.5v3l2.2.7.7 1.7-.9 1.9L3.2 20l1.9-.9 1.7.7.7 2.2h3l.7-2.2 1.7-.7 1.9.9 2.2-2.2-.9-1.9.7-1.7z" transform="translate(2 0) scale(.85)"/>',
    crown:'<path d="M4 7l4 4 4-7 4 7 4-4-2 11H6z"/><path d="M7 21h10"/>',
    search:'<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    bell:'<path d="M6 17h12l-1.5-2v-4a4.5 4.5 0 0 0-9 0v4z"/><path d="M10 20h4"/>',
    chevron:'<path d="M9 6l6 6-6 6"/>',
    down:'<path d="M6 9l6 6 6-6"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    paperclip:'<path d="M8 12.5l6.5-6.5a3 3 0 1 1 4.2 4.2L10.2 18.7a5 5 0 0 1-7.1-7.1l8.1-8.1"/>',
    note:'<path d="M5 3h11l3 3v15H5z"/><path d="M16 3v4h4M8 11h8M8 15h8"/>',
    comment:'<path d="M4 5h16v11H9l-5 4z"/>',
    activity:'<path d="M4 12h4l2-6 4 12 2-6h4"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
    layout:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M9 10h12"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 14v6h14v-6"/>',
    arrow:'<path d="M5 12h14M14 7l5 5-5 5"/>',
  };
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.more}</svg>`;
}

function avatar(id, size='sm'){
  const u = user(id);
  return `<span class="avatar ${size}">${esc(u.initials)}</span>`;
}
function avatars(ids){ return `<div class="avatar-stack">${ids.slice(0,4).map(id=>avatar(id,'xs')).join('')}${ids.length>4?`<span class="avatar xs">+${ids.length-4}</span>`:''}</div>`; }

function statusPill(status){
  const map={'To Do':'gray','In Progress':'blue','In Review':'yellow','Done':'green','Planning':'purple','Active':'green','On Hold':'yellow','Completed':'green'};
  return `<span class="pill ${map[status]||'gray'}">${esc(status)}</span>`;
}
function priorityPill(p){
  const map={Highest:'red',High:'red',Medium:'yellow',Low:'teal',Lowest:'gray'};
  return `<span class="pill ${map[p]||'gray'}">${esc(p||'Medium')}</span>`;
}
function typePill(type){
  const map={'Epic':'purple','User Story':'teal','Task':'blue','Sub-task':'gray'};
  return `<span class="pill ${map[type]||'gray'}">${esc(type)}</span>`;
}
function typeClass(type){ return {'Epic':'type-epic','User Story':'type-story','Task':'type-task','Sub-task':'type-subtask'}[type] || 'type-task'; }
function typeGlyph(type){ return {'Epic':'E','User Story':'S','Task':'T','Sub-task':'•'}[type] || 'T'; }
function progressBar(p){ return `<div class="progress"><span style="width:${Math.max(0,Math.min(100,p||0))}%"></span></div>`; }

function root(){ return document.getElementById('app'); }
function render(){
  root().innerHTML = ui.signedIn ? renderApp() : renderLogin();
  bind();
}

function renderLogin(){
  return `<div class="login-screen">
    <section class="login-pane">
      <div class="login-box">
        <div class="login-logo"><span class="brand-mark">W</span><span>workhub</span></div>
        <h1>Welcome back.</h1>
        <p>One place for projects, people, decisions and progress. Sign in to continue to your workspace.</p>
        <form id="loginForm">
          <div class="field"><label>Work email</label><input id="loginEmail" type="email" value="executive@company.mv" required placeholder="name@company.mv"></div>
          <div class="field"><label>Password</label><input type="password" value="demo1234" required></div>
          <div class="login-row"><label class="checkbox"><input type="checkbox" checked> Keep me signed in</label><button type="button" class="quiet-btn">Forgot password?</button></div>
          <button class="primary-btn login-submit" type="submit">Sign in ${icon('arrow')}</button>
        </form>
        <div class="login-foot">Prototype checkpoint: authentication is visual only. Production handoff should connect this screen to the company identity provider or chosen auth service and apply server-side RBAC.</div>
      </div>
    </section>
    <section class="login-showcase">
      <div>
        <div class="showcase-card">
          <div class="showcase-top"><span class="showcase-dot"></span><span class="showcase-dot"></span><span class="showcase-dot"></span><strong style="margin-left:8px;font-size:10px">AquaDesk / Issues</strong></div>
          <div class="showcase-body">
            <h3>Project hierarchy that stays understandable.</h3>
            <div class="mini-tree">
              <div class="mini-row"><span class="type-icon type-epic">E</span><strong>Improve Booking Experience</strong><span style="margin-left:auto">65%</span></div>
              <div class="mini-row"><span class="type-icon type-story">S</span><strong>Streamline Guest Booking Flow</strong><span style="margin-left:auto">60%</span></div>
              <div class="mini-row"><span class="type-icon type-task">T</span><strong>Create booking form UI</strong>${statusPill('In Progress')}</div>
              <div class="mini-row"><span class="type-icon type-subtask">•</span><strong>Implement form UI</strong>${priorityPill('High')}</div>
            </div>
          </div>
        </div>
        <div class="showcase-caption"><h2>Clarity from company level down to the smallest task.</h2><p>Move from executive portfolio health to a user story, note, attachment or activity entry without losing context.</p></div>
      </div>
    </section>
  </div>`;
}

function renderApp(){
  return `<div class="app-shell">${renderSidebar()}<main class="main">${renderTopbar()}<div class="content">${renderPage()}</div></main></div>${renderModal()}${renderToasts()}`;
}

function renderSidebar(){
  const nav = [
    ['dashboard','dashboard','Dashboard'],['projects','projects','Projects'],['mywork','work','My Work'],['inbox','inbox','Inbox'],['team','team','Team'],['reports','reports','Reports'],['executive','crown','Executive']
  ];
  return `<aside class="sidebar">
    <div class="brand"><span class="brand-mark">W</span><span>workhub</span><span style="margin-left:auto;color:#70809a">✦</span></div>
    <div class="sidebar-search">${icon('search')}<span>Search...</span><span style="margin-left:auto">⌘ K</span></div>
    <div class="nav-group">${nav.map(([page,ic,label])=>`<div class="nav-item ${ui.page===page?'active':''}" data-nav="${page}"><span class="icon">${icon(ic)}</span>${label}${page==='inbox'?'<span class="badge">3</span>':''}</div>`).join('')}</div>
    <div class="nav-group"><div class="nav-label">Projects</div>${projects.map(p=>`<div class="nav-item ${ui.page==='project'&&ui.projectId===p.id?'active':''}" data-project="${p.id}"><span class="project-dot" style="background:${p.color}">${p.key[0]}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span></div>`).join('')}<div class="nav-item" data-action="new-project"><span class="icon">${icon('plus')}</span>New Project</div></div>
    <div class="sidebar-bottom"><div class="profile-mini" id="profileMini">${avatar('u1')}<div class="profile-text"><strong>${esc(users[0].name)}</strong><span>${esc(ui.role)} · Cyber Security Maldives</span></div><span style="margin-left:auto;color:#718096">⋯</span></div></div>
  </aside>`;
}

function renderTopbar(){
  let crumb = ui.page==='project' ? `Projects / <strong>${esc(project(ui.projectId).name)}</strong>` : `<strong>${pageLabel(ui.page)}</strong>`;
  return `<header class="topbar"><div class="breadcrumb">${crumb}</div><div class="top-search">${icon('search')}<span>Search projects, issues, people...</span><span style="margin-left:auto">⌘ K</span></div><div class="top-actions"><button class="icon-btn" title="Notifications">${icon('bell')}</button><button class="primary-btn" data-action="new-issue">${icon('plus')} <span class="hide-mobile">New</span></button></div></header>`;
}
function pageLabel(p){ return ({dashboard:'Dashboard',projects:'Projects',mywork:'My Work',inbox:'Inbox',team:'Team',reports:'Reports',executive:'Executive Overview',project:'Project'})[p]||'Workspace'; }

function renderPage(){
  switch(ui.page){
    case 'dashboard': return renderDashboard();
    case 'projects': return renderProjects();
    case 'project': return renderProject();
    case 'mywork': return renderMyWork();
    case 'team': return renderTeam();
    case 'executive': return renderExecutive();
    case 'inbox': return renderInbox();
    case 'reports': return renderReports();
    default: return renderDashboard();
  }
}

function renderDashboard(){
  const mine = state.issues.filter(i=>i.assignee==='u1').slice(0,6);
  const active = projects.filter(p=>p.status==='Active').length;
  const due = state.issues.filter(i=>['High','Highest'].includes(i.priority) && i.status!=='Done').length;
  const done = state.issues.filter(i=>i.status==='Done').length;
  return `<div class="page-head"><div class="page-title"><h1>Good morning, Alson <span style="font-size:21px">👋</span></h1><p>Here’s what needs your attention across projects today.</p></div><div class="page-actions"><button class="secondary-btn" data-nav="mywork">My work</button><button class="primary-btn" data-action="new-issue">${icon('plus')} Create issue</button></div></div>
  <div class="stats-grid">
    ${statCard('Active projects',active,'2 moving quickly','projects')}
    ${statCard('Assigned to me',mine.length,'3 need attention','work')}
    ${statCard('High priority open',due,'Across all projects','activity')}
    ${statCard('Completed',done,'Recent checkpoint','dashboard')}
  </div>
  <div class="grid-2">
    <section class="card"><div class="card-header"><div><h3>My assigned work</h3><p>What you own right now</p></div><button class="quiet-btn" data-nav="mywork">View all</button></div><div class="table-wrap"><table><thead><tr><th>Issue</th><th>Title</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>${mine.map(i=>`<tr class="hoverable" data-open-issue="${i.id}"><td class="key">${i.key}</td><td class="issue-title">${esc(i.title)}</td><td>${priorityPill(i.priority)}</td><td>${statusPill(i.status)}</td><td class="${i.priority==='High'?'due-danger':''}">${esc(i.due||'—')}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="card"><div class="card-header"><div><h3>Recent activity</h3><p>Latest meaningful changes</p></div><button class="quiet-btn" data-nav="executive">Master log</button></div><div class="card-body">${activityList(state.activity.slice(0,6))}</div></section>
  </div>
  <section class="card"><div class="card-header"><div><h3>Active projects</h3><p>Portfolio snapshot</p></div><button class="quiet-btn" data-nav="projects">View all</button></div><div class="card-body"><div class="project-cards">${projects.map(projectCard).join('')}</div></div></section>`;
}

function statCard(label,value,foot,ic){ return `<div class="stat-card"><div class="stat-top"><span>${esc(label)}</span><span class="stat-icon">${icon(ic)}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${esc(foot)}</div></div>`; }
function projectCard(p){ return `<div class="project-card" data-project="${p.id}"><div class="project-card-head"><div class="project-identity"><div class="project-icon" style="background:${p.color}">${p.key[0]}</div><div style="min-width:0"><div class="project-name">${esc(p.name)}</div><div class="project-sub">${esc(p.description)}</div></div></div>${statusPill(p.status)}</div><div class="project-card-foot"><div style="flex:1">${progressBar(p.progress)}</div><strong style="font-size:10px">${p.progress}%</strong>${avatars(p.members)}</div></div>`; }
function activityList(list){ return `<div class="activity-list">${list.map(a=>{const u=user(a.actor); return `<div class="activity-item">${avatar(a.actor)}<div class="activity-copy"><strong>${esc(u.name)}</strong> ${esc(a.action)}<br><span class="key">${esc(a.detail)}</span></div><span class="activity-time">${esc(a.time)}</span></div>`;}).join('')}</div>`; }

function renderProjects(){
  return `<div class="page-head"><div class="page-title"><h1>Projects</h1><p>Manage all company initiatives from one clean portfolio view.</p></div><div class="page-actions"><button class="primary-btn" data-action="new-project">${icon('plus')} New project</button></div></div>
  <div class="toolbar"><input class="search" placeholder="Search projects..."><button class="filter-btn active">All projects</button><button class="filter-btn">Active</button><button class="filter-btn">Planning</button><button class="filter-btn">Completed</button></div>
  <section class="card"><div class="table-wrap"><table><thead><tr><th>Project</th><th>Status</th><th>Progress</th><th>Lead</th><th>Members</th><th>Target</th></tr></thead><tbody>${projects.map(p=>`<tr class="hoverable" data-project="${p.id}"><td><div class="project-identity"><div class="project-icon" style="background:${p.color}">${p.key[0]}</div><div><div class="project-name">${esc(p.name)}</div><div class="project-sub">${esc(p.description)}</div></div></div></td><td>${statusPill(p.status)}</td><td><div style="display:flex;align-items:center;gap:8px">${progressBar(p.progress)}<strong style="font-size:9px">${p.progress}%</strong></div></td><td><div style="display:flex;align-items:center;gap:7px">${avatar(p.lead,'xs')}${esc(user(p.lead).name)}</div></td><td>${avatars(p.members)}</td><td>${esc(p.due)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderProject(){
  const p = project(ui.projectId);
  const tabs=['overview','issues','board','timeline','files','team','activity'];
  return `<section class="project-hero"><div class="project-hero-main"><div class="project-logo">${p.key[0]}</div><div style="flex:1"><div style="display:flex;align-items:center;gap:8px"><h1>${esc(p.name)}</h1>${statusPill(p.status)}</div><p>${esc(p.description)}</p></div><button class="secondary-btn">Edit project</button><button class="icon-btn">${icon('more')}</button></div><div class="project-tabs">${tabs.map(t=>`<button class="tab ${ui.projectTab===t?'active':''}" data-project-tab="${t}">${titleCase(t)}</button>`).join('')}</div></section>${renderProjectTab()}`;
}
function titleCase(s){ return s.replace(/(^|\s|-)\S/g, x=>x.toUpperCase()); }
function renderProjectTab(){
  switch(ui.projectTab){
    case 'overview': return renderProjectOverview();
    case 'issues': return renderIssuesWorkspace();
    case 'board': return renderBoard();
    case 'timeline': return renderTimeline();
    case 'files': return renderFiles();
    case 'team': return renderProjectTeam();
    case 'activity': return renderProjectActivity();
    default: return renderIssuesWorkspace();
  }
}

function renderProjectOverview(){
  const p=project(ui.projectId), its=state.issues.filter(i=>i.projectId===p.id), done=its.filter(i=>i.status==='Done').length, overdue=its.filter(i=>i.status!=='Done'&&i.priority==='High').length;
  return `<div class="stats-grid">${statCard('Progress',p.progress+'%','Overall completion','activity')}${statCard('Total issues',its.length,'Across the hierarchy','projects')}${statCard('Completed',done,'Closed work','work')}${statCard('Needs attention',overdue,'High priority open','bell')}</div>
  <div class="grid-2"><section class="card"><div class="card-header"><div><h3>Project health</h3><p>What is moving and what needs attention</p></div></div><div class="card-body"><div class="health-list">${['Epic','User Story','Task','Sub-task'].map(type=>{const arr=its.filter(i=>i.type===type), d=arr.filter(i=>i.status==='Done').length, pc=arr.length?Math.round(d/arr.length*100):0; return `<div class="health-row"><div class="health-name"><strong>${type}</strong><span>${d} of ${arr.length} complete</span></div>${progressBar(pc)}<strong>${pc}%</strong><span></span></div>`}).join('')}</div></div></section><section class="card"><div class="card-header"><div><h3>Recent activity</h3><p>Changes inside ${esc(p.name)}</p></div></div><div class="card-body">${activityList(state.activity.filter(a=>a.projectId===p.id).slice(0,6))}</div></section></div>`;
}

function renderIssuesWorkspace(){
  return `<div class="toolbar"><input class="search" id="issueSearch" placeholder="Search issues..."><button class="filter-btn active">${icon('layout')} Hierarchy</button><button class="filter-btn">${icon('list')} List</button><button class="filter-btn">Type ▾</button><button class="filter-btn">Status ▾</button><button class="filter-btn">Assignee ▾</button><button class="primary-btn" data-action="new-issue" style="margin-left:auto">${icon('plus')} Add issue</button></div><div class="workspace"><section class="hierarchy-panel"><div class="hierarchy-head"><span>Title</span><span>Status</span><span>Assignee</span><span>Due date</span><span>Priority</span><span></span></div>${renderTree()}</section>${renderDetail()}</div>`;
}

function renderTree(){
  const roots=state.issues.filter(i=>i.projectId===ui.projectId && !i.parentId);
  return roots.map(r=>treeNode(r,0)).join('');
}
function treeNode(i,depth){
  const children=state.issues.filter(x=>x.parentId===i.id);
  const collapsed=ui.collapsed.has(i.id);
  return `<div class="tree-row ${ui.selectedIssueId===i.id?'selected':''}" data-open-issue="${i.id}" style="--depth:${depth}"><div class="tree-main">${children.length?`<button class="chev" data-collapse="${i.id}">${icon(collapsed?'chevron':'down')}</button>`:'<span class="chev"></span>'}<span class="type-icon ${typeClass(i.type)}">${typeGlyph(i.type)}</span><span class="tree-key">${esc(i.key)}</span><span class="tree-title">${esc(i.title)}</span>${typePill(i.type)}</div><div>${statusPill(i.status)}</div><div>${avatar(i.assignee,'xs')}</div><div class="tree-meta ${i.priority==='High'?'due-danger':''}">${esc(i.due||'—')}</div><div>${priorityPill(i.priority)}</div><button class="kebab" data-add-child="${i.id}" title="Add child">${icon('plus')}</button></div>${!collapsed?children.map(c=>treeNode(c,depth+1)).join(''):''}`;
}

function renderDetail(){
  const i=issue(ui.selectedIssueId) || state.issues.find(x=>x.projectId===ui.projectId);
  if(!i) return `<aside class="detail-panel"><div class="empty"><strong>Select an issue</strong>Open an item to see its details.</div></aside>`;
  const parent=i.parentId?issue(i.parentId):null;
  const counts={notes:state.notes.filter(n=>n.issueId===i.id).length,attachments:state.attachments.filter(n=>n.issueId===i.id).length,comments:state.comments.filter(n=>n.issueId===i.id).length,activity:state.activity.filter(n=>n.issueId===i.id).length,subtasks:state.issues.filter(n=>n.parentId===i.id).length};
  const tabs=['details','notes','attachments','comments','activity','subtasks'];
  return `<aside class="detail-panel"><div class="detail-head"><div class="detail-kicker"><span>${esc(project(i.projectId).name)}</span><span>/</span><span class="key">${esc(i.key)}</span></div><div class="detail-title-row"><h2>${esc(i.title)}</h2><button class="icon-btn" style="width:31px;height:31px">${icon('more')}</button></div><div class="detail-badges">${typePill(i.type)}${statusPill(i.status)}${priorityPill(i.priority)}${avatars([i.assignee,i.reporter])}</div></div><div class="detail-tabs">${tabs.map(t=>`<button class="tab ${ui.detailTab===t?'active':''}" data-detail-tab="${t}">${titleCase(t)}${counts[t]!==undefined?` <span style="color:#8c96a8">${counts[t]}</span>`:''}</button>`).join('')}</div><div class="detail-scroll">${renderDetailBody(i,parent)}</div></aside>`;
}

function renderDetailBody(i,parent){
  switch(ui.detailTab){
    case 'notes': return renderNotes(i);
    case 'attachments': return renderAttachments(i);
    case 'comments': return renderComments(i);
    case 'activity': return activityList(state.activity.filter(a=>a.issueId===i.id));
    case 'subtasks': return renderSubtasks(i);
    default: return renderIssueDetails(i,parent);
  }
}
function renderIssueDetails(i,parent){
  const story = i.type==='User Story' ? i.story : (parent?.type==='User Story'?parent.story:null);
  return `${story?`<div class="story-block"><div class="section-title" style="margin-top:0"><h4>${i.type==='User Story'?'User Story':'User Story (Parent)'}</h4>${parent?.type==='User Story'?`<button class="quiet-btn" data-open-issue="${parent.id}">Open</button>`:''}</div><div class="story-line"><span class="story-token">As a</span><span>${esc(story.asA)}</span></div><div class="story-line"><span class="story-token">I want</span><span>${esc(story.want)}</span></div><div class="story-line"><span class="story-token">So that</span><span>${esc(story.soThat)}</span></div></div>`:''}
  <div class="section-title"><h4>Description</h4><button class="quiet-btn" data-action="edit-issue">Edit</button></div><div class="description">${esc(i.description||'No description yet.')}</div>
  <div class="section-title"><h4>Fields</h4></div><div class="meta-grid"><span class="label">Assignee</span><span style="display:flex;align-items:center;gap:7px">${avatar(i.assignee,'xs')}${esc(user(i.assignee).name)}</span><span class="label">Reporter</span><span style="display:flex;align-items:center;gap:7px">${avatar(i.reporter,'xs')}${esc(user(i.reporter).name)}</span><span class="label">Status</span><span>${statusPill(i.status)}</span><span class="label">Priority</span><span>${priorityPill(i.priority)}</span><span class="label">Due date</span><span>${esc(i.due||'—')}</span><span class="label">Parent</span><span>${parent?`<button class="quiet-btn" data-open-issue="${parent.id}">${esc(parent.key)} · ${esc(parent.title)}</button>`:'—'}</span></div>
  <div class="section-title"><h4>Quick actions</h4></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="secondary-btn" data-detail-tab="notes">${icon('note')} Add note</button><button class="secondary-btn" data-detail-tab="attachments">${icon('paperclip')} Attach</button><button class="secondary-btn" data-detail-tab="comments">${icon('comment')} Comment</button>${allowedChildren[i.type]?.length?`<button class="primary-btn" data-add-child="${i.id}">${icon('plus')} Add ${allowedChildren[i.type][0]}</button>`:''}</div>`;
}
function renderNotes(i){
  const arr=state.notes.filter(n=>n.issueId===i.id);
  return `<div class="section-title" style="margin-top:0"><h4>Notes</h4><button class="primary-btn" data-action="add-note">${icon('plus')} Add note</button></div>${arr.length?arr.map(n=>`<div class="note-card"><div class="note-head">${avatar(n.author,'xs')}<strong>${esc(user(n.author).name)}</strong><span>${esc(n.created)}</span><span class="pill yellow" style="margin-left:auto">${esc(n.label||'Note')}</span></div><strong style="font-size:10px;display:block;margin-bottom:5px">${esc(n.title)}</strong><p>${esc(n.body)}</p></div>`).join(''):'<div class="empty"><strong>No notes yet</strong>Add context, decisions or implementation guidance.</div>'}`;
}
function renderAttachments(i){
  const arr=state.attachments.filter(a=>a.issueId===i.id);
  return `<div class="section-title" style="margin-top:0"><h4>Attachments</h4><label class="primary-btn" style="cursor:pointer">${icon('upload')} Attach file<input id="attachmentInput" type="file" hidden multiple></label></div>${arr.length?arr.map(a=>`<div class="attachment-row"><span class="file-icon">${icon('paperclip')}</span><div style="flex:1"><strong>${esc(a.name)}</strong><span>${esc(a.type)} · ${esc(a.size)} · ${esc(a.created)}</span></div><button class="kebab">${icon('more')}</button></div>`).join(''):'<div class="empty"><strong>No attachments</strong>Attach a file or reference to this issue.</div>'}<div class="description" style="margin-top:10px">Prototype stores attachment metadata only. Cursor handoff should connect this to durable object storage and authorized download URLs.</div>`;
}
function renderComments(i){
  const arr=state.comments.filter(c=>c.issueId===i.id);
  return `${arr.map(c=>`<div class="comment-card"><div class="comment-head">${avatar(c.author,'xs')}<strong>${esc(user(c.author).name)}</strong><span>${esc(c.created)}</span></div><p>${esc(c.body)}</p></div>`).join('')}<form id="commentForm"><div class="composer"><textarea id="commentText" placeholder="Write a comment..."></textarea></div><div style="display:flex;justify-content:flex-end;margin-top:7px"><button class="primary-btn">Post comment</button></div></form>`;
}
function renderSubtasks(i){
  const children=state.issues.filter(x=>x.parentId===i.id);
  return `<div class="section-title" style="margin-top:0"><h4>Children</h4>${allowedChildren[i.type]?.length?`<button class="primary-btn" data-add-child="${i.id}">${icon('plus')} Add ${allowedChildren[i.type][0]}</button>`:''}</div>${children.length?children.map(c=>`<div class="attachment-row" data-open-issue="${c.id}" style="cursor:pointer"><span class="type-icon ${typeClass(c.type)}">${typeGlyph(c.type)}</span><div style="flex:1"><strong>${esc(c.key)} · ${esc(c.title)}</strong><span>${esc(c.type)} · ${esc(user(c.assignee).name)}</span></div>${statusPill(c.status)}</div>`).join(''):'<div class="empty"><strong>No child issues</strong>This item has no children yet.</div>'}`;
}

function renderBoard(){
  const cols=['To Do','In Progress','In Review','Done'];
  const cards=state.issues.filter(i=>i.projectId===ui.projectId && ['Task','Sub-task'].includes(i.type));
  return `<div class="toolbar"><input class="search" placeholder="Search board..."><button class="filter-btn">Type ▾</button><button class="filter-btn">Assignee ▾</button><button class="filter-btn">Priority ▾</button><button class="primary-btn" data-action="new-issue" style="margin-left:auto">${icon('plus')} Add issue</button></div><div class="board">${cols.map(status=>{const arr=cards.filter(i=>i.status===status);return `<section class="board-col" data-status="${status}"><div class="board-head"><strong>${status}</strong><span class="board-count">${arr.length}</span></div><div class="board-drop" data-drop-status="${status}">${arr.map(boardCard).join('')}</div></section>`}).join('')}</div><div class="description" style="margin-top:10px">Drag cards between columns. The move updates issue status and writes an activity event.</div>`;
}
function boardCard(i){ return `<article class="board-card" draggable="true" data-drag-id="${i.id}" data-open-issue="${i.id}"><span class="key">${esc(i.key)}</span><h4>${esc(i.title)}</h4><div class="board-card-foot"><span>${priorityPill(i.priority)} ${typePill(i.type)}</span>${avatar(i.assignee,'xs')}</div></article>`; }

function renderTimeline(){
  const items=state.issues.filter(i=>i.projectId===ui.projectId).slice(0,10);
  return `<div class="toolbar"><button class="filter-btn active">Month</button><button class="filter-btn">Oct 2026</button><button class="filter-btn">Today</button></div><div class="timeline"><div class="timeline-grid"><div class="timeline-list">${items.map(i=>`<div class="timeline-row"><span class="type-icon ${typeClass(i.type)}">${typeGlyph(i.type)}</span><span class="key">${i.key}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.title)}</span></div>`).join('')}</div><div class="timeline-chart"><div class="today-line"></div><div class="today-label">Today</div>${items.map((i,idx)=>`<div class="timeline-bar ${i.type==='Epic'?'epic':''} ${i.status==='Done'?'done':''}" style="top:${13+idx*44}px;left:${8+(idx%5)*8}%;width:${Math.max(12,Math.min(40,(i.progress||25)/2.5))}%"></div>`).join('')}</div></div></div><div class="description" style="margin-top:10px">Checkpoint timeline is a visual scaffold. Cursor should later connect scheduling to real start/end dates and dependencies.</div>`;
}

function renderFiles(){
  const arr=state.attachments.filter(a=>issue(a.issueId)?.projectId===ui.projectId);
  return `<section class="card"><div class="card-header"><div><h3>Project files</h3><p>Attachments linked from work items</p></div></div><div class="card-body">${arr.map(a=>`<div class="attachment-row" data-open-issue="${a.issueId}" style="cursor:pointer"><span class="file-icon">${icon('paperclip')}</span><div style="flex:1"><strong>${esc(a.name)}</strong><span>${esc(issue(a.issueId)?.key||'Issue')} · ${esc(a.type)} · ${esc(a.size)}</span></div><span class="key">Open issue</span></div>`).join('')||'<div class="empty"><strong>No project files</strong>Files attached to issues will appear here.</div>'}</div></section>`;
}
function renderProjectTeam(){ const p=project(ui.projectId); return teamContributionCard(p.members, p.id); }
function renderProjectActivity(){ return `<section class="card master-log"><div class="card-header"><div><h3>Project activity</h3><p>Chronological audit trail</p></div></div><div class="card-body">${masterActivity(state.activity.filter(a=>a.projectId===ui.projectId))}</div></section>`; }

function renderMyWork(){
  const mine=state.issues.filter(i=>i.assignee==='u1');
  return `<div class="page-head"><div class="page-title"><h1>My Work</h1><p>Your assigned work across every project.</p></div><div class="page-actions"><button class="primary-btn" data-action="new-issue">${icon('plus')} New issue</button></div></div><div class="toolbar"><button class="filter-btn active">Assigned to me</button><button class="filter-btn">In progress</button><button class="filter-btn">Due soon</button><button class="filter-btn">Completed</button><button class="filter-btn">Recently updated</button></div><section class="card"><div class="table-wrap"><table><thead><tr><th>Issue</th><th>Title</th><th>Project</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>${mine.map(i=>`<tr class="hoverable" data-open-issue="${i.id}"><td class="key">${i.key}</td><td class="issue-title">${esc(i.title)}</td><td>${esc(project(i.projectId).name)}</td><td>${priorityPill(i.priority)}</td><td>${statusPill(i.status)}</td><td>${esc(i.due||'—')}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function contributionFor(uid, pid=null){
  const its=state.issues.filter(i=>(!pid||i.projectId===pid));
  return {
    assigned:its.filter(i=>i.assignee===uid).length,
    completed:its.filter(i=>i.assignee===uid&&i.status==='Done').length,
    created:its.filter(i=>i.reporter===uid).length,
    activity:state.activity.filter(a=>a.actor===uid&&(!pid||a.projectId===pid)).length,
  };
}
function teamContributionCard(memberIds=users.map(u=>u.id), pid=null){
  return `<section class="card"><div class="card-header"><div><h3>Team contributions</h3><p>Factual contribution signals, not a performance score</p></div><button class="filter-btn">Last 30 days ▾</button></div><div class="card-body">${memberIds.map(uid=>{const u=user(uid), c=contributionFor(uid,pid), max=Math.max(1,...memberIds.map(id=>contributionFor(id,pid).activity));return `<div class="person-row"><div class="person-id">${avatar(uid)}<div><strong>${esc(u.name)}</strong><span>${esc(u.role)}</span></div></div><span>${c.created} created</span><span>${c.completed} done</span><span>${c.assigned} assigned</span><div><div class="contrib-bar"><span style="width:${Math.round(c.activity/max*100)}%"></span></div><span class="muted" style="font-size:8px">${c.activity} logged actions</span></div></div>`}).join('')}</div></section>`;
}
function renderTeam(){
  return `<div class="page-head"><div class="page-title"><h1>Team</h1><p>See participation and recent contribution without reducing people to a score.</p></div><div class="page-actions"><button class="secondary-btn">Invite member</button></div></div><div class="team-grid">${teamContributionCard()}<section class="card"><div class="card-header"><div><h3>Recent people activity</h3><p>Latest changes across teams</p></div></div><div class="card-body">${activityList(state.activity.slice(0,8))}</div></section></div>`;
}

function renderExecutive(){
  const total=state.issues.length, open=state.issues.filter(i=>i.status!=='Done').length, high=state.issues.filter(i=>i.status!=='Done'&&i.priority==='High').length, completed=state.issues.filter(i=>i.status==='Done').length;
  return `<div class="exec-banner"><div><div class="exec-badge">Executive / Master View</div><h1 style="margin-top:10px">Company delivery overview</h1><p>Project health, team contribution and a company-wide audit log in one place.</p></div><button class="secondary-btn" data-action="export-log">Export activity</button></div><div class="stats-grid">${statCard('Active projects',projects.filter(p=>p.status==='Active').length,'Company portfolio','projects')}${statCard('Open issues',open,`${total} total work items`,'work')}${statCard('High priority',high,'Needs management attention','bell')}${statCard('Completed',completed,'Across all projects','dashboard')}</div><div class="grid-2"><section class="card"><div class="card-header"><div><h3>Project health</h3><p>Company-wide progress and attention</p></div><button class="filter-btn">All projects ▾</button></div><div class="card-body"><div class="health-list">${projects.map(p=>`<div class="health-row" data-project="${p.id}" style="cursor:pointer"><div class="health-name"><strong>${esc(p.name)}</strong><span>${esc(user(p.lead).name)} · ${esc(p.due)}</span></div>${progressBar(p.progress)}<strong>${p.progress}%</strong><span class="health-status">${p.progress<50?'<span class="pill red">At risk</span>':p.progress<70?'<span class="pill yellow">Attention</span>':'<span class="pill green">Healthy</span>'}</span></div>`).join('')}</div></div></section><section class="card"><div class="card-header"><div><h3>Management attention</h3><p>Signals that deserve a closer look</p></div></div><div class="card-body"><div class="note-card"><strong style="font-size:11px">${high} high-priority items remain open</strong><p style="margin-top:5px">Open the master log or drill into a project to inspect recent movement.</p></div><div class="note-card"><strong style="font-size:11px">Internal PMS is still in planning</strong><p style="margin-top:5px">42% progress with foundational structure underway.</p></div></div></section></div><div class="grid-2"><section class="card master-log"><div class="card-header"><div><h3>Master activity log</h3><p>Company-wide audit trail</p></div><div style="display:flex;gap:6px"><button class="filter-btn">Project ▾</button><button class="filter-btn">Person ▾</button></div></div><div class="card-body">${masterActivity(state.activity)}</div></section>${teamContributionCard()}</div>`;
}
function masterActivity(arr){ return `<div class="activity-list">${arr.map(a=>`<div class="activity-item"><span class="activity-time">${esc(a.time)}</span>${avatar(a.actor)}<div class="activity-copy"><strong>${esc(user(a.actor).name)}</strong> ${esc(a.action)}<br><span class="key">${esc(a.detail)}</span></div><span class="pill gray">${esc(project(a.projectId).name)}</span></div>`).join('')}</div>`; }

function renderInbox(){ return `<div class="page-head"><div class="page-title"><h1>Inbox</h1><p>Updates, mentions and work that needs your response.</p></div></div><section class="card"><div class="card-body">${activityList(state.activity.slice(0,8))}</div></section>`; }
function renderReports(){ return `<div class="page-head"><div class="page-title"><h1>Reports</h1><p>Checkpoint scaffold for project and company reporting.</p></div></div><div class="stats-grid">${statCard('Projects',projects.length,'Portfolio size','projects')}${statCard('Issues',state.issues.length,'All work items','work')}${statCard('Activity entries',state.activity.length,'Auditable changes','activity')}${statCard('Contributors',users.length,'People in demo','team')}</div><section class="card"><div class="card-body"><div class="empty"><strong>Reporting is intentionally lightweight in Checkpoint 0.5</strong>Cursor should build richer analytics after the persisted data model and authorization layer are in place.</div></div></section>`; }

function renderModal(){
  if(!ui.modal) return '';
  if(ui.modal==='issue') return issueModal();
  if(ui.modal==='note') return noteModal();
  if(ui.modal==='project') return projectModal();
  return '';
}
function issueModal(){
  const parent=ui.modalParentId?issue(ui.modalParentId):null;
  const allowed=parent?allowedChildren[parent.type]:['Epic','User Story','Task','Sub-task'];
  const defaultType=allowed[0]||'Task';
  return `<div class="modal-backdrop" data-close-modal><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><h3>${parent?`Add child to ${esc(parent.key)}`:'Create issue'}</h3><button class="icon-btn" data-close-modal>×</button></div><form id="issueForm"><div class="modal-body"><div class="form-grid"><div class="field"><label>Type</label><select id="issueType">${allowed.map(t=>`<option ${t===defaultType?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>Project</label><select id="issueProject">${projects.map(p=>`<option value="${p.id}" ${p.id===(parent?.projectId||ui.projectId)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field full"><label>Title</label><input id="issueTitle" required placeholder="Describe the outcome clearly"></div><div class="field full"><label>Description</label><textarea id="issueDescription" placeholder="Add the context someone needs to understand this work"></textarea></div><div class="field"><label>Assignee</label><select id="issueAssignee">${users.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div><div class="field"><label>Priority</label><select id="issuePriority"><option>Medium</option><option>High</option><option>Low</option><option>Highest</option><option>Lowest</option></select></div><div id="storyFields" class="field full" style="display:${defaultType==='User Story'?'grid':'none'}"><label>User story</label><input id="storyAs" placeholder="As a [type of user]" style="margin-bottom:7px"><input id="storyWant" placeholder="I want [goal / capability]" style="margin-bottom:7px"><input id="storySo" placeholder="So that [reason / value]"></div></div><div id="hierarchyHint" class="description">${parent?`Hierarchy enforced: ${esc(parent.type)} → ${esc(defaultType)}`:'Create a top-level item, or create a child directly from its parent in the hierarchy.'}</div></div><div class="modal-foot"><button type="button" class="secondary-btn" data-close-modal>Cancel</button><button class="primary-btn" type="submit">Create issue</button></div></form></div></div>`;
}
function noteModal(){ return `<div class="modal-backdrop" data-close-modal><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><h3>Add note</h3><button class="icon-btn" data-close-modal>×</button></div><form id="noteForm"><div class="modal-body"><div class="field"><label>Title</label><input id="noteTitle" required placeholder="Decision, requirement, implementation idea..."></div><div class="field"><label>Category</label><select id="noteLabel"><option>Product</option><option>Design</option><option>Technical</option><option>Decision</option><option>Discussion</option></select></div><div class="field"><label>Note</label><textarea id="noteBody" required placeholder="Capture context so it does not disappear in chat."></textarea></div></div><div class="modal-foot"><button type="button" class="secondary-btn" data-close-modal>Cancel</button><button class="primary-btn">Add note</button></div></form></div></div>`; }
function projectModal(){ return `<div class="modal-backdrop" data-close-modal><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><h3>New project</h3><button class="icon-btn" data-close-modal>×</button></div><div class="modal-body"><div class="description">Project creation is represented in this checkpoint, while the demo portfolio remains fixed so routes and seeded examples stay stable. Cursor should connect this modal to the persisted Project model during the first backend pass.</div></div><div class="modal-foot"><button class="primary-btn" data-close-modal>Got it</button></div></div></div>`; }
function renderToasts(){ return `<div class="toast-wrap">${ui.toast.map((t,idx)=>`<div class="toast" data-toast="${idx}"><span>✓</span><div><strong>${esc(t.title)}</strong><span>${esc(t.body)}</span></div></div>`).join('')}</div>`; }
function toast(title,body){ ui.toast.push({title,body}); render(); setTimeout(()=>{ui.toast.shift();render();},2600); }

function bind(){
  document.querySelector('#loginForm')?.addEventListener('submit',e=>{e.preventDefault(); ui.signedIn=true; const email=document.querySelector('#loginEmail').value; ui.role=email.toLowerCase().includes('executive')?'Executive':'Member'; render();});
  document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',()=>{ui.page=el.dataset.nav;render();}));
  document.querySelectorAll('[data-project]').forEach(el=>el.addEventListener('click',()=>{ui.projectId=el.dataset.project;ui.page='project';ui.projectTab='overview';const first=state.issues.find(i=>i.projectId===ui.projectId);if(first)ui.selectedIssueId=first.id;render();}));
  document.querySelectorAll('[data-project-tab]').forEach(el=>el.addEventListener('click',()=>{ui.projectTab=el.dataset.projectTab;render();}));
  document.querySelectorAll('[data-detail-tab]').forEach(el=>el.addEventListener('click',()=>{ui.detailTab=el.dataset.detailTab;render();}));
  document.querySelectorAll('[data-open-issue]').forEach(el=>el.addEventListener('click',e=>{if(e.target.closest('[data-collapse],[data-add-child]'))return; const id=el.dataset.openIssue; const i=issue(id); if(!i)return; ui.selectedIssueId=id; ui.projectId=i.projectId; if(ui.page!=='project'){ui.page='project';ui.projectTab='issues';} ui.detailTab='details'; render();}));
  document.querySelectorAll('[data-collapse]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();const id=el.dataset.collapse;ui.collapsed.has(id)?ui.collapsed.delete(id):ui.collapsed.add(id);render();}));
  document.querySelectorAll('[data-add-child]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();const p=issue(el.dataset.addChild);if(!p||!allowedChildren[p.type]?.length){toast('No child type available','This hierarchy level cannot contain another issue.');return;}ui.modal='issue';ui.modalParentId=p.id;render();}));
  document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>handleAction(el.dataset.action)));
  document.querySelectorAll('[data-close-modal]').forEach(el=>el.addEventListener('click',()=>{ui.modal=null;ui.modalParentId=null;render();}));
  document.querySelector('#issueType')?.addEventListener('change',e=>{document.querySelector('#storyFields').style.display=e.target.value==='User Story'?'grid':'none';});
  document.querySelector('#issueForm')?.addEventListener('submit',createIssue);
  document.querySelector('#noteForm')?.addEventListener('submit',addNote);
  document.querySelector('#commentForm')?.addEventListener('submit',addComment);
  document.querySelector('#attachmentInput')?.addEventListener('change',attachFiles);
  bindBoardDnD();
}

function handleAction(action){
  if(action==='new-issue'){ui.modal='issue';ui.modalParentId=null;render();}
  if(action==='add-note'){ui.modal='note';render();}
  if(action==='new-project'){ui.modal='project';render();}
  if(action==='export-log') exportActivity();
  if(action==='edit-issue') toast('Checkpoint behavior','Inline editing is intentionally left for the Cursor backend/UI pass.');
}

function createIssue(e){
  e.preventDefault();
  const parent=ui.modalParentId?issue(ui.modalParentId):null;
  const type=document.querySelector('#issueType').value;
  const projectId=document.querySelector('#issueProject').value;
  if(parent && !allowedChildren[parent.type].includes(type)){ toast('Hierarchy blocked',`${parent.type} cannot contain ${type}.`); return; }
  if(parent && parent.projectId!==projectId){ toast('Hierarchy blocked','Child issues must stay inside the same project as their parent.'); return; }
  const p=project(projectId);
  const nextNum=state.issues.filter(i=>i.projectId===projectId).length+1;
  const id='local-'+Date.now();
  const item={ id,key:`${p.key}-${100+nextNum}`,projectId,type,title:document.querySelector('#issueTitle').value.trim(),description:document.querySelector('#issueDescription').value.trim(),status:'To Do',priority:document.querySelector('#issuePriority').value,assignee:document.querySelector('#issueAssignee').value,reporter:'u1',parentId:parent?.id||null,due:'—',progress:0 };
  if(type==='User Story') item.story={asA:document.querySelector('#storyAs').value.trim()||'user',want:document.querySelector('#storyWant').value.trim()||item.title,soThat:document.querySelector('#storySo').value.trim()||'the intended outcome is clear'};
  state.issues.push(item);
  addActivity(item,'created issue',`${item.key} · ${item.title}`);
  persist();
  ui.selectedIssueId=id; ui.projectId=projectId; ui.page='project'; ui.projectTab='issues'; ui.detailTab='details'; ui.modal=null; ui.modalParentId=null; toast('Issue created',`${item.key} was added to ${p.name}.`);
}
function addNote(e){
  e.preventDefault(); const i=issue(ui.selectedIssueId); if(!i)return;
  state.notes.unshift({id:'note-'+Date.now(),issueId:i.id,author:'u1',created:dateNow(),label:document.querySelector('#noteLabel').value,title:document.querySelector('#noteTitle').value.trim(),body:document.querySelector('#noteBody').value.trim()});
  addActivity(i,'added note',`${i.key} · ${i.title}`); persist(); ui.modal=null; ui.detailTab='notes'; toast('Note added','The note is attached to this work item.');
}
function addComment(e){
  e.preventDefault(); const txt=document.querySelector('#commentText').value.trim(); const i=issue(ui.selectedIssueId); if(!txt||!i)return;
  state.comments.push({id:'comment-'+Date.now(),issueId:i.id,author:'u1',created:dateNow(),body:txt}); addActivity(i,'commented',`${i.key} · ${i.title}`);persist();toast('Comment posted','Your comment is now part of the issue history.');
}
function attachFiles(e){
  const i=issue(ui.selectedIssueId); if(!i)return;
  [...e.target.files].forEach(f=>state.attachments.unshift({id:'file-'+Date.now()+Math.random(),issueId:i.id,name:f.name,size:formatBytes(f.size),type:f.type?.includes('image')?'Image':(f.name.split('.').pop()||'File').toUpperCase(),created:dateNow(),author:'u1'}));
  addActivity(i,'attached file',`${i.key} · ${e.target.files.length} file(s)`);persist();toast('Attachment added','File metadata is attached in this prototype.');
}
function formatBytes(b){ if(b<1024)return `${b} B`; if(b<1024*1024)return `${Math.round(b/1024)} KB`; return `${(b/1024/1024).toFixed(1)} MB`; }
function addActivity(i,action,detail){ state.activity.unshift({id:'act-'+Date.now()+Math.random(),projectId:i.projectId,issueId:i.id,actor:'u1',action,detail,time:dateNow()}); }

function bindBoardDnD(){
  let dragging=null;
  document.querySelectorAll('[data-drag-id]').forEach(card=>card.addEventListener('dragstart',e=>{dragging=card.dataset.dragId;e.dataTransfer.effectAllowed='move';}));
  document.querySelectorAll('[data-drop-status]').forEach(zone=>{
    zone.addEventListener('dragover',e=>e.preventDefault());
    zone.addEventListener('drop',e=>{e.preventDefault(); const i=issue(dragging); if(!i)return; const old=i.status, next=zone.dataset.dropStatus; if(old===next)return; i.status=next; i.progress=next==='Done'?100:(next==='In Review'?85:(next==='In Progress'?50:0)); addActivity(i,'changed status',`${i.key} · ${old} → ${next}`);persist();toast('Status updated',`${i.key} moved to ${next}.`);});
  });
}

function exportActivity(){
  const rows=['time,project,actor,action,detail',...state.activity.map(a=>[a.time,project(a.projectId).name,user(a.actor).name,a.action,a.detail].map(csv).join(','))];
  const blob=new Blob([rows.join('\n')],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download='workhub-master-activity.csv';a.click();URL.revokeObjectURL(url);toast('Export ready','Master activity was exported as CSV.');
}
function csv(v){return '"'+String(v).replaceAll('"','""')+'"';}

render();
