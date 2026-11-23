// storage.js — 소소하루 저장소
// 지금은 localStorage를 쓴다. 나중에 Supabase로 바꿀 때는 이 파일만 고치면 된다.
// 모든 함수는 async라서, Supabase처럼 네트워크를 쓰는 저장소로 바꿔도 app.js는 그대로 둘 수 있다.
//
// 할 일 한 건의 모양:
// { id, date: 'YYYY-MM-DD', text, color, done, repeatId (반복으로 만든 경우), createdAt }

const KEY = 'sososaru.todos.v1';
const META_KEY = 'sososaru.meta.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function sortTodos(list) {
  // 안 한 일 먼저, 같은 상태끼리는 만든 순서
  return list.sort((a, b) => (a.done - b.done) || (a.createdAt - b.createdAt));
}

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export async function getTodosByDate(date) {
  return sortTodos(load().filter(t => t.date === date));
}

export async function searchTodos(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return load()
    .filter(t => t.text.toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || (a.createdAt - b.createdAt));
}

export async function addTodos(todos) {
  const list = load();
  list.push(...todos);
  save(list);
}

export async function updateTodo(id, patch) {
  const list = load();
  const t = list.find(x => x.id === id);
  if (t) Object.assign(t, patch);
  save(list);
}

export async function deleteTodo(id) {
  save(load().filter(t => t.id !== id));
}

// 같은 반복 묶음에서 fromDate(포함) 이후 일정을 모두 삭제
export async function deleteRepeatFrom(repeatId, fromDate) {
  save(load().filter(t => !(t.repeatId === repeatId && t.date >= fromDate)));
}

// ---- 백업 / 복원 ----

export async function exportData() {
  return {
    app: 'sososaru',
    version: 1,
    exportedAt: new Date().toISOString(),
    todos: load(),
  };
}

// 백업 파일 내용으로 지금 데이터를 통째로 바꾼다. 불러온 개수를 돌려준다.
export async function importData(data) {
  const todos = Array.isArray(data) ? data : data && data.todos;
  if (!Array.isArray(todos)) throw new Error('소소하루 백업 파일이 아니에요.');
  const clean = todos
    .filter(t => t && typeof t.text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date))
    .map(t => ({
      id: t.id || newId(),
      date: t.date,
      text: t.text,
      color: t.color || 'black',
      done: !!t.done,
      repeatId: t.repeatId || null,
      createdAt: Number(t.createdAt) || Date.now(),
    }));
  save(clean);
  return clean.length;
}

export async function getMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY)) || {};
  } catch {
    return {};
  }
}

export async function setMeta(patch) {
  const meta = await getMeta();
  localStorage.setItem(META_KEY, JSON.stringify({ ...meta, ...patch }));
}
