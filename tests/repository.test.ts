// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyTask } from '../src/lib/model';
beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); localStorage.clear(); vi.stubEnv('VITE_SUPABASE_URL', ''); vi.stubEnv('VITE_SUPABASE_ANON_KEY', ''); });
describe('demo repository', () => {
  it('preserves create, update, delete, and owner across initialization', async () => {
    const { getRepository } = await import('../src/lib/repository');
    const repo = await getRepository();
    const created = await repo.create({ ...emptyTask(), title: 'My new task' });
    expect(created.user_id).toBe(repo.userId);
    await repo.update(created.id, { ...created, status: 'done' });
    vi.resetModules();
    const next = await (await import('../src/lib/repository')).getRepository();
    expect(next.userId).toBe(repo.userId);
    expect((await next.list()).find(t => t.id === created.id)?.status).toBe('done');
    await next.remove(created.id);
    expect((await next.list()).find(t => t.id === created.id)).toBeUndefined();
  });
  it('does not re-seed an intentionally empty board', async () => {
    const repo = await (await import('../src/lib/repository')).getRepository();
    for (const task of await repo.list()) await repo.remove(task.id);
    vi.resetModules();
    const next = await (await import('../src/lib/repository')).getRepository();
    expect(await next.list()).toEqual([]);
  });
  it('reports storage failure without changing in-memory tasks', async () => {
    const repo = await (await import('../src/lib/repository')).getRepository();
    const original = await repo.list();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    await expect(repo.create({ ...emptyTask(), title: 'Unsaved task' })).rejects.toThrow('could not save');
    expect(await repo.list()).toEqual(original); spy.mockRestore();
  });
  it('initializes one guest for concurrent calls', async () => {
    const { getRepository } = await import('../src/lib/repository');
    const [a, b] = await Promise.all([getRepository(), getRepository()]);
    expect(a).toBe(b);
  });
  it('fails explicitly when Supabase configuration is incomplete', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    const { getRepository } = await import('../src/lib/repository');
    await expect(getRepository()).rejects.toThrow('incomplete');
    expect(localStorage.length).toBe(0);
  });
});
