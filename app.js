/* ForgeBoard — manufacturing command center
   Zero dependencies. All state lives in localStorage. */

const STORAGE_KEY = "forgeboard_data_v1";

function defaultAreas() {
  return [
    { id: "process", label: "Process Engineering", color: "#b18aff" },
    { id: "maintenance", label: "Maintenance", color: "#ff5c6a" },
    { id: "production", label: "Production", color: "#5b8cff" },
    { id: "automation", label: "Automation", color: "#3dd6ff" },
    { id: "general", label: "General", color: "#5f6c8c" },
  ];
}
const AREA_COLOR_POOL = ["#b18aff", "#ff5c6a", "#5b8cff", "#3dd6ff", "#ffb020", "#33d69f", "#ff8a3d"];

const PRIORITIES = [
  { id: "low", label: "Low", color: "var(--text-faint)" },
  { id: "medium", label: "Medium", color: "var(--blue)" },
  { id: "high", label: "High", color: "var(--amber)" },
  { id: "urgent", label: "Urgent", color: "var(--red)" },
];

const STATUSES = [
  { id: "todo", label: "To Do", color: "var(--blue)" },
  { id: "inprogress", label: "In Progress", color: "var(--amber)" },
  { id: "blocked", label: "Blocked", color: "var(--red)" },
  { id: "done", label: "Done", color: "var(--green)" },
];

const TEMPLATES = [
  "Machine breakdown", "Preventive maintenance", "5S audit",
  "Root cause analysis", "Line changeover", "Calibration due",
  "Safety inspection", "Spare part request",
];

const AVATAR_COLORS = ["#ff8a3d", "#3dd6ff", "#33d69f", "#b18aff", "#ffb020", "#5b8cff", "#ff5c6a"];

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
}
function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function areaMeta(id) { return state.areas.find(a => a.id === id) || state.areas[state.areas.length - 1]; }
function slugify(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "area";
}
function prioMeta(id) { return PRIORITIES.find(p => p.id === id) || PRIORITIES[0]; }

function seedData() {
  const team = [
    { id: uid(), name: "Mehmet Kaya", role: "Maintenance Lead" },
    { id: uid(), name: "Ayşe Demir", role: "Process Engineer" },
    { id: uid(), name: "Emre Yıldız", role: "Automation Engineer" },
    { id: uid(), name: "Fatma Şahin", role: "Production Supervisor" },
  ];
  const [m, a, e, f] = team;
  const days = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const tasks = [
    { title: "Line 3 conveyor bearing noise — inspect", area: "maintenance", assignee: m.id, priority: "urgent", status: "inprogress", due: days(0), tags: ["line3"] },
    { title: "Update SOP for injection molding changeover", area: "process", assignee: a.id, priority: "medium", status: "todo", due: days(4), tags: ["sop"] },
    { title: "PLC firmware update — packaging cell", area: "automation", assignee: e.id, priority: "high", status: "todo", due: days(1), tags: ["plc"] },
    { title: "Root cause analysis — Friday scrap rate spike", area: "process", assignee: a.id, priority: "urgent", status: "inprogress", due: days(-1), tags: ["rca", "quality"] },
    { title: "Weekly 5S audit — Assembly area", area: "production", assignee: f.id, priority: "low", status: "todo", due: days(2), tags: ["5s"] },
    { title: "Calibrate torque wrenches — Station 4", area: "maintenance", assignee: m.id, priority: "medium", status: "blocked", due: days(-2), tags: ["calibration"] },
    { title: "Investigate vibration sensor false alarms", area: "automation", assignee: e.id, priority: "high", status: "todo", due: days(3), tags: ["sensors"] },
    { title: "Approve changeover checklist — Line 1", area: "production", assignee: f.id, priority: "medium", status: "done", due: days(-3), tags: [], completedAt: Date.now() - 86400000 },
    { title: "Spare part request — hydraulic seal kit", area: "maintenance", assignee: m.id, priority: "high", status: "done", due: days(-5), tags: ["parts"], completedAt: Date.now() - 3 * 86400000 },
  ];
  return {
    team,
    areas: defaultAreas(),
    tasks: tasks.map(t => ({
      id: uid(), title: t.title, notes: "", area: t.area, assignee: t.assignee,
      priority: t.priority, status: t.status, due: t.due, tags: t.tags || [],
      createdAt: Date.now() - 5 * 86400000, completedAt: t.completedAt || null,
    })),
    activity: [
      { id: uid(), text: "Board created and seeded with sample tasks.", time: Date.now() - 5 * 86400000 },
    ],
    ui: { theme: "dark", areaFilter: null, assigneeFilter: null, tab: "board" },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.areas) parsed.areas = defaultAreas();
      if (!parsed.ui) parsed.ui = { theme: "dark", areaFilter: null, assigneeFilter: null, tab: "board" };
      return parsed;
    }
  } catch (e) { /* corrupt storage falls through to reseed */ }
  return seedData();
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function logActivity(text) {
  state.activity.unshift({ id: uid(), text, time: Date.now() });
  state.activity = state.activity.slice(0, 200);
}

