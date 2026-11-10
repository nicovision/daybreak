import { useEffect, useRef, useState } from 'react';
import { X, Trash2, ArrowUpRight, CalendarDays } from 'lucide-react';
import { categories, columns, validateTask, type Task, type TaskInput } from '../lib/model';
export default function TaskDialog({ initial, task, busy, serverError, onClose, onSave, onDelete }: {
  initial: TaskInput; task?: Task; busy: boolean; serverError: string; onClose: () => void;
  onSave: (input: TaskInput, id?: string) => Promise<boolean>; onDelete: (id: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(busy); busyRef.current = busy;
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  useEffect(() => {
    const el = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    el.showModal();
    el.querySelector<HTMLInputElement>('#task-title')?.focus();
    return () => { el.close(); previous?.focus(); };
  }, []);
  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onClose();
  };
  const set = <K extends keyof TaskInput>(key: K, next: TaskInput[K]) => setValue(current => ({ ...current, [key]: next }));
  return <dialog ref={dialog} className="task-dialog" aria-labelledby="task-dialog-title" onCancel={event => { event.preventDefault(); if (!busyRef.current) close(); }}>
    <div className="dialog-heading"><button type="button" className="icon-button" aria-label="Close task editor" disabled={busy} onClick={close}><X size={19} /></button></div>
    <h2 id="task-dialog-title">{task ? 'A little more detail.' : 'New task'}</h2>
    {task && <p className="dialog-subtitle">Keep the details clear and the work moving.</p>}
    <form onSubmit={async event => {
      event.preventDefault(); setError('');
      try { const input = validateTask(value); if (await onSave(input, task?.id)) onClose(); }
      catch (error) { setError(error instanceof Error ? error.message : 'Check the task details and try again.'); }
    }}>
      <fieldset disabled={busy}>
        <label className="field-label" htmlFor="task-title">Task title <span>*</span></label>
        <input id="task-title" autoFocus required maxLength={160} placeholder="What would you like to work on?" value={value.title} onChange={e => set('title', e.target.value)} />
        <label className="field-label" htmlFor="task-description">Description <span className="optional">optional</span></label>
        <textarea id="task-description" maxLength={4000} rows={4} placeholder="A few details, a little context…" value={value.description} onChange={e => set('description', e.target.value)} />
        <div className="field-grid">
          <div><label className="field-label" htmlFor="task-status">Status</label><select id="task-status" value={value.status} onChange={e => set('status', e.target.value as TaskInput['status'])}>{columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div><label className="field-label" htmlFor="task-priority">Priority</label><select id="task-priority" value={value.priority} onChange={e => set('priority', e.target.value as TaskInput['priority'])}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></div>
          <div><label className="field-label" htmlFor="task-category">Category</label><select id="task-category" value={value.category} onChange={e => set('category', e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className="field-label" htmlFor="task-due">Due date <CalendarDays size={13} /></label><input id="task-due" type="date" min="1900-01-01" max="9999-12-31" value={value.due_date ?? ''} onChange={e => set('due_date', e.target.value || null)} /></div>
        </div>
        {task && <p className="created-date">Created {new Date(task.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
      </fieldset>
      {(error || serverError) && <p className="form-error" role="alert">{error || serverError}</p>}
      <div className="dialog-actions">
        {task ? <button type="button" disabled={busy} className="delete-button" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete task</button> : <span className="required-note">* Required</span>}
        <div><button type="button" className="button secondary" onClick={close} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}{!busy && <ArrowUpRight size={16} />}</button></div>
      </div>
    </form>
    {confirmDelete && <div className="delete-confirm" role="alert"><p>Delete this task permanently?</p><div><button className="button secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep task</button><button className="button danger" disabled={busy} onClick={async () => { if (task && await onDelete(task.id)) onClose(); }}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div></div>}
  </dialog>;
}
