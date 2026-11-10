import { describe, expect, it } from 'vitest';
import { dueInfo, emptyTask, filterTasks, validateTask, type Task } from '../src/lib/model';
const task = (changes: Partial<Task> = {}): Task => ({ ...emptyTask(), id: 'one', title: 'Build board', user_id: 'guest', created_at: '', updated_at: '', ...changes });
describe('task validation', () => {
  it('trims content and rejects blank or oversized titles', () => {
    expect(validateTask({ ...emptyTask(), title: '  Plan  ', description: ' details ' }).title).toBe('Plan');
    expect(() => validateTask({ ...emptyTask(), title: '   ' })).toThrow();
    expect(() => validateTask({ ...emptyTask(), title: 'a'.repeat(161) })).toThrow();
  });
  it('strips immutable owner and metadata fields from updates', () => {
    const input = task({ user_id: 'owner', status: 'done' });
    const safe = validateTask(input);
    expect(safe).not.toHaveProperty('user_id');
    expect(safe).not.toHaveProperty('id');
    expect(safe).not.toHaveProperty('created_at');
    expect(safe.status).toBe('done');
  });
  it('rejects impossible and malformed due dates', () => {
    for (const date of ['2026-02-30', '2026-13-01', 'nonsense', '2026-2-1']) expect(() => validateTask({ ...emptyTask(), title: 'Date', due_date: date })).toThrow();
    expect(validateTask({ ...emptyTask(), title: 'Date', due_date: '2028-02-29' }).due_date).toBe('2028-02-29');
  });
  it('does not mark completed tasks overdue', () => {
    expect(dueInfo(task({ due_date: '2026-11-08' }), '2026-11-09')?.overdue).toBe(true);
    expect(dueInfo(task({ status: 'done', due_date: '2026-11-08' }), '2026-11-09')?.overdue).toBe(false);
    expect(dueInfo(task({ due_date: null }))).toBe(null);
  });
  it('combines text, priority, category, and overdue filters', () => {
    const tasks = [task({ id: 'a', description: 'Guest security', priority: 'high', category: 'Engineering', due_date: '2020-01-01' }), task({ id: 'b', priority: 'low' })];
    expect(filterTasks(tasks, ' SECURITY ', 'high', 'Engineering', true).map(t => t.id)).toEqual(['a']);
    expect(filterTasks(tasks, 'missing', 'all', 'all', false)).toEqual([]);
  });
});
