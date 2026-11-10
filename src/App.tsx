import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { ArrowDownUp, Check, CheckCheck, ChevronDown, Circle, CircleHelp, Cloud, LayoutGrid, LoaderCircle, Menu, Plus, Search, ShieldCheck, SlidersHorizontal, Sun, X } from 'lucide-react';
import Column from './components/Column';
import TaskDialog from './components/TaskDialog';
import { CardContent } from './components/TaskCard';
import { categories, columns, dueInfo, emptyTask, filterTasks, type Status, type Task, type TaskInput } from './lib/model';
import { getRepository, type Repository } from './lib/repository';
export default function App() {
  const [repository, setRepository] = useState<Repository>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sort, setSort] = useState('created');
  const [showFilters, setShowFilters] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [editor, setEditor] = useState<{ initial: TaskInput; task?: Task }>();
  const [activeId, setActiveId] = useState<string>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }));
  const load = useCallback(async () => {
    if (lock.current) return;
    setLoading(true); setError('');
    try { const repo = await getRepository(); const data = await repo.list(); setRepository(repo); setTasks(data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load your board. Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === 'daybreak-demo-v1' && !lock.current && repository?.mode === 'demo') window.location.reload(); };
    window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage);
  }, [repository]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer); }, [notice]);
  const mutate = async (operation: () => Promise<void>, message: string) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError('');
    try { await operation(); setNotice(message); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Your change could not be saved. Please try again.'); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const save = (input: TaskInput, id?: string) => mutate(async () => {
    if (!repository) throw new Error('Your board is still connecting. Please try again.');
    const saved = id ? await repository.update(id, input) : await repository.create(input);
    setTasks(current => id ? current.map(t => t.id === id ? saved : t) : [...current, saved]);
  }, id ? 'Task updated. A little progress, made.' : 'Task created. A good place to start.');
  const remove = (id: string) => mutate(async () => { if (!repository) throw new Error('Your board is not connected.'); await repository.remove(id); setTasks(current => current.filter(t => t.id !== id)); }, 'Task deleted. A little more breathing room.');
  const move = async ({ active, over }: DragEndEvent) => {
    setActiveId(undefined);
    const task = tasks.find(t => t.id === active.id);
    if (!task || !over || !repository || lock.current || task.status === over.id || !columns.some(c => c.id === over.id)) return;
    const moved = { ...task, status: over.id as Status };
    await mutate(async () => {
      // Settle in the destination immediately while the cloud write is pending.
      setTasks(current => current.map(t => t.id === task.id ? moved : t));
      try {
        const saved = await repository.update(task.id, moved);
        setTasks(current => current.map(t => t.id === task.id ? saved : t));
      } catch (error) {
        setTasks(current => current.map(t => t.id === task.id ? task : t));
        throw error;
      }
    }, 'Task moved.');
  };
  const filtered = useMemo(() => {
    const result = filterTasks(tasks, query, priority, category, overdueOnly);
    const ranks = { high: 0, normal: 1, low: 2 };
    return [...result].sort((a, b) => sort === 'priority' ? ranks[a.priority] - ranks[b.priority] : sort === 'due' ? (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') : a.created_at.localeCompare(b.created_at));
  }, [tasks, query, priority, category, overdueOnly, sort]);
  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => dueInfo(t)?.overdue).length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const filtering = Boolean(query.trim() || priority !== 'all' || category !== 'all' || overdueOnly);
  const resetFilters = () => { setQuery(''); setPriority('all'); setCategory('all'); setOverdueOnly(false); };
  const add = (status: Status = 'todo') => { setEditor({ initial: emptyTask(status) }); setMobileMenu(false); };
  const active = tasks.find(t => t.id === activeId);
  return <div className="app-shell">
    {mobileMenu && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
      <a className="brand" href="/" aria-label="Daybreak home"><span className="brand-symbol"><Sun size={24} strokeWidth={1.6} /></span>daybreak<span className="brand-period">.</span></a>
      <div className="workspace"><span className="workspace-avatar">P</span><div><strong>Personal workspace</strong></div></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Workspace navigation"><button className={`nav-item ${!overdueOnly ? 'selected' : ''}`} onClick={() => { resetFilters(); setMobileMenu(false); }}><LayoutGrid size={17} /> My board <span className="nav-count">{tasks.length}</span></button><button className={`nav-item ${overdueOnly ? 'selected' : ''}`} onClick={() => { resetFilters(); setOverdueOnly(true); setMobileMenu(false); }}><Circle size={17} /> Needs attention {overdue > 0 && <span className="attention-dot" />}</button></nav>
      <div className="sidebar-bottom"><button className="help-button" onClick={() => setHelp(true)}><CircleHelp size={17} /> Help</button><div className="guest-profile"><span className="guest-avatar">Y</span><div><strong>Your workspace</strong><span><span className="online-dot" />{repository?.mode === 'cloud' ? 'Private guest session' : 'Local demo session'}</span></div><ShieldCheck size={16} /></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-toggle" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={20} /></button><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>My board</strong></div><div className="connection"><span className={`connection-dot ${repository?.mode === 'cloud' ? 'cloud' : ''}`} />{busy ? 'Saving…' : loading ? 'Connecting…' : repository?.mode === 'cloud' ? 'Saved to cloud' : 'Local demo'}<span className="top-avatar">Y</span></div></header>
      <main>
        <section className="stats" aria-label="Board summary"><div className="stat"><span className="stat-icon"><LayoutGrid size={18} /></span><div><span>Total tasks</span><strong>{loading ? '—' : tasks.length}<small>on your board</small></strong></div></div><div className="stat"><span className="stat-icon amber"><Sun size={19} /></span><div><span>In progress</span><strong>{loading ? '—' : inProgress}<small>taking shape</small></strong></div></div><div className="stat"><span className="stat-icon green"><CheckCheck size={19} /></span><div><span>Completed</span><strong>{loading ? '—' : done}<small>little wins</small></strong></div></div><div className="stat progress-stat"><div className="progress-title"><span>Progress</span><strong>{percent}%</strong></div><div className="progress-track" role="progressbar" aria-label="Tasks completed" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div></div></section>
        <div className="board-toolbar"><div className="board-tab"><LayoutGrid size={16} /> Board <span>{tasks.length}</span></div><div className="toolbar-actions"><button className="button primary new-task" disabled={loading || busy || !repository} onClick={() => add()}><Plus size={17} /> New task</button><label className="search-box"><Search size={16} /><input aria-label="Search tasks" placeholder="Find a task…" value={query} onChange={e => setQuery(e.target.value)} />{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={13} /></button>}</label><button className={`button toolbar-button ${showFilters || filtering ? 'active-filter' : ''}`} aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} /> Filters{filtering && <span className="filter-dot" />}</button><label className="sort-control"><ArrowDownUp size={14} /><span className="sr-only">Sort tasks</span><select aria-label="Sort tasks" value={sort} onChange={e => setSort(e.target.value)}><option value="created">Created</option><option value="priority">Priority</option><option value="due">Due date</option></select><ChevronDown size={12} /></label></div></div>
        {showFilters && <div className="filters"><label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}><option value="all">All priorities</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} /> Overdue only {overdue > 0 && `(${overdue})`}</label>{filtering && <button className="text-button" onClick={resetFilters}>Clear filters</button>}</div>}
        {filtering && <div className="filter-summary">Showing {filtered.length} of {tasks.length} tasks <button className="text-button" onClick={resetFilters}>Clear all</button></div>}
        {error && <div className="error-banner" role="alert"><span>{error}</span><button className="text-button" disabled={busy || loading} onClick={() => void load()}>Retry loading</button></div>}
        {loading ? <div className="loading-board" role="status"><LoaderCircle className="spinner" size={24} /><h2>Making a little space for your work…</h2><p>Your board will be ready in a moment.</p></div> : repository ? <DndContext sensors={sensors} onDragStart={e => setActiveId(String(e.active.id))} onDragEnd={move} onDragCancel={() => setActiveId(undefined)}><div className="board" aria-label="Task board">{columns.map(column => <Column key={column.id} column={column} tasks={filtered.filter(t => t.status === column.id)} onAdd={add} onOpen={task => setEditor({ initial: { title: task.title, description: task.description, status: task.status, priority: task.priority, due_date: task.due_date, category: task.category }, task })} disabled={busy} filtering={filtering} />)}</div><DragOverlay dropAnimation={null}>{active ? <div className="task-card drag-overlay"><CardContent task={active} /></div> : null}</DragOverlay></DndContext> : <div className="loading-board"><Cloud size={28} /><h2>Let’s reconnect your workspace.</h2><p>Resolve the connection message above, then retry.</p></div>}
        <footer className="board-footer"><span>{repository?.mode === 'demo' ? 'Demo changes are saved in this browser.' : 'Only your guest session can access your tasks.'}</span></footer>
      </main>
    </div>
    {editor && <TaskDialog initial={editor.initial} task={editor.task} busy={busy} serverError={error} onClose={() => setEditor(undefined)} onSave={save} onDelete={remove} />}
    {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
    {help && <HelpDialog mode={repository?.mode} onClose={() => setHelp(false)} />}
  </div>;
}
function HelpDialog({ mode, onClose }: { mode?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current!; const previous = document.activeElement as HTMLElement | null; el.showModal(); return () => { el.close(); previous?.focus(); }; }, []);
  return <dialog className="help-dialog" ref={ref} aria-labelledby="help-title" onCancel={e => { e.preventDefault(); onClose(); }}><div className="dialog-heading"><Sun size={24} /><button className="icon-button" aria-label="Close help" onClick={onClose}><X size={20} /></button></div><h2 id="help-title">Help</h2><div className="help-content"><h3>Make it yours</h3><p>Create a task with the New task button. Open any card to edit its details, set a priority, or choose a due date.</p><h3>Keep work moving</h3><p>Drag a card using its grip handle to move it to another column. On touch screens, hold the handle briefly before moving. You can also change status in the task editor using a keyboard or touch.</p><h3>Find your focus</h3><p>Search titles and descriptions, filter by priority or category, or choose Needs attention to see overdue tasks.</p><h3>Your {mode === 'cloud' ? 'guest' : 'demo'} workspace</h3><p>{mode === 'cloud' ? 'Your tasks are saved in Supabase and belong to your guest session. Keep this browser’s site data to retain access. A different browser or a cleared session starts a separate workspace.' : 'This is a local preview with sample tasks. Changes are saved only in this browser. The project README explains how to connect Supabase for a private cloud workspace.'}</p></div><button className="button primary" onClick={onClose}>Got it <Check size={15} /></button></dialog>;
}
