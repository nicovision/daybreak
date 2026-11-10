import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Task, TaskInput } from './model';
import { validateTask } from './model';
import { seedTasks } from './seed';
export interface Repository {
  mode: 'demo' | 'cloud'; userId: string;
  list(): Promise<Task[]>;
  create(input: TaskInput): Promise<Task>;
  update(id: string, input: TaskInput): Promise<Task>;
  remove(id: string): Promise<void>;
}
const storageKey = 'daybreak-demo-v1';
function demoRepository(): Repository {
  let state: { userId: string; tasks: Task[] };
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.userId || !Array.isArray(parsed.tasks)) throw new Error('Invalid data');
      state = parsed;
    } else {
      const userId = crypto.randomUUID();
      state = { userId, tasks: seedTasks(userId) };
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  } catch { throw new Error('Your browser could not load the local demo. Allow site storage, or clear this site’s stored data and reload.'); }
  const commit = (tasks: Task[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ ...state, tasks })); }
    catch { throw new Error('Your browser could not save this change. Check that site storage is enabled and has space.'); }
    state = { ...state, tasks };
  };
  return {
    mode: 'demo', userId: state.userId,
    async list() { return [...state.tasks]; },
    async create(input) {
      const task: Task = { ...validateTask(input), id: crypto.randomUUID(), user_id: state.userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      commit([...state.tasks, task]); return task;
    },
    async update(id, input) {
      const original = state.tasks.find(t => t.id === id);
      if (!original) throw new Error('This task no longer exists. Refresh the board and try again.');
      const task = { ...original, ...validateTask(input), updated_at: new Date().toISOString() };
      commit(state.tasks.map(t => t.id === id ? task : t)); return task;
    },
    async remove(id) { commit(state.tasks.filter(t => t.id !== id)); },
  };
}
let client: SupabaseClient | undefined;
async function cloudRepository(url: string, key: string): Promise<Repository> {
  client ??= createClient(url, key);
  const db = client;
  const { data, error } = await db.auth.getSession();
  if (error) throw error;
  let userId = data.session?.user.id;
  if (!userId) {
    const { data: guest, error: guestError } = await db.auth.signInAnonymously();
    if (guestError) throw new Error(`Could not start your guest session: ${guestError.message}. Check that anonymous sign-ins are enabled in Supabase.`);
    userId = guest.user!.id;
  }
  const owner = userId;
  return {
    mode: 'cloud', userId: owner,
    async list() {
      const { data, error } = await db.from('tasks').select('*').eq('user_id', owner).order('created_at');
      if (error) throw error; return data as Task[];
    },
    async create(input) {
      const { data, error } = await db.from('tasks').insert({ ...validateTask(input), user_id: owner }).select().single();
      if (error) throw error; return data as Task;
    },
    async update(id, input) {
      const { data, error } = await db.from('tasks').update(validateTask(input)).eq('id', id).eq('user_id', owner).select().single();
      if (error) throw error; return data as Task;
    },
    async remove(id) {
      const { data, error } = await db.from('tasks').delete().eq('id', id).eq('user_id', owner).select('id').single();
      if (error) throw error;
      if (!data) throw new Error('This task could not be deleted. Refresh the board and try again.');
    },
  };
}
let initialization: Promise<Repository> | undefined;
export function getRepository(): Promise<Repository> {
  // A single initialization also prevents duplicate guest creation under React StrictMode.
  initialization ??= (async () => {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (Boolean(url) !== Boolean(key)) throw new Error('Supabase setup is incomplete. Add both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.');
    return url && key ? cloudRepository(url, key) : demoRepository();
  })().catch(error => { initialization = undefined; throw error; });
  return initialization;
}