/* ---------------- Quick-add smart parser ---------------- */
function parseQuickAdd(raw) {
  let text = raw.trim();
  let assignee = null, area = null, priority = null, due = null;
  const tags = [];

  text = text.replace(/@(\S+)/g, (_, w) => {
    const m = state.team.find(t => t.name.toLowerCase().startsWith(w.toLowerCase()) || t.name.toLowerCase().split(" ")[0] === w.toLowerCase());
    if (m) assignee = m.id;
    return "";
  });

  text = text.replace(/#(\S+)/g, (_, w) => {
    const lw = w.toLowerCase();
    const areaHit = state.areas.find(a => a.id.startsWith(lw) || a.label.toLowerCase().startsWith(lw));
    if (areaHit) area = areaHit.id; else tags.push(lw);
    return "";
  });

  text = text.replace(/!(\S+)/g, (_, w) => {
    const lw = w.toLowerCase();
    const p = PRIORITIES.find(p => p.id.startsWith(lw));
    if (p) priority = p.id;
    return "";
  });

  const dateWords = {
    today: 0, tomorrow: 1, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null,
  };
  const dayIdx = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  text = text.replace(/\b(today|tomorrow|mon|tue|wed|thu|fri|sat|sun)(day)?\b/gi, (_, w) => {
    const lw = w.toLowerCase();
    const d = new Date();
    if (lw === "today") { due = d.toISOString().slice(0, 10); }
    else if (lw === "tomorrow") { d.setDate(d.getDate() + 1); due = d.toISOString().slice(0, 10); }
    else if (lw in dayIdx) {
      const target = dayIdx[lw];
      let diff = (target - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
      due = d.toISOString().slice(0, 10);
    }
    return "";
  });

  if (!due) {
    const explicit = text.match(/\b(\d{4}-\d{2}-\d{2})\b/) || text.match(/\b(\d{1,2}\/\d{1,2})\b/);
    if (explicit) {
      if (explicit[1].includes("-")) due = explicit[1];
      else {
        const [mo, da] = explicit[1].split("/").map(Number);
        const y = new Date().getFullYear();
        due = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
      }
      text = text.replace(explicit[0], "");
    }
  }

  const urgentWords = /\b(down|stopped|breakdown|leak|fire|hazard|injury|spill|failure|failed|emergency)\b/i;
  if (!priority) priority = urgentWords.test(text) ? "urgent" : "medium";
  if (!area) area = "general";

  text = text.replace(/\s{2,}/g, " ").trim();
  return { title: text || raw.trim(), assignee, area, priority, due, tags };
}

