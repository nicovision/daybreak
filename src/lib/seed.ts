import type { Task, TaskInput } from './model';
import { localDate } from './model';
export function seedTasks(userId: string): Task[] {
  const date = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return localDate(d); };
  const samples: TaskInput[] = [
    { title: 'Explore the next big idea', description: 'Collect a few inspiring references and sketch three directions. Great work starts with a little curiosity.', status: 'todo', priority: 'normal', category: 'Research', due_date: date(3) },
    { title: 'Map out the onboarding journey', description: 'Make the first five minutes feel effortless. Think about the welcome, first action, and first small win.', status: 'todo', priority: 'high', category: 'Product', due_date: date(1) },
    { title: 'Write a friendlier empty state', description: 'A blank page can be an invitation. Write a short message that helps someone take the next step.', status: 'todo', priority: 'low', category: 'Design', due_date: null },
    { title: 'Bring the board to life', description: 'Try dragging this card to another column. You can also open a task and change its status with the dropdown.', status: 'in_progress', priority: 'high', category: 'Engineering', due_date: date(0) },
    { title: 'Give the details a little love', description: 'Refine spacing, focus states, and the moments between interactions.', status: 'in_progress', priority: 'normal', category: 'Design', due_date: date(2) },
    { title: 'Review the first prototype', description: 'Take a fresh look at the core flow. What feels clear? Where do we need one less step?', status: 'in_review', priority: 'normal', category: 'Product', due_date: date(-1) },
    { title: 'Check the small-screen experience', description: 'Make sure the board is comfortable to use on a phone, including task creation and moving cards.', status: 'in_review', priority: 'high', category: 'Engineering', due_date: date(1) },
    { title: 'Find our visual direction', description: 'Warm neutrals, forest green, and plenty of breathing room. A workspace that helps you focus.', status: 'done', priority: 'normal', category: 'Design', due_date: date(-2) },
    { title: 'Make space for good work', description: 'A clear board, a fresh start, and a little momentum.', status: 'done', priority: 'low', category: 'General', due_date: null },
  ];
  return samples.map((task, i) => ({ ...task, id: crypto.randomUUID(), user_id: userId, created_at: new Date(Date.now() - (samples.length - i) * 60000).toISOString(), updated_at: new Date().toISOString() }));
}
