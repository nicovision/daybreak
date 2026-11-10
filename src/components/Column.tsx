import { useDroppable } from '@dnd-kit/core';
import { Plus, Check } from 'lucide-react';
import TaskCard from './TaskCard';
import { columns, type Status, type Task } from '../lib/model';
export default function Column({ column, tasks, onAdd, onOpen, disabled, filtering }: {
  column: typeof columns[number]; tasks: Task[]; onAdd: (status: Status) => void; onOpen: (task: Task) => void; disabled: boolean; filtering: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return <section className={`column column-${column.color} ${isOver ? 'is-over' : ''}`} ref={setNodeRef} aria-label={column.label}>
    <div className="column-header"><div><span className="status-dot">{column.id === 'done' && <Check size={8} strokeWidth={3} />}</span><h2>{column.label}</h2><span className="column-count">{tasks.length}</span></div><button className="icon-button" onClick={() => onAdd(column.id)} disabled={disabled} aria-label={`Add task to ${column.label}`}><Plus size={17} /></button></div>
    <div className="column-tasks">{tasks.map(task => <TaskCard key={task.id} task={task} onOpen={onOpen} disabled={disabled} />)}
      {!tasks.length && <div className="column-empty"><span className="empty-mark">{column.id === 'done' ? <Check size={20} /> : <Plus size={20} />}</span>{filtering && <p>No matching tasks</p>}{(filtering || column.hint) && <span className="empty-description">{filtering ? 'Try adjusting your filters.' : column.hint}</span>}</div>}
    </div>
    <button className="add-task" disabled={disabled} onClick={() => onAdd(column.id)}><Plus size={15} /> Add task</button>
  </section>;
}