/* ---------------- Mutations ---------------- */
function addTask(data) {
  const task = {
    id: uid(), title: data.title, notes: data.notes || "", area: data.area || "general",
    assignee: data.assignee || null, priority: data.priority || "medium", status: data.status || "todo",
    due: data.due || null, tags: data.tags || [], createdAt: Date.now(), completedAt: null,
  };
  state.tasks.unshift(task);
  logActivity(`Task created: "${task.title}"`);
  save(); renderAll();
  return task;
}
function updateTask(id, patch) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  const wasDone = t.status === "done";
  Object.assign(t, patch);
  if (t.status === "done" && !wasDone) { t.completedAt = Date.now(); logActivity(`Completed: "${t.title}"`); }
  if (t.status !== "done" && wasDone) t.completedAt = null;
  save(); renderAll();
}
function deleteTask(id) {
  const t = state.tasks.find(t => t.id === id);
  state.tasks = state.tasks.filter(t => t.id !== id);
  if (t) logActivity(`Deleted: "${t.title}"`);
  save(); renderAll();
}
function addTeamMember(name, role) {
  state.team.push({ id: uid(), name, role: role || "Team member" });
  logActivity(`Added team member: ${name}`);
  save(); renderAll();
}
function removeTeamMember(id) {
  const m = state.team.find(t => t.id === id);
  state.team = state.team.filter(t => t.id !== id);
  state.tasks.forEach(t => { if (t.assignee === id) t.assignee = null; });
  if (m) logActivity(`Removed team member: ${m.name}`);
  save(); renderAll();
}
function addArea(label) {
  const base = slugify(label);
  let id = base, n = 1;
  while (state.areas.some(a => a.id === id)) { n++; id = `${base}-${n}`; }
  const color = AREA_COLOR_POOL[state.areas.length % AREA_COLOR_POOL.length];
  state.areas.push({ id, label: label.trim(), color });
  logActivity(`Added focus area: ${label.trim()}`);
  save(); renderAll();
}
function removeArea(id) {
  if (state.areas.length <= 1) { toast("Keep at least one focus area"); return; }
  const a = state.areas.find(a => a.id === id);
  const fallback = state.areas.find(x => x.id !== id).id;
  state.tasks.forEach(t => { if (t.area === id) t.area = fallback; });
  state.areas = state.areas.filter(a => a.id !== id);
  if (state.ui.areaFilter === id) state.ui.areaFilter = null;
  if (a) logActivity(`Removed focus area: ${a.label}`);
  save(); renderAll();
}

/* ---------------- Derived / stats ---------------- */
function isOverdue(t) { return t.due && t.due < todayISO() && t.status !== "done"; }
function isDueToday(t) { return t.due === todayISO() && t.status !== "done"; }

function filteredTasks() {
  return state.tasks.filter(t => {
    if (state.ui.areaFilter && t.area !== state.ui.areaFilter) return false;
    if (state.ui.assigneeFilter && t.assignee !== state.ui.assigneeFilter) return false;
    return true;
  });
}

function computeKPIs() {
  const all = state.tasks;
  const open = all.filter(t => t.status !== "done").length;
  const inprogress = all.filter(t => t.status === "inprogress").length;
  const overdue = all.filter(isOverdue).length;
  const weekAgo = Date.now() - 7 * 86400000;
  const doneThisWeek = all.filter(t => t.status === "done" && t.completedAt && t.completedAt >= weekAgo).length;
  const total = all.length || 1;
  const doneTotal = all.filter(t => t.status === "done").length;
  const completionRate = Math.round((doneTotal / total) * 100);
  return { open, inprogress, overdue, doneThisWeek, completionRate };
}

/* ---------------- Rendering ---------------- */
function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return e;
}

function renderSidebarFilters() {
  const areaWrap = document.getElementById("areaFilters");
  areaWrap.innerHTML = "";
  const allRow = el("div", { class: "filter-row" + (!state.ui.areaFilter ? " active" : ""), onclick: () => { state.ui.areaFilter = null; save(); renderAll(); } },
    [el("span", { class: "dot", style: "background:var(--accent)" }), "All areas"]);
  areaWrap.appendChild(allRow);
  state.areas.forEach(a => {
    const count = state.tasks.filter(t => t.area === a.id && t.status !== "done").length;
    const row = el("div", { class: "filter-row" + (state.ui.areaFilter === a.id ? " active" : ""), onclick: () => { state.ui.areaFilter = state.ui.areaFilter === a.id ? null : a.id; save(); renderAll(); } },
      [
        el("span", { class: "dot", style: `background:${a.color}` }), a.label, el("span", { class: "count" }, String(count)),
        el("span", { class: "team-remove", title: "Remove area", style: "margin-left:6px", onclick: (e) => { e.stopPropagation(); if (confirm(`Remove "${a.label}"? Its tasks will move to another area.`)) removeArea(a.id); } }, "✕"),
      ]);
    areaWrap.appendChild(row);
  });
  areaWrap.appendChild(el("div", { class: "filter-row", style: "color:var(--accent)", onclick: () => { const name = prompt("New focus area name:"); if (name && name.trim()) addArea(name.trim()); } },
    [el("span", { class: "dot", style: "background:none;border:1.5px dashed var(--accent)" }), "+ Add area"]));

  const asWrap = document.getElementById("assigneeFilters");
  asWrap.innerHTML = "";
  state.team.forEach(m => {
    const count = state.tasks.filter(t => t.assignee === m.id && t.status !== "done").length;
    const row = el("div", { class: "filter-row" + (state.ui.assigneeFilter === m.id ? " active" : ""), onclick: () => { state.ui.assigneeFilter = state.ui.assigneeFilter === m.id ? null : m.id; save(); renderAll(); } },
      [avatarEl(m.name, 18), m.name.split(" ")[0], el("span", { class: "count" }, String(count))]);
    asWrap.appendChild(row);
  });
}

