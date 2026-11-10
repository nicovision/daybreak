import { useDraggable } from '@dnd-kit/core';
import { ArrowUp, CalendarDays, Check, GripVertical, Minus, ArrowDown, AlignLeft } from 'lucide-react';
import { dueInfo, type Task } from '../lib/model';
export function CardContent({ task }: { task: Task }) {
  const due = dueInfo(task);
  return <>
    <div className="card-top"><span className={`tag tag-${task.category.toLowerCase()}`}>{task.category}</span>{task.status === 'done' && <Check size={15} className="done-check" />}</div>
    <h3>{task.title}</h3>
    {task.description && <p className="card-description">{task.description}</p>}
    <div className="card-footer">
      <span className={`priority priority-${task.priority}`}>{task.priority === 'high' ? <ArrowUp size={13} /> : task.priority === 'low' ? <ArrowDown size={13} /> : <Minus size={13} />}{task.priority === 'normal' ? 'Normal' : task.priority === 'high' ? 'High' : 'Low'}</span>
      <span className="card-meta">{task.description && <AlignLeft size={13} aria-label="Has description" />}{due && <span className={`due ${due.overdue ? 'overdue' : due.isToday ? 'due-today' : ''}`} title={due.overdue ? 'Overdue' : task.due_date!}><CalendarDays size={12} />{due.label}{due.overdue && <span className="sr-only">, overdue</span>}</span>}</span>
    </div>
  </>;
}
export default function TaskCard({ task, onOpen, disabled }: { task: Task; onOpen: (task: Task) => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled });
  return <article ref={setNodeRef} className={`task-card ${isDragging ? 'is-dragging' : ''}`} style={{ transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined }}>
    <button className="card-open" onClick={() => onOpen(task)} disabled={disabled} aria-label={`Open task: ${task.title}`}><CardContent task={task} /></button>
    <button className="drag-handle" {...attributes} {...listeners} aria-label={`Move task: ${task.title}`} title="Drag to move. Or open the task to change status." disabled={disabled}><GripVertical size={16} /></button>
  </article>;
}
