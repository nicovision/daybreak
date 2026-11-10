export const columns = [
  { id: 'todo', label: 'To Do', hint: '', color: 'slate' },
  { id: 'in_progress', label: 'In Progress', hint: '', color: 'amber' },
  { id: 'in_review', label: 'In Review', hint: '', color: 'violet' },
  { id: 'done', label: 'Done', hint: '', color: 'green' },
] as const;
export type Status = typeof columns[number]['id'];
export type Priority = 'low' | 'normal' | 'high';
export type Task = {
  id: string; title: string; description: string; status: Status; priority: Priority;
  due_date: string | null; category: string; user_id: string; created_at: string; updated_at: string;
};
export type TaskInput = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'category'>;
export const categories = ['General', 'Design', 'Product', 'Engineering', 'Research'] as const;
export const emptyTask = (status: Status = 'todo'): TaskInput => ({ title: '', description: '', status, priority: 'normal', due_date: null, category: 'General' });
export function validateTask(value: TaskInput): TaskInput {
  const title = value.title.trim();
  if (!title || title.length > 160) throw new Error('Give your task a title between 1 and 160 characters.');
  if (value.description.length > 4000) throw new Error('Keep the description under 4,000 characters.');
  if (!columns.some(c => c.id === value.status)) throw new Error('Choose a valid task status.');
  if (!['low', 'normal', 'high'].includes(value.priority)) throw new Error('Choose a valid priority.');
  if (!categories.some(c => c === value.category)) throw new Error('Choose a valid category.');
  if (value.due_date) {
    const parsed = new Date(value.due_date + 'T12:00:00');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.due_date) || Number.isNaN(parsed.getTime()) || localDate(parsed) !== value.due_date) throw new Error('Choose a valid due date.');
  }
  // Whitelist editable fields: drag operations may pass a full task object.
  return { title, description: value.description.trim(), status: value.status, priority: value.priority, due_date: value.due_date, category: value.category };
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dueInfo(task: Pick<Task, 'status' | 'due_date'>, today = localDate()) {
  if (!task.due_date) return null;
  const date = new Date(task.due_date + 'T12:00:00');
  const overdue = task.status !== 'done' && task.due_date < today;
  const isToday = task.due_date === today;
  return { label: isToday ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue, isToday: isToday && task.status !== 'done' };
}
export function filterTasks(tasks: Task[], query: string, priority: string, category: string, overdueOnly: boolean) {
  const needle = query.toLocaleLowerCase().trim();
  return tasks.filter(task => (!needle || task.title.toLocaleLowerCase().includes(needle) || task.description.toLocaleLowerCase().includes(needle)) && (priority === 'all' || task.priority === priority) && (category === 'all' || task.category === category) && (!overdueOnly || dueInfo(task)?.overdue));
}