function avatarEl(name, size = 22) {
  const a = el("div", { class: "avatar", style: `background:${colorFor(name)};width:${size}px;height:${size}px;font-size:${size * 0.42}px;` }, initials(name));
  return a;
}

function renderTodayFocus() {
  const wrap = document.getElementById("todayFocus");
  wrap.innerHTML = "";
  const items = state.tasks
    .filter(t => t.status !== "done" && (isOverdue(t) || isDueToday(t) || t.priority === "urgent"))
    .sort((a, b) => {
      const score = t => (isOverdue(t) ? 0 : isDueToday(t) ? 1 : t.priority === "urgent" ? 2 : 3);
      return score(a) - score(b);
    })
    .slice(0, 5);
  if (!items.length) { wrap.appendChild(el("div", { class: "empty-note" }, "Nothing urgent — clear runway today.")); return; }
  items.forEach(t => {
    const color = isOverdue(t) ? "var(--red)" : isDueToday(t) ? "var(--amber)" : "var(--purple)";
    const memberName = state.team.find(m => m.id === t.assignee)?.name || "Unassigned";
    const row = el("div", { class: "focus-item", onclick: () => openModal(t) }, [
      el("span", { class: "fdot", style: `background:${color}` }),
      el("div", {}, [el("div", { class: "ft" }, t.title), el("div", { class: "fm" }, `${memberName}${t.due ? " · " + fmtDate(t.due) : ""}`)]),
    ]);
    wrap.appendChild(row);
  });
}

function renderTemplates() {
  const wrap = document.getElementById("templateChips");
  wrap.innerHTML = "";
  TEMPLATES.forEach(t => {
    const chip = el("div", { class: "tpl-chip", onclick: () => { document.getElementById("quickAddInput").value = t + " "; document.getElementById("quickAddInput").focus(); } }, t);
    wrap.appendChild(chip);
  });
}

function renderKPIs() {
  const k = computeKPIs();
  const wrap = document.getElementById("kpiRow");
  wrap.innerHTML = "";
  const items = [
    { label: "Open tasks", value: k.open, color: "var(--blue)" },
    { label: "In progress", value: k.inprogress, color: "var(--amber)" },
    { label: "Overdue", value: k.overdue, color: "var(--red)" },
    { label: "Done this week", value: k.doneThisWeek, color: "var(--green)" },
  ];
  items.forEach(i => {
    wrap.appendChild(el("div", { class: "kpi", style: `--k-color:${i.color}` }, [el("b", {}, String(i.value)), el("span", {}, i.label)]));
  });
  const ring = buildRing(k.completionRate);
  wrap.appendChild(el("div", { class: "kpi ring" }, [ring, el("div", {}, [el("b", {}, k.completionRate + "%"), el("span", {}, "Overall complete")])]));
}

function buildRing(pct) {
  const size = 46, stroke = 5, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", size); svg.setAttribute("height", size); svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  const bg = document.createElementNS(svgNS, "circle");
  bg.setAttribute("cx", size / 2); bg.setAttribute("cy", size / 2); bg.setAttribute("r", r);
  bg.setAttribute("stroke", "var(--border)"); bg.setAttribute("stroke-width", stroke); bg.setAttribute("fill", "none");
  const fg = document.createElementNS(svgNS, "circle");
  fg.setAttribute("cx", size / 2); fg.setAttribute("cy", size / 2); fg.setAttribute("r", r);
  fg.setAttribute("stroke", "var(--accent)"); fg.setAttribute("stroke-width", stroke); fg.setAttribute("fill", "none");
  fg.setAttribute("stroke-dasharray", c); fg.setAttribute("stroke-dashoffset", off);
  fg.setAttribute("stroke-linecap", "round");
  fg.setAttribute("transform", `rotate(-90 ${size / 2} ${size / 2})`);
  svg.appendChild(bg); svg.appendChild(fg);
  return svg;
}

let dragId = null;

function renderBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  const tasks = filteredTasks();
  STATUSES.forEach(s => {
    const colTasks = tasks.filter(t => t.status === s.id);
    const col = el("div", { class: "col" });
    col.appendChild(el("div", { class: "col-head" }, [
      el("span", { class: "dot", style: `background:${s.color}` }), el("b", {}, s.label), el("span", { class: "n" }, String(colTasks.length)),
    ]));
    const body = el("div", { class: "col-body" });
    if (!colTasks.length) body.appendChild(el("div", { class: "empty-col" }, "No tasks here"));
    colTasks.forEach(t => body.appendChild(taskCard(t)));
    col.appendChild(body);

    col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("dragover"); });
    col.addEventListener("dragleave", () => col.classList.remove("dragover"));
    col.addEventListener("drop", e => {
      e.preventDefault(); col.classList.remove("dragover");
      if (dragId) updateTask(dragId, { status: s.id });
    });
    board.appendChild(col);
  });
}

function taskCard(t) {
  const prio = prioMeta(t.priority);
  const area = areaMeta(t.area);
  const member = state.team.find(m => m.id === t.assignee);
  const card = el("div", { class: "card", draggable: "true", onclick: () => openModal(t) });
  card.addEventListener("dragstart", () => { dragId = t.id; card.classList.add("dragging"); });
  card.addEventListener("dragend", () => { dragId = null; card.classList.remove("dragging"); });

  card.appendChild(el("div", { class: "ctop" }, [
    el("span", { class: "flag", style: `background:${prio.color}`, title: prio.label + " priority" }),
    el("div", { class: "title" }, t.title),
  ]));
  const meta = el("div", { class: "meta" }, [
    el("span", { class: "tagchip", style: `color:${area.color};background:color-mix(in srgb, ${area.color} 16%, transparent)` }, area.label),
  ]);
  if (t.due) {
    const cls = isOverdue(t) ? "overdue" : isDueToday(t) ? "today" : "";
    meta.appendChild(el("span", { class: "duechip " + cls }, fmtDate(t.due)));
  }
  card.appendChild(meta);
  card.appendChild(el("div", { class: "crow" }, [
    ...t.tags.slice(0, 2).map(tag => el("span", { class: "duechip" }, "#" + tag)),
    member ? avatarEl(member.name, 22) : el("span", { class: "duechip", style: "margin-left:auto" }, "Unassigned"),
  ]));
  return card;
}

function renderTeamTab() {
  const wrap = document.getElementById("teamGrid");
  wrap.innerHTML = "";
  state.team.forEach(m => {
    const mine = state.tasks.filter(t => t.assignee === m.id);
    const done = mine.filter(t => t.status === "done").length;
    const open = mine.length - done;
    const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
    const card = el("div", { class: "team-card" }, [
      el("div", { class: "team-head" }, [
        avatarEl(m.name, 40),
        el("div", {}, [el("div", { class: "team-name" }, m.name), el("div", { class: "team-role" }, m.role)]),
        el("span", { class: "team-remove", title: "Remove", onclick: (e) => { e.stopPropagation(); if (confirm(`Remove ${m.name} from the team?`)) removeTeamMember(m.id); } }, "✕"),
      ]),
      el("div", { class: "team-stats" }, [
        el("div", { class: "tstat" }, [el("b", {}, String(open)), el("span", {}, "Open")]),
        el("div", { class: "tstat" }, [el("b", {}, String(done)), el("span", {}, "Done")]),
        el("div", { class: "tstat" }, [el("b", {}, pct + "%"), el("span", {}, "Complete")]),
      ]),
      el("div", { class: "bar" }, [el("i", { style: `width:${pct}%;background:var(--green)` })]),
    ]);
    wrap.appendChild(card);
  });
  wrap.appendChild(el("div", { class: "add-team-card", onclick: () => {
    const name = prompt("Team member name:");
    if (!name || !name.trim()) return;
    const role = prompt("Role (optional):") || "";
    addTeamMember(name.trim(), role.trim());
  } }, [el("span", {}, "+ Add team member")]));
}

function renderTimelineTab() {
  const wrap = document.getElementById("timelineList");
  wrap.innerHTML = "";
  if (!state.activity.length) { wrap.appendChild(el("div", { class: "empty-note" }, "No activity yet.")); return; }
  state.activity.slice(0, 60).forEach(a => {
    wrap.appendChild(el("div", { class: "tl-item" }, [
      el("div", {}, [el("div", { class: "tl-text" }, a.text), el("div", { class: "tl-time" }, new Date(a.time).toLocaleString())]),
    ]));
  });
}

