const $ = (s, r = document) => r.querySelector(s);
const screen = $("#screen");
const KEY = "kleyn-workspaces-v1";

function seed() {
  return {
    tab: "inbox",
    spaceId: null,
    itemId: null,
    query: "",
    filter: "all",
    spaces: [
      { id: "songs", name: "Night Shift album", ico: "\u266A", desc: "Lyrics and style prompts", mem: ["English lyrics", "No cliche tears"] },
      { id: "housing", name: "Housing Asia", ico: "\u2302", desc: "Monthly stays, listings", mem: ["Max budget all-in"] },
      { id: "brand", name: "Brand", ico: "\u25C8", desc: "Portraits, reels, likeness", mem: ["Exact likeness only"] }
    ],
    items: [
      { id: "i1", space: "songs", type: "note", title: "Bridge - quieter last line", body: "Don't explain the missing. Leave the room and the phone face-down.", pin: true, time: Date.now() - 3600000 },
      { id: "i2", space: "housing", type: "note", title: "George Town shortlist", body: "Compare 1-month furnished places. Utilities included.", pin: false, time: Date.now() - 86400000 },
      { id: "i3", space: "brand", type: "note", title: "Likeness rule", body: "Keep pores, hairline, real light. No beauty filter.", pin: true, time: Date.now() - 172000000 }
    ],
    queue: [{ id: "q1", title: "Export Night Shift pack", status: "queued" }]
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    return Object.assign(seed(), JSON.parse(raw), { tab: "inbox", spaceId: null, itemId: null });
  } catch (e) {
    return seed();
  }
}

let state = load();
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(function () {});
}

const sheet = $("#sheet");
const sheetBg = $("#sheetBg");

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 1600);
}

function closeSheet() {
  sheet.hidden = true;
  sheetBg.hidden = true;
}
sheetBg.onclick = closeSheet;

function openSheet(html) {
  sheet.innerHTML = '<div class="handle"></div>' + html;
  sheet.hidden = false;
  sheetBg.hidden = false;
}

