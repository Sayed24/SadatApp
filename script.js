// SadatApp v1 — complete client-side demo
// Data key
const LSKEY = "sadatapp_v1_v1";
const DEFAULT_AVATAR = "https://via.placeholder.com/120?text=User";

// app state
let app = { me: null, users: [], posts: [], convos: [], stories: [], notifs: [], settings: { theme: "light" } };

// helpers
const $ = (sel) => document.querySelector(sel);
const $all = (sel) => Array.from(document.querySelectorAll(sel));
const uid = (p="id") => p + Math.random().toString(36).slice(2,9);
const now = () => new Date().toISOString();

function save(){ localStorage.setItem(LSKEY, JSON.stringify(app)); }
function load(){
  const raw = localStorage.getItem(LSKEY);
  if(raw) app = JSON.parse(raw);
  else initDefault();
}
function initDefault(){
  const me = { id: uid("u"), name: "SayedRahim Sadat", username:"sayedrahim", bio:"Building SadatApp", avatar: DEFAULT_AVATAR, role:"admin", saved: [] };
  app.me = me.id; app.users = [me]; app.posts = []; app.convos = []; app.stories = []; app.notifs = []; app.settings.theme = "light";
  save();
}

// modal helpers
function openModal(html){
  const root = $("#modalRoot"); root.innerHTML = `<div class="modal"><div class="panel">${html}<div style="text-align:right;margin-top:12px"><button id="closeModal" class="btn ghost">Close</button></div></div></div>`;
  $("#closeModal").onclick = closeModal;
}
function closeModal(){ $("#modalRoot").innerHTML = ""; }

// rendering
function renderAll(){
  renderTopAvatar();
  renderLeftProfile();
  renderFriends();
  renderStories();
  renderFeed();
  renderConvosList();
  renderStats();
  applyTheme();
  refreshNotifBadge();
  $("#year").innerText = new Date().getFullYear();
}

function renderTopAvatar(){
  const me = currentUser();
  $("#userAvatar").innerHTML = `<img src="${me.avatar||DEFAULT_AVATAR}" style="width:36px;height:36px;border-radius:50%;">`;
}
function renderLeftProfile(){
  const me = currentUser();
  $("#leftAvatar").src = me.avatar || DEFAULT_AVATAR;
  $("#leftName").innerText = me.name;
  $("#leftHandle").innerText = "@" + (me.username || "");
  $("#leftBio").innerText = me.bio || "";
}