function fillSelect(select, options, valueKey, labelKey, includeEmpty) {
  select.innerHTML = "";
  if (includeEmpty) select.appendChild(el("option", { value: "" }, includeEmpty));
  options.forEach(o => select.appendChild(el("option", { value: o[valueKey] }, o[labelKey])));
}

function renderAll() {
  document.getElementById("dateLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  renderSidebarFilters();
  renderTodayFocus();
  renderKPIs();
  renderBoard();
  renderTeamTab();
  renderTimelineTab();
}

/* ---------------- Modal ---------------- */
let editingId = null;
function openModal(task) {
  editingId = task ? task.id : null;
  document.getElementById("modalTitle").textContent = task ? "Edit task" : "New task";
  fillSelect(document.getElementById("f-area"), state.areas, "id", "label");
  fillSelect(document.getElementById("f-assignee"), state.team, "id", "name", "Unassigned");
  document.getElementById("f-title").value = task?.title || "";
  document.getElementById("f-notes").value = task?.notes || "";
  document.getElementById("f-area").value = task?.area || "general";
  document.getElementById("f-assignee").value = task?.assignee || "";
  document.getElementById("f-priority").value = task?.priority || "medium";
  document.getElementById("f-status").value = task?.status || "todo";
  document.getElementById("f-due").value = task?.due || "";
  document.getElementById("f-tags").value = (task?.tags || []).join(", ");
  document.getElementById("deleteTaskBtn").style.display = task ? "inline-block" : "none";
  document.getElementById("overlay").classList.add("show");
  setTimeout(() => document.getElementById("f-title").focus(), 30);
}
function closeModal() { document.getElementById("overlay").classList.remove("show"); editingId = null; }

document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("cancelTaskBtn").addEventListener("click", closeModal);
document.getElementById("overlay").addEventListener("click", e => { if (e.target.id === "overlay") closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

document.getElementById("saveTaskBtn").addEventListener("click", () => {
  const title = document.getElementById("f-title").value.trim();
  if (!title) { toast("Title can't be empty"); return; }
  const patch = {
    title, notes: document.getElementById("f-notes").value.trim(),
    area: document.getElementById("f-area").value, assignee: document.getElementById("f-assignee").value || null,
    priority: document.getElementById("f-priority").value, status: document.getElementById("f-status").value,
    due: document.getElementById("f-due").value || null,
    tags: document.getElementById("f-tags").value.split(",").map(s => s.trim()).filter(Boolean),
  };
  if (editingId) updateTask(editingId, patch); else addTask(patch);
  closeModal();
});
document.getElementById("deleteTaskBtn").addEventListener("click", () => {
  if (editingId && confirm("Delete this task?")) { deleteTask(editingId); closeModal(); }
});

/* ---------------- Quick add + toolbar ---------------- */
document.getElementById("quickAddForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("quickAddInput");
  if (!input.value.trim()) return;
  const parsed = parseQuickAdd(input.value);
  addTask(parsed);
  input.value = "";
  toast("Task added");
});

document.addEventListener("keydown", e => {
  if (e.key === "n" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    e.preventDefault(); document.getElementById("quickAddInput").focus();
  }
});

document.getElementById("themeToggle").addEventListener("click", () => {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  state.ui.theme = next; save();
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `forgeboard-backup-${todayISO()}.json`; a.click();
  URL.revokeObjectURL(url);
  toast("Backup exported");
});
document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.team || !data.tasks) throw new Error("bad format");
      state = data;
      state.ui = state.ui || { theme: "dark", areaFilter: null, assigneeFilter: null, tab: "board" };
      save(); renderAll();
      toast("Backup imported");
    } catch (err) { toast("Import failed — invalid file"); }
  };
  reader.readAsText(file);
  e.target.value = "";
});

/* ---------------- Tabs ---------------- */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const name = tab.dataset.tab;
    state.ui.tab = name; save();
    document.getElementById("view-board").style.display = name === "board" ? "" : "none";
    document.getElementById("view-team").style.display = name === "team" ? "" : "none";
    document.getElementById("view-timeline").style.display = name === "timeline" ? "" : "none";
  });
});

/* ---------------- Toast ---------------- */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------------- Init ---------------- */
document.documentElement.setAttribute("data-theme", state.ui.theme || "dark");
if (state.ui.tab && state.ui.tab !== "board") {
  document.querySelector(`.tab[data-tab="${state.ui.tab}"]`)?.click();
}
renderAll();