function uid(p) {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function when(t) {
  const d = Date.now() - t;
  if (d < 60000) return "now";
  if (d < 3600000) return Math.floor(d / 60000) + "m";
  if (d < 86400000) return Math.floor(d / 3600000) + "h";
  return Math.floor(d / 86400000) + "d";
}

function esc(s) {
  return String(s || "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """);
}

function syncTabs() {
  document.querySelectorAll(".tab").forEach(function (b) {
    b.classList.toggle("on", b.dataset.tab === state.tab);
  });
}

$("#backBtn").onclick = function () {
  if (state.itemId) state.itemId = null;
  else state.spaceId = null;
  render();
};
$("#openLimits").onclick = function () {
  state.tab = "queue";
  state.itemId = null;
  syncTabs();
  render();
};
$("#pipClose").onclick = function () {
  $("#pip").hidden = true;
};

document.querySelectorAll(".tab").forEach(function (btn) {
  btn.onclick = function () {
    state.tab = btn.dataset.tab;
    state.itemId = null;
    if (state.tab !== "spaces") state.spaceId = null;
    syncTabs();
    render();
  };
});

function filtered() {
  const q = (state.query || "").toLowerCase();
  return state.items.filter(function (c) {
    if (state.filter === "pinned" && !c.pin) return false;
    if (state.filter !== "all" && state.filter !== "pinned" && c.space !== state.filter) return false;
    if (q && !(c.title + " " + c.body).toLowerCase().includes(q)) return false;
    return true;
  }).sort(function (a, b) { return b.time - a.time; });
}

function itemRow(c) {
  const sp = state.spaces.find(function (s) { return s.id === c.space; });
  return '<div class="row" data-item="' + c.id + '"><div class="avatar">' +
    (sp ? sp.ico : "*") + '</div><div style="min-width:0;flex:1"><h3>' +
    esc(c.title) + '</h3><p>' + esc(c.body) + '</p></div><div class="meta">' +
    (c.pin ? '<div class="pin">PIN</div>' : '') + '<div>' + when(c.time) +
    '</div></div></div>';
}

function wireList() {
  const q = $("#q");
  if (q) {
    q.oninput = function (e) {
      state.query = e.target.value;
      render();
      const n = $("#q");
      n.focus();
      n.setSelectionRange(state.query.length, state.query.length);
    };
  }
  screen.querySelectorAll(".chip").forEach(function (c) {
    c.onclick = function () { state.filter = c.dataset.f; render(); };
  });
  screen.querySelectorAll("[data-item]").forEach(function (r) {
    r.onclick = function () { state.itemId = r.dataset.item; render(); };
  });
}

function renderInbox() {
  $("#topSub").textContent = "Inbox";
  $("#backBtn").hidden = true;
  const list = filtered();
  let chips = '<button class="chip' + (state.filter === "all" ? " on" : "") + '" data-f="all">All</button>';
  chips += '<button class="chip' + (state.filter === "pinned" ? " on" : "") + '" data-f="pinned">Pinned</button>';
  state.spaces.forEach(function (s) {
    chips += '<button class="chip' + (state.filter === s.id ? " on" : "") + '" data-f="' + s.id + '">' + esc(s.name) + '</button>';
  });
  screen.innerHTML =
    '<div class="install">Safari - Share - Add to Home Screen.</div>' +
    '<div class="search"><span>o</span><input id="q" placeholder="Search notes and captures" value="' + esc(state.query) + '" /></div>' +
    '<div class="chips">' + chips + '</div>' +
    '<div class="section">' + list.length + ' items</div>' +
    (list.length ? list.map(itemRow).join("") : '<div class="empty">Nothing here. Hit + and capture.</div>') +
    '<button class="ghost" id="exportVisible">Export visible Markdown</button>';
  wireList();
  $("#exportVisible").onclick = function () { exportMd(list, "Inbox.md"); };
}

function renderSpaces() {
  $("#backBtn").hidden = !state.spaceId;
  if (state.spaceId) return renderSpace();
  $("#topSub").textContent = "Spaces";
  let cards = "";
  state.spaces.forEach(function (s) {
    const n = state.items.filter(function (i) { return i.space === s.id; }).length;
    cards += '<button class="space-card" data-space="' + s.id + '"><div class="ico">' + s.ico +
      '</div><h3>' + esc(s.name) + '</h3><p>' + esc(s.desc) + '</p><div class="foot">' + n + ' items</div></button>';
  });
  screen.innerHTML = '<div class="space-grid">' + cards + '</div><button class="cta" id="newSpace">New workspace</button>';
  screen.querySelectorAll("[data-space]").forEach(function (b) {
    b.onclick = function () { state.spaceId = b.dataset.space; render(); };
  });
  $("#newSpace").onclick = newSpaceSheet;
}

function newSpaceSheet() {
  openSheet('<h2>New workspace</h2><input class="field" id="sn" placeholder="Name" /><input class="field" id="sd" placeholder="What lives here" /><button class="cta" id="saveSpace">Create</button>');
  $("#saveSpace").onclick = function () {
    const name = $("#sn").value.trim();
    if (!name) return;
    const id = uid("s");
    state.spaces.push({ id: id, name: name, ico: "#", desc: $("#sd").value.trim() || "Workspace", mem: [] });
    save();
    closeSheet();
    state.spaceId = id;
    state.tab = "spaces";
    syncTabs();
    render();
  };
}

function renderSpace() {
  const s = state.spaces.find(function (x) { return x.id === state.spaceId; });
  if (!s) { state.spaceId = null; return renderSpaces(); }
  $("#topSub").textContent = s.name;
  const list = state.items.filter(function (i) { return i.space === s.id; }).sort(function (a, b) { return b.time - a.time; });
  const mem = (s.mem && s.mem.length) ? s.mem.map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("") : "<span>None yet</span>";
  screen.innerHTML =
    '<p style="color:var(--mute);font-size:13px;margin-bottom:10px">' + esc(s.desc) + '</p>' +
    '<div class="section">Scoped memory</div><div class="mem">' + mem + '</div>' +
    '<button class="ghost" id="addMem" style="margin-top:8px">Add memory rule</button>' +
    '<div class="section" style="margin-top:16px">Items</div>' +
    (list.length ? list.map(itemRow).join("") : '<div class="empty">Empty space.</div>') +
    '<button class="cta" id="newNote">New note in ' + esc(s.name) + '</button>' +
    '<button class="ghost" id="exportSpace">Export workspace</button>';
  screen.querySelectorAll("[data-item]").forEach(function (r) {
    r.onclick = function () { state.itemId = r.dataset.item; render(); };
  });
  $("#newNote").onclick = function () { editItem(s.id); };
  $("#addMem").onclick = function () {
    openSheet('<h2>Memory rule</h2><input class="field" id="mv" placeholder="Rule" /><button class="cta" id="sm">Save</button>');
    $("#sm").onclick = function () {
      const v = $("#mv").value.trim();
      if (v) { s.mem = s.mem || []; s.mem.push(v); save(); }
      closeSheet();
      render();
    };
  };
  $("#exportSpace").onclick = function () {
    const lines = ["# " + s.name, "", s.desc, "", "## Memory"].concat((s.mem || []).map(function (m) { return "- " + m; })).concat(["", "## Items"]).concat(list.map(function (c) { return "### " + c.title + "\n" + c.body + "\n"; }));
    download(s.name.replace(/\s+/g, "_") + ".md", lines.join("\n"));
  };
}

function renderItem() {
  const c = state.items.find(function (x) { return x.id === state.itemId; });
  if (!c) { state.itemId = null; return renderInbox(); }
  const s = state.spaces.find(function (x) { return x.id === c.space; });
  $("#topSub").textContent = s ? s.name : "Note";
  $("#backBtn").hidden = false;
  screen.innerHTML =
    '<input class="field" id="it" value="' + esc(c.title) + '" />' +
    '<textarea id="ib">' + esc(c.body) + '</textarea>' +
    '<div class="voice-btns" style="margin-top:10px"><button id="pin">' + (c.pin ? "Unpin" : "Pin") + '</button><button class="danger" id="del">Delete</button></div>' +
    '<button class="cta" id="saveItem">Save</button>' +
    '<button class="ghost" id="exportThis">Export this note</button>';
  $("#saveItem").onclick = function () {
    c.title = $("#it").value.trim() || c.title;
    c.body = $("#ib").value;
    c.time = Date.now();
    save();
    toast("Saved on this phone");
  };
  $("#pin").onclick = function () { c.pin = !c.pin; save(); render(); };
  $("#del").onclick = function () {
    state.items = state.items.filter(function (x) { return x.id !== c.id; });
    state.itemId = null;
    save();
    render();
  };
  $("#exportThis").onclick = function () {
    download(c.title.replace(/\s+/g, "_") + ".md", "# " + c.title + "\n\n" + c.body + "\n");
  };
}

function editItem(spaceId) {
  openSheet('<h2>New note</h2><input class="field" id="nt" placeholder="Title" /><textarea id="nb" placeholder="The work itself"></textarea><button class="cta" id="sn">Save to workspace</button>');
  $("#sn").onclick = function () {
    const title = $("#nt").value.trim();
    const body = $("#nb").value.trim();
    if (!title && !body) return;
    state.items.unshift({
      id: uid("i"),
      space: spaceId || (state.spaces[0] && state.spaces[0].id) || null,
      type: "note",
      title: title || "Untitled",
      body: body,
      pin: false,
      time: Date.now()
    });
    save();
    closeSheet();
    render();
  };
}

function renderCapture() {
  $("#topSub").textContent = "Capture";
  $("#backBtn").hidden = true;
  screen.innerHTML =
    '<div class="section">Dump into a space</div>' +
    '<div class="cap-grid">' +
    '<button class="cap" data-cap="note"><div class="big">+</div><h3>Quick note</h3><p>Lands in a space</p></button>' +
    '<button class="cap" data-cap="task"><div class="big">Q</div><h3>Queue a job</h3><p>Does not disappear</p></button>' +
    '<button class="cap" data-cap="voice"><div class="big">V</div><h3>Voice note</h3><p>Saved as text</p></button>' +
    '<button class="cap" data-cap="share"><div class="big">P</div><h3>Paste in</h3><p>Link or text</p></button>' +
    '</div>';
  screen.querySelectorAll("[data-cap]").forEach(function (b) {
    b.onclick = function () { runCap(b.dataset.cap); };
  });
}

function runCap(kind) {
  const space = state.spaceId || (state.spaces[0] && state.spaces[0].id);
  if (kind === "note") return editItem(space);
  if (kind === "task") {
    openSheet('<h2>Queue job</h2><input class="field" id="qt" placeholder="What should run later" /><button class="cta" id="sq">Park it</button>');
    $("#sq").onclick = function () {
      const title = $("#qt").value.trim();
      if (!title) return;
      state.queue.unshift({ id: uid("q"), title: title, status: "queued" });
      save();
      closeSheet();
      toast("Parked in queue");
    };
    return;
  }
  if (kind === "voice") {
    state.tab = "voice";
    syncTabs();
    render();
    return;
  }
  openSheet('<h2>Paste in</h2><textarea id="ps" placeholder="Link, listing, lyric, anything"></textarea><button class="cta" id="sp">Save capture</button>');
  $("#sp").onclick = function () {
    const body = $("#ps").value.trim();
    if (!body) return;
    state.items.unshift({ id: uid("i"), space: space, type: "capture", title: body.slice(0, 48), body: body, pin: false, time: Date.now() });
    save();
    closeSheet();
    toast("Captured");
    state.tab = "inbox";
    syncTabs();
    render();
  };
}

function renderQueue() {
  $("#topSub").textContent = "Queue";
  $("#backBtn").hidden = true;
  const n = state.queue.filter(function (q) { return q.status !== "done"; }).length;
  let rows = "";
  state.queue.forEach(function (q) {
    rows += '<div class="q-item"><div class="dot' + (q.status === "done" ? " ok" : "") + '"></div><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">' +
      esc(q.title) + '</div><div style="font-size:11px;color:var(--mute)">' + q.status + '</div></div><div class="q-actions">' +
      (q.status !== "done" ? '<button class="mini" data-done="' + q.id + '">Done</button><button class="mini" data-x="' + q.id + '">Cancel</button>' : '') +
      '</div></div>';
  });
  screen.innerHTML =
    '<div class="stat"><div class="k">Open jobs</div><div class="v">' + n + '</div><div class="reset">Nothing here is deleted when you leave.</div></div>' +
    (rows || '<div class="empty">Queue empty.</div>') +
    '<button class="cta" id="addQ">Add job</button>';
  screen.querySelectorAll("[data-done]").forEach(function (b) {
    b.onclick = function () {
      const q = state.queue.find(function (x) { return x.id === b.dataset.done; });
      if (q) q.status = "done";
      save();
      render();
    };
  });
  screen.querySelectorAll("[data-x]").forEach(function (b) {
    b.onclick = function () {
      state.queue = state.queue.filter(function (x) { return x.id !== b.dataset.x; });
      save();
      render();
    };
  });
  $("#addQ").onclick = function () { runCap("task"); };
}

function renderVoice() {
  $("#topSub").textContent = "Voice";
  $("#backBtn").hidden = true;
  screen.innerHTML =
    '<div class="voice-stage"><div class="cam"><div class="live-tag">NOTE</div><div class="wave"><i></i><i></i><i></i><i></i><i></i></div></div>' +
    '<textarea id="vt" class="transcript" placeholder="Speak or type. Saved into last space."></textarea></div>' +
    '<div class="voice-btns"><button class="go" id="saveV">Save note</button><button id="pipBtn">Keep on top</button></div>';
  $("#saveV").onclick = function () {
    const body = $("#vt").value.trim();
    if (!body) return;
    state.items.unshift({
      id: uid("i"),
      space: (state.spaces[0] && state.spaces[0].id) || null,
      type: "voice",
      title: body.slice(0, 48),
      body: body,
      pin: false,
      time: Date.now()
    });
    save();
    toast("Saved");
    state.tab = "inbox";
    syncTabs();
    render();
  };
  $("#pipBtn").onclick = function () {
    $("#pip").hidden = false;
    $("#pipLine").textContent = "Draft open";
    state.tab = "inbox";
    syncTabs();
    render();
  };
}

function exportMd(list, name) {
  const md = ["# KLEYN export", ""].concat(list.map(function (c) { return "## " + c.title + "\n" + c.body + "\n"; })).join("\n");
  download(name, md);
}

function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  a.download = name;
  a.click();
  toast("Downloaded " + name);
}

function render() {
  $("#usageLabel").textContent = state.queue.filter(function (q) { return q.status !== "done"; }).length;
  if (state.itemId) return renderItem();
  if (state.tab === "inbox") return renderInbox();
  if (state.tab === "spaces") return renderSpaces();
  if (state.tab === "capture") return renderCapture();
  if (state.tab === "queue") return renderQueue();
  if (state.tab === "voice") return renderVoice();
}

render();
