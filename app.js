import * as store from './storage.js';

const COLORS = {
  black: '#000000',
  red: '#ff5a5a',
  blue: '#1a84ff',
  green: '#1a9480',
  orange: '#b85a14',
  pink: '#ff66f0',
};
const COLOR_NAMES = { black: '검정', red: '빨강', blue: '파랑', green: '초록', orange: '주황', pink: '분홍' };
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_REPEAT = 60;

const $ = id => document.getElementById(id);

const state = {
  date: todayKey(),
  color: 'black',
  editingId: null,
};

// ---------- 날짜 도우미 ----------
function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function todayKey() { return toKey(new Date()); }
function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
function addMonths(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const lastDay = new Date(y, m - 1 + n + 1, 0).getDate(); // 31일 → 30일·28일처럼 말일로 맞춤
  return toKey(new Date(y, m - 1 + n, Math.min(d, lastDay)));
}
function longLabel(key) {
  const d = fromKey(key);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}
function shortLabel(key) {
  return `${key}(${WEEKDAYS[fromKey(key).getDay()]})`;
}

// ---------- 확인 창 / 알림 ----------
function ask(message, buttons) {
  // buttons: [{ label, value, style }]
  return new Promise(resolve => {
    $('dialogMsg').textContent = message;
    const box = $('dialogBtns');
    box.replaceChildren();
    const close = value => { $('dialog').hidden = true; resolve(value); };
    for (const b of buttons) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `btn ${b.style || 'outline'}`;
      el.textContent = b.label;
      el.onclick = () => close(b.value);
      box.append(el);
    }
    $('dialog').onclick = e => { if (e.target === $('dialog')) close(null); };
    $('dialog').hidden = false;
  });
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

// ---------- 하루 탭 ----------
function makeCheck(todo, onToggle) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'check';
  btn.setAttribute('aria-label', todo.done ? '완료 취소' : '완료');
  if (todo.done) {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  } else {
    btn.style.background = COLORS[todo.color] || COLORS.black;
  }
  btn.onclick = onToggle;
  return btn;
}

async function renderDay() {
  $('dayTitle').textContent = longLabel(state.date);
  $('dateLabel').textContent = shortLabel(state.date);
  $('datePicker').value = state.date;

  const todos = await store.getTodosByDate(state.date);
  const list = $('todoList');
  list.replaceChildren();
  $('emptyMsg').hidden = todos.length > 0;

  for (const t of todos) {
    const li = document.createElement('li');
    li.className = 'todo' + (t.done ? ' done' : '');

    const toggle = async () => { await store.updateTodo(t.id, { done: !t.done }); renderDay(); };
    const check = makeCheck(t, toggle);

    const text = document.createElement('button');
    text.type = 'button';
    text.className = 'todo-text';
    text.textContent = t.text;
    if (!t.done) text.style.color = t.color === 'black' ? '' : COLORS[t.color];
    text.onclick = toggle;

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-btn';
    edit.textContent = '수정';
    edit.onclick = () => startEdit(t);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del-btn';
    del.setAttribute('aria-label', '삭제');
    del.textContent = '✕';
    del.onclick = () => removeTodo(t);

    li.append(check, text, edit, del);
    list.append(li);
  }
}

async function removeTodo(t) {
  let choice;
  if (t.repeatId) {
    choice = await ask(`"${t.text}"\n반복 일정이에요. 어떻게 삭제할까요?`, [
      { label: '이 일정만 삭제', value: 'one', style: 'danger' },
      { label: '이 일정부터 이후 반복 모두 삭제', value: 'after', style: 'outline' },
      { label: '취소', value: null, style: 'ghost' },
    ]);
  } else {
    choice = await ask(`"${t.text}"\n삭제할까요?`, [
      { label: '삭제', value: 'one', style: 'danger' },
      { label: '취소', value: null, style: 'ghost' },
    ]);
  }
  if (choice === 'one') await store.deleteTodo(t.id);
  if (choice === 'after') await store.deleteRepeatFrom(t.repeatId, t.date);
  if (choice) { if (state.editingId === t.id) endEdit(); renderDay(); }
}