// friends list
function renderFriends(){
  const listEl = $("#friendsList");
  listEl.innerHTML = "";
  const others = app.users.filter(u => u.id !== app.me);
  if(others.length === 0) listEl.innerHTML = "<div class='muted small'>No users yet</div>";
  else others.forEach(u=>{
    const div = document.createElement("div");
    div.className = "row";
    div.style.justifyContent = "space-between";
    div.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><img src="${u.avatar||DEFAULT_AVATAR}" width="36" height="36" style="border-radius:50%"><div><strong>${u.name}</strong><div class="muted small">@${u.username}</div></div></div>
      <div><button class="btn small follow-btn" data-id="${u.id}">Follow</button></div>`;
    listEl.appendChild(div);
  });
  $all(".follow-btn").forEach(b => b.onclick = (e) => {
    const id = e.target.dataset.id;
    notifyUser(id, `${currentUser().name} started following you`);
    e.target.innerText = "Following"; e.target.disabled = true;
  });
}

// stories
function renderStories(){
  const strip = $("#storiesStrip"); strip.innerHTML = "";
  const active = app.stories.filter(s => new Date(s.expires) > new Date());
  if(active.length === 0) strip.innerHTML = "<div class='muted small'>No stories</div>";
  active.forEach(s=>{
    const u = getUser(s.userId);
    const el = document.createElement("div"); el.className = "story-item";
    el.innerHTML = `<img src="${s.image}" alt="story"/><div style="font-size:12px;margin-top:6px">${u.name}</div>`;
    el.onclick = ()=> openModal(`<h3>Story by ${u.name}</h3><img src="${s.image}" style="max-width:100%"><p class="muted small">${new Date(s.created).toLocaleString()}</p>`);
    strip.appendChild(el);
  });
}

// feed / posts
function renderFeed(){
  const feed = $("#feed");
  const posts = app.posts.slice().sort((a,b)=> new Date(b.created) - new Date(a.created));
  if(posts.length===0){ feed.innerHTML = `<div class="card">No posts yet. Publish your first post.</div>`; return; }
  feed.innerHTML = posts.map(p => renderPostHtml(p)).join("");
  $all(".like-btn").forEach(b => b.onclick = (e)=> toggleLike(e.target.dataset.id));
  $all(".comment-btn").forEach(b => b.onclick = (e)=> openComments(e.target.dataset.id));
  $all(".delete-post-btn").forEach(b => b.onclick = (e)=> deletePost(e.target.dataset.id));
  $all(".save-post-btn").forEach(b => b.onclick = (e)=> savePostForLater(e.target.dataset.id));
  $all(".react-btn").forEach(b => b.onclick = (e)=> reactToPost(e.target.dataset.id, e.target.dataset.reaction));
}

function renderPostHtml(p){
  const u = getUser(p.userId);
  const likeCount = p.likes ? p.likes.length : 0;
  const commentsCount = p.comments ? p.comments.length : 0;
  const userLiked = (p.likes||[]).includes(app.me);
  const reactions = p.reactions || {};
  const reactionsHtml = Object.keys(reactions).map(k => `<span>${k} ${reactions[k]}</span>`).join(" ");
  return `
  <article class="post card" id="post-${p.id}">
    <div class="meta">
      <img src="${u.avatar||DEFAULT_AVATAR}" width="44" height="44" style="border-radius:50%">
      <div><strong>${u.name}</strong><div class="muted small">@${u.username} · ${new Date(p.created).toLocaleString()}</div></div>
    </div>
    <div class="content"><div style="margin-top:8px">${escapeHtml(p.text||"")}</div>
      ${p.image ? `<img class="content" src="${p.image}" />` : ""}
    </div>
    <div class="actions">
      <button class="action-btn like-btn ${userLiked? 'liked':''}" data-id="${p.id}">❤ ${likeCount}</button>
      <button class="action-btn comment-btn" data-id="${p.id}">💬 ${commentsCount}</button>
      <button class="action-btn save-post-btn" data-id="${p.id}">🔖 Save</button>
      <div style="display:inline-block">
        <button class="btn small react-btn" data-id="${p.id}" data-reaction="👍">👍</button>
        <button class="btn small react-btn" data-id="${p.id}" data-reaction="😂">😂</button>
        <button class="btn small react-btn" data-id="${p.id}" data-reaction="😮">😮</button>
      </div>
      ${(currentUser().role === "admin" || p.userId === app.me) ? `<button class="btn ghost small delete-post-btn" data-id="${p.id}">Delete</button>` : ""}
    </div>
    <div class="muted small">${reactionsHtml}</div>
    <div id="comments-${p.id}"></div>
  </article>
  `;
}

// convos
function renderConvosList(){
  const wrap = $("#convos"); wrap.innerHTML = "";
  if(app.convos.length === 0) wrap.innerHTML = "<div class='muted small'>No conversations</div>";
  app.convos.forEach(c=>{
    const otherId = c.members.find(m=>m!==app.me);
    const other = getUser(otherId);
    const btn = document.createElement("div");
    btn.className = "row";
    btn.style.justifyContent = "space-between";
    btn.innerHTML = `<div><strong>${other.name}</strong><div class="muted small">@${other.username}</div></div><div><button class="btn small open-convo" data-id="${c.id}">Open</button></div>`;
    wrap.appendChild(btn);
  });
  $all(".open-convo").forEach(b => b.onclick = (e)=> openConversationLocal(e.target.dataset.id));
}

// stats
function renderStats(){
  $("#statUsers").innerText = `Users: ${app.users.length}`;
  $("#statPosts").innerText = `Posts: ${app.posts.length}`;
  $("#statStories").innerText = `Stories: ${app.stories.length}`;
}

// helpers
function currentUser(){ return app.users.find(u => u.id === app.me); }
function getUser(id){ return app.users.find(u=>u.id===id) || {name:"(deleted)",username:"deleted",avatar:DEFAULT_AVATAR}; }
function escapeHtml(s=''){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// actions
function publishPostCore(text, image){
  if(!text && !image) return alert("Write something or attach an image");
  const p = { id: uid("p"), userId: app.me, text, image: image||"", created: now(), likes: [], comments: [], reactions: {} };
  app.posts.push(p); save(); renderFeed(); renderStats(); notifyAll(`${currentUser().name} posted new content`);
}

function toggleLike(postId){
  const p = app.posts.find(x=>x.id===postId); if(!p) return;
  if(!p.likes) p.likes = [];
  const idx = p.likes.indexOf(app.me);
  if(idx === -1){ p.likes.push(app.me); notifyUser(p.userId, `${currentUser().name} liked your post`); }
  else p.likes.splice(idx,1);
  save(); renderFeed();
}

function openComments(postId){
  const p = app.posts.find(x=>x.id===postId);
  openModal(`<h3>Comments</h3><div id="cmList" style="max-height:280px;overflow:auto;margin-bottom:8px">${(p.comments||[]).map(c=>`<div style="padding:8px;border-bottom:1px solid #f1f5f9"><strong>${c.name}</strong><div class="muted small">${new Date(c.ts).toLocaleString()}</div><div>${escapeHtml(c.text)}</div></div>`).join("")}</div>
    <textarea id="commentText" placeholder="Write a comment..." style="width:100%;min-height:80px"></textarea>
    <div style="text-align:right;margin-top:8px"><button id="sendComment" class="btn">Send</button></div>`);
  $("#sendComment").onclick = ()=>{
    const txt = $("#commentText").value.trim(); if(!txt) return alert("Write a comment");
    p.comments = p.comments || [];
    p.comments.push({ id: uid("c"), userId: app.me, name: currentUser().name, text: txt, ts: now() });
    save(); closeModal(); renderFeed(); notifyUser(p.userId, `${currentUser().name} commented on your post`);
  };
}

function deletePost(postId){
  if(!confirm("Delete this post?")) return;
  app.posts = app.posts.filter(p=>p.id !== postId);
  save(); renderFeed(); renderStats();
}

function savePostForLater(postId){
  const me = currentUser();
  me.saved = me.saved || [];
  if(!me.saved.includes(postId)) me.saved.push(postId);
  save(); alert("Saved to your saved posts");
}

function reactToPost(postId, reaction){
  const p = app.posts.find(x=>x.id===postId); if(!p) return;
  p.reactions = p.reactions || {};
  p.reactions[reaction] = (p.reactions[reaction] || 0) + 1;
  save(); renderFeed();
}

// messages
function startConversation(username, initial){
  const user = app.users.find(u=>u.username === username);
  if(!user) return alert("User not found");
  let convo = app.convos.find(c => c.members.includes(user.id) && c.members.includes(app.me));
  if(!convo){
    convo = { id: uid("c"), members:[app.me, user.id], messages: [] }; app.convos.push(convo); save(); renderConvosList();
  }
  if(initial){ convo.messages.push({ id: uid("m"), from: app.me, text: initial, ts: now() }); save(); }
  openConversationLocal(convo.id);
}
function openConversationLocal(id){
  const c = app.convos.find(x=>x.id===id); if(!c) return alert("Conversation not found");
  const other = getUser(c.members.find(m=>m!==app.me));
  openModal(`<h3>Chat with ${other.name}</h3><div id="chatArea" style="max-height:320px;overflow:auto;padding:8px;border:1px solid #f1f5f9;margin-bottom:8px">${c.messages.map(m=>`<div style="margin-bottom:8px"><strong>${getUser(m.from).name}</strong><div class="muted small">${new Date(m.ts).toLocaleString()}</div><div>${escapeHtml(m.text)}</div></div>`).join("")}</div>
    <textarea id="chatText" style="width:100%;min-height:80px"></textarea>
    <div style="text-align:right;margin-top:8px"><button id="sendChat" class="btn">Send</button></div>`);
  $("#sendChat").onclick = ()=> {
    const t = $("#chatText").value.trim(); if(!t) return;
    c.messages.push({ id: uid("m"), from: app.me, text: t, ts: now() }); save(); closeModal(); openConversationLocal(id); notifyUser(other.id, `${currentUser().name} sent you a message`);
  };
}

// stories
function createStory(imageData){
  const s = { id: uid("s"), userId: app.me, image: imageData, created: now(), expires: new Date(Date.now() + 24*3600*1000).toISOString() };
  app.stories.push(s); save(); renderStories(); renderStats();
}

// notifications
function notifyUser(userId, text){
  app.notifs.push({ id: uid("n"), userId, text, at: now(), seen: false }); save(); refreshNotifBadge();
}
function notifyAll(text){
  app.users.forEach(u => app.notifs.push({ id: uid("n"), userId: u.id, text, at: now(), seen:false }));
  save(); refreshNotifBadge();
}
function refreshNotifBadge(){
  const mine = app.notifs.filter(n => n.userId === app.me && !n.seen).length;
  const el = $("#notifCount");
  if(mine === 0) el.classList.add("hidden"); else { el.classList.remove("hidden"); el.innerText = mine; }
}

// admin
function openAdmin(){
  const usersHtml = app.users.map(u => `<div style="padding:6px;border-bottom:1px solid #f1f5f9"><strong>${u.name}</strong> <small class="muted">@${u.username}</small> <button class="btn ghost small" data-del="${u.id}">Delete</button></div>`).join("");
  const postsHtml = app.posts.map(p => `<div style="padding:6px;border-bottom:1px solid #f1f5f9">${escapeHtml(p.text)} <div class="muted small">by ${(getUser(p.userId)||{}).name}</div> <button class="btn ghost small" data-delp="${p.id}">Remove</button></div>`).join("");
  openModal(`<h3>Admin</h3><div style="display:flex;gap:12px"><div style="flex:1">${usersHtml}</div><div style="flex:2">${postsHtml}</div></div>`);
  $all("[data-del]").forEach(b=> b.onclick = (e)=> { if(confirm("Delete user?")) { app.users = app.users.filter(u=>u.id!==e.target.dataset.del); app.posts = app.posts.filter(p=>p.userId!==e.target.dataset.del); save(); closeModal(); renderAll(); } });
  $all("[data-delp]").forEach(b=> b.onclick = (e)=> { if(confirm("Remove post?")) { app.posts = app.posts.filter(p=>p.id!==e.target.dataset.delp); save(); closeModal(); renderAll(); } });
}

// search
function runSearch(q){
  if(!q) { renderFeed(); return; }
  const posts = app.posts.filter(p => (p.text||"").toLowerCase().includes(q.toLowerCase()) || (getUser(p.userId).name||"").toLowerCase().includes(q.toLowerCase()));
  const users = app.users.filter(u => (u.name + " " + u.username + " " + (u.bio||"")).toLowerCase().includes(q.toLowerCase()));
  openModal(`<h3>Search</h3><div><h4>Users</h4>${users.map(u=>`<div style="padding:8px">${u.name} <small class="muted">@${u.username}</small></div>`).join("") || "<div class='muted'>No users</div>"}</div><div style="margin-top:12px"><h4>Posts</h4>${posts.map(p=>`<div class="card" style="padding:8px">${escapeHtml(p.text)}</div>`).join("") || "<div class='muted'>No posts</div>"}</div>`);
}

// profile editor
function openProfileEditor(){
  const me = currentUser();
  openModal(`<h3>Edit Profile</h3><div style="display:flex;gap:12px;align-items:center"><img src="${me.avatar||DEFAULT_AVATAR}" width="72" height="72" style="border-radius:50%"><div style="flex:1"><input id="epName" placeholder="Full name" value="${escapeHtml(me.name)}" /><input id="epUsername" placeholder="username" value="${escapeHtml(me.username)}" /></div></div><textarea id="epBio" style="width:100%;margin-top:8px" placeholder="Bio">${escapeHtml(me.bio)}</textarea><div style="display:flex;gap:8px;margin-top:8px"><input type="file" id="epAvatar" accept="image/*"/><button id="saveProfile" class="btn">Save</button></div>`);
  $("#saveProfile").onclick = ()=>{
    const name = $("#epName").value.trim(); const username = $("#epUsername").value.trim(); const bio = $("#epBio").value.trim();
    const file = $("#epAvatar").files[0]; const users = app.users; const idx = users.findIndex(u => u.id === app.me);
    if(file){ const r = new FileReader(); r.onload = ()=> { users[idx].avatar = r.result; users[idx].name = name; users[idx].username = username; users[idx].bio = bio; save(); closeModal(); renderAll(); alert("Saved"); }; r.readAsDataURL(file); }
    else { users[idx].name = name; users[idx].username = username; users[idx].bio = bio; save(); closeModal(); renderAll(); alert("Saved"); }
  };
}

// utility
function notifyAllAndRender(msg){ notifyAll(msg); renderAll(); }

// demo data
function createDemoData(){
  const a = { id: uid("u"), name:"Amina Noor", username:"amina", bio:"Designer", avatar: DEFAULT_AVATAR, role:"user" };
  const b = { id: uid("u"), name:"Omar Ali", username:"omar", bio:"Frontend dev", avatar: DEFAULT_AVATAR, role:"user" };
  app.users.push(a,b);
  app.posts.push({ id: uid("p"), userId: a.id, text:"Hello from Amina!", image:"", created: now(), likes:[], comments:[], reactions:{} });
  app.posts.push({ id: uid("p"), userId: b.id, text:"Omar here, trying SadatApp demo", image:"", created: now(), likes:[], comments:[], reactions:{} });
  app.convos.push({ id: uid("c"), members:[app.me, a.id], messages:[{ id:uid("m"), from: a.id, text:"Welcome! 👍", ts: now() }] });
  save(); renderAll();
}

// apply theme
function applyTheme(){ document.body.classList.toggle("dark", app.settings.theme === "dark"); }
function toggleTheme(){ app.settings.theme = app.settings.theme === "dark" ? "light":"dark"; save(); applyTheme(); }

// helpers for DOM wiring
function currentUserIsAdmin(){ return currentUser() && currentUser().role === "admin"; }

// event wiring
document.addEventListener("DOMContentLoaded", ()=>{
  load();

  // Get started/demo
  $("#getStarted").onclick = ()=> { $("#welcome").classList.remove("active"); $("#app").classList.add("active"); renderAll(); };
  $("#quickDemo").onclick = ()=> { $("#welcome").classList.remove("active"); $("#app").classList.add("active"); createDemoData(); };

  // New post modal
  $("#newPostBtn").onclick = ()=> openPostModal();
  $("#publishBtn").onclick = ()=> {
    const text = $("#composeText").value.trim();
    const file = $("#composeImage").files[0];
    if(!text && !file) return alert("Write something or attach image");
    if(file){ const r = new FileReader(); r.onload = ()=>{ publishPostCore(text, r.result); $("#composeText").value=""; $("#composeImage").value=null; }; r.readAsDataURL(file); } else { publishPostCore(text, ""); $("#composeText").value=""; }
  };

  // follow
  $("#followBtn").onclick = ()=> {
    const username = $("#followInput").value.trim();
    if(!username) return alert("Type username");
    const user = app.users.find(u => u.username === username);
    if(!user) return alert("User not found");
    notifyUser(user.id, `${currentUser().name} started following you`);
    alert("Followed (demo)");
    $("#followInput").value = "";
  };

  // story
  $("#addStoryBtn").onclick = ()=> {
    openModal(`<h3>New Story</h3><input type="file" id="storyFile" accept="image/*" /><div style="text-align:right;margin-top:8px"><button id="saveStory" class="btn">Save</button></div>`);
    $("#saveStory").onclick = ()=> {
      const f = $("#storyFile").files[0]; if(!f) return alert("Pick image");
      const r = new FileReader(); r.onload = ()=> { createStory(r.result); closeModal(); }; r.readAsDataURL(f);
    };
  };

  // new convo
  $("#newConvoBtn").onclick = ()=> {
    openModal(`<h3>New Message</h3><input id="nmUser" placeholder="recipient username" /><textarea id="nmText" placeholder="Message" style="width:100%;min-height:80px"></textarea><div style="text-align:right;margin-top:8px"><button id="nmSend" class="btn">Send</button></div>`);
    $("#nmSend").onclick = ()=> {
      const u = $("#nmUser").value.trim(); const t = $("#nmText").value.trim();
      if(!u || !t) return alert("Provide recipient & message");
      startConversation(u, t); closeModal();
    };
  };

  // profile edit
  $("#editProfileBtn").onclick = openProfileEditor;
  $("#logoutBtn").onclick = ()=> { if(confirm("Clear data? This removes stored data in your browser.")){ localStorage.removeItem(LSKEY); location.reload(); } };

  // admin
  $("#openAdminBtn").onclick = openAdmin;

  // search
  let searchTimer = null;
  $("#searchInput").addEventListener("input", (e)=>{ clearTimeout(searchTimer); searchTimer = setTimeout(()=>{ if(e.target.value.trim()) runSearch(e.target.value.trim()); }, 350); });

  // notif click
  $("#notifCount").onclick = ()=> {
    const mine = app.notifs.filter(n => n.userId === app.me).sort((a,b)=> new Date(b.at) - new Date(a.at));
    openModal(`<h3>Notifications</h3><div style="max-height:360px;overflow:auto">${mine.map(n=>`<div style="padding:8px;border-bottom:1px solid #f1f5f9">${escapeHtml(n.text)}<div class="muted small">${new Date(n.at).toLocaleString()}</div></div>`).join("") || "<div class='muted'>No notifications</div>"}</div>`);
    app.notifs.forEach(n=>{ if(n.userId === app.me) n.seen = true; }); save(); refreshNotifBadge();
  };

  // ensure minimal user
  if(!app.users || app.users.length === 0) initDefault();
  renderAll();
});

// open post modal
function openPostModal(){
  openModal(`<h3>New Post</h3><textarea id="modalText" style="width:100%;min-height:80px" placeholder="Write..."></textarea><input type="file" id="modalFile" accept="image/*" /><div style="text-align:right;margin-top:8px"><button id="modalPub" class="btn">Publish</button></div>`);
  $("#modalPub").onclick = ()=> {
    const text = $("#modalText").value.trim(); const file = $("#modalFile").files[0];
    if(!text && !file) return alert("Write something or attach image");
    if(file){ const r = new FileReader(); r.onload = ()=> { publishPostCore(text, r.result); closeModal(); }; r.readAsDataURL(file); }
    else { publishPostCore(text, ""); closeModal(); }
  };
}

// wrappers for HTML references
window.publishPost = (img) => publishPostCore("", img);
window.deletePost = deletePost;
window.startConversation = startConversation;

// expose deletePost and openConversation to be callable from inline HTML strings if needed
window.deletePost = deletePost;
window.openConversation = openConversationLocal;

// final save at end if needed