// ---------- 입력 폼 ----------
function renderColors() {
  const box = $('colorPicker');
  box.replaceChildren();
  for (const [name, hex] of Object.entries(COLORS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (state.color === name ? ' selected' : '');
    b.style.background = hex;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', state.color === name);
    b.setAttribute('aria-label', COLOR_NAMES[name]);
    b.onclick = () => { state.color = name; renderColors(); };
    box.append(b);
  }
}

function fillRepeatCount() {
  const sel = $('repeatCount');
  for (let i = 2; i <= MAX_REPEAT; i++) {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `${i}회`;
    sel.append(o);
  }
  sel.value = 10;
}

function startEdit(t) {
  state.editingId = t.id;
  state.color = t.color;
  $('todoText').value = t.text;
  $('repeatRow').hidden = true;
  $('editNotice').hidden = false;
  $('saveBtn').textContent = '수정 완료';
  $('cancelEditBtn').hidden = false;
  renderColors();
  $('todoForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('todoText').focus();
}

function endEdit() {
  state.editingId = null;
  $('todoText').value = '';
  $('repeatRow').hidden = false;
  $('editNotice').hidden = true;
  $('saveBtn').textContent = '저장';
  $('cancelEditBtn').hidden = true;
}

async function onSubmit(e) {
  e.preventDefault();
  const text = $('todoText').value.trim();
  if (!text) { $('todoText').focus(); return; }

  if (state.editingId) {
    await store.updateTodo(state.editingId, { text, color: state.color });
    endEdit();
    renderDay();
    return;
  }

  const type = $('repeatType').value;
  const count = type === 'none' ? 1 : Number($('repeatCount').value);
  const repeatId = type === 'none' ? null : store.newId();
  const now = Date.now();
  const todos = [];
  for (let i = 0; i < count; i++) {
    let date = state.date;
    if (type === 'daily') date = addDays(state.date, i);
    if (type === 'weekly') date = addDays(state.date, i * 7);
    if (type === 'monthly') date = addMonths(state.date, i);
    todos.push({ id: store.newId(), date, text, color: state.color, done: false, repeatId, createdAt: now + i });
  }
  await store.addTodos(todos);
  $('todoText').value = '';
  if (count > 1) toast(`${count}회 반복 일정을 저장했어요`);
  renderDay();
}

// ---------- 날짜 이동 ----------
function goTo(date) {
  state.date = date;
  if (state.editingId) endEdit();
  renderDay();
}

// ---------- 검색 탭 ----------
let searchTimer;
async function renderSearch() {
  const q = $('searchInput').value;
  const list = $('searchResults');
  list.replaceChildren();
  if (!q.trim()) { $('searchInfo').textContent = ''; return; }

  const results = await store.searchTodos(q);
  $('searchInfo').textContent = results.length ? `${results.length}개를 찾았어요` : '찾는 할 일이 없어요';

  for (const t of results) {
    const li = document.createElement('li');
    li.className = 'todo' + (t.done ? ' done' : '');
    const check = makeCheck(t, async () => { await store.updateTodo(t.id, { done: !t.done }); renderSearch(); });

    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'search-hit';
    const date = document.createElement('span');
    date.className = 'search-date';
    date.textContent = shortLabel(t.date);
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = t.text;
    if (!t.done && t.color !== 'black') text.style.color = COLORS[t.color];
    hit.append(date, text);
    hit.onclick = () => { switchTab('day'); goTo(t.date); };

    li.append(check, hit);
    list.append(li);
  }
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $('dayView').hidden = name !== 'day';
  $('searchView').hidden = name !== 'search';
  if (name === 'search') { renderSearch(); $('searchInput').focus(); }
  if (name === 'day') renderDay();
}

// ---------- 설정: 백업 / 복원 ----------
async function renderBackupInfo() {
  const meta = await store.getMeta();
  $('backupInfo').textContent = meta.lastBackup
    ? `마지막 백업: ${new Date(meta.lastBackup).toLocaleString('ko-KR')}`
    : '아직 백업한 적이 없어요.';
}

async function exportBackup() {
  const data = await store.exportData();
  const json = JSON.stringify(data, null, 2);
  const name = `sososaru-backup-${todayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '소소하루 백업' });
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    await store.setMeta({ lastBackup: Date.now() });
    renderBackupInfo();
    toast(`할 일 ${data.todos.length}개를 백업했어요`);
  } catch (err) {
    if (err && err.name === 'AbortError') return; // 공유 창을 닫은 경우
    toast('백업 파일을 만들지 못했어요');
  }
}

async function importBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    toast('파일을 읽을 수 없어요');
    return;
  }
  const n = Array.isArray(data) ? data.length : (data && Array.isArray(data.todos) ? data.todos.length : 0);
  const ok = await ask(`백업 파일의 할 일 ${n}개로 지금 데이터를 바꿀까요?\n지금 있는 할 일은 사라져요.`, [
    { label: '복원하기', value: true, style: 'primary' },
    { label: '취소', value: false, style: 'ghost' },
  ]);
  if (!ok) return;
  try {
    const count = await store.importData(data);
    toast(`할 일 ${count}개를 복원했어요`);
    $('settingsSheet').hidden = true;
    renderDay();
  } catch (err) {
    toast(err.message || '복원하지 못했어요');
  }
}

// ---------- 시작 ----------
function bind() {
  document.querySelectorAll('.tab').forEach(b => { b.onclick = () => switchTab(b.dataset.tab); });
  $('todoForm').addEventListener('submit', onSubmit);
  $('cancelEditBtn').onclick = endEdit;
  $('repeatType').onchange = () => { $('repeatCount').disabled = $('repeatType').value === 'none'; };
  $('todayBtn').onclick = () => goTo(todayKey());
  $('tomorrowBtn').onclick = () => goTo(addDays(todayKey(), 1));
  $('datePicker').onchange = e => { if (e.target.value) goTo(e.target.value); };
  $('searchInput').oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderSearch, 150); };

  $('settingsBtn').onclick = () => { renderBackupInfo(); $('settingsSheet').hidden = false; };
  $('closeSettingsBtn').onclick = () => { $('settingsSheet').hidden = true; };
  $('settingsSheet').onclick = e => { if (e.target === $('settingsSheet')) $('settingsSheet').hidden = true; };
  $('exportBtn').onclick = exportBackup;
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) importBackup(f);
  };

  // 앱을 켜 둔 채 날짜가 바뀌면, 오늘을 보고 있던 경우 새 날짜로 넘어감
  let lastToday = todayKey();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const now = todayKey();
    if (now !== lastToday && state.date === lastToday) goTo(now);
    lastToday = now;
  });
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  } catch { /* 미리보기 등 서비스워커를 못 쓰는 곳 */ }
}

fillRepeatCount();
renderColors();
bind();
renderDay();
registerSW();
