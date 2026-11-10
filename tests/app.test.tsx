// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import type { DragEndEvent } from '@dnd-kit/core';
import { emptyTask, type Task } from '../src/lib/model';
const fixtures = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), dragEnd: undefined as ((event: DragEndEvent) => void) | undefined }));
vi.mock('../src/lib/repository', () => ({ getRepository: async () => ({ mode: 'demo', userId: 'guest', ...fixtures }) }));
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return { ...actual, DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
    fixtures.dragEnd = props.onDragEnd;
    return React.createElement(actual.DndContext, props);
  } };
});
const task: Task = { ...emptyTask(), id: 'test', title: 'First task', user_id: 'guest', created_at: '2026-11-09T12:00:00Z', updated_at: '2026-11-09T12:00:00Z' };
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.list.mockResolvedValue([task]);
  fixtures.create.mockImplementation(async input => ({ ...task, ...input, id: 'new' }));
  fixtures.update.mockImplementation(async (id, input) => ({ ...task, ...input, id }));
  fixtures.remove.mockResolvedValue(undefined);
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
it('creates a task, changes its status, and deletes after confirmation', async () => {
  const user = userEvent.setup(); render(<App />);
  await screen.findByRole('button', { name: 'Open task: First task' });
  await user.click(screen.getByRole('button', { name: 'New task', exact: true }));
  await user.type(screen.getByLabelText('Task title *'), 'New idea');
  await user.click(screen.getByRole('button', { name: 'Create task', exact: true }));
  await user.click(await screen.findByRole('button', { name: 'Open task: New idea' }));
  await user.selectOptions(screen.getByLabelText('Status'), 'done');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  const done = screen.getByRole('region', { name: 'Done', exact: true });
  await waitFor(() => expect(within(done).getByRole('button', { name: 'Open task: New idea' })).toBeTruthy());
  await user.click(within(done).getByRole('button', { name: 'Open task: New idea' }));
  await user.click(screen.getByRole('button', { name: 'Delete task', exact: true }));
  expect(fixtures.remove).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Delete permanently' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Open task: New idea' })).toBe(null));
  expect(fixtures.remove).toHaveBeenCalledWith('new');
});
it('keeps edits and displays save failures inside the dialog', async () => {
  const user = userEvent.setup(); fixtures.update.mockRejectedValue(new Error('Connection lost'));
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Open task: First task' }));
  const title = screen.getByLabelText('Task title *');
  await user.clear(title); await user.type(title, 'Keep my changes');
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
  const dialog = screen.getByRole('dialog');
  await waitFor(() => expect(within(dialog).getByRole('alert').textContent).toBe('Connection lost'));
  expect((title as HTMLInputElement).value).toBe('Keep my changes');
  expect(screen.getByRole('button', { name: 'Open task: First task' })).toBeTruthy();
});
it('shows no-match states and restores tasks when search is cleared', async () => {
  render(<App />); await screen.findByRole('button', { name: 'Open task: First task' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Search tasks' }), { target: { value: 'nothing matches' } });
  expect(screen.queryByRole('button', { name: 'Open task: First task' })).toBe(null);
  expect(screen.getAllByText('No matching tasks')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(screen.getByRole('button', { name: 'Open task: First task' })).toBeTruthy();
});

it('settles a dropped task in the destination before a slow save completes', async () => {
  let finish!: (value: Task) => void;
  fixtures.update.mockImplementation(() => new Promise<Task>(resolve => { finish = resolve; }));
  render(<App />); await screen.findByRole('button', { name: 'Open task: First task' });
  act(() => { fixtures.dragEnd!({ active: { id: task.id }, over: { id: 'in_progress' } } as DragEndEvent); });
  const destination = screen.getByRole('region', { name: 'In Progress', exact: true });
  expect(within(destination).getByRole('button', { name: 'Open task: First task' })).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'To Do', exact: true })).queryByRole('button', { name: 'Open task: First task' })).toBe(null);
  expect(screen.getByText('Saving…')).toBeTruthy();
  await act(async () => { finish({ ...task, status: 'in_progress' }); });
  expect(within(destination).getByRole('button', { name: 'Open task: First task' })).toBeTruthy();
});
it('rolls a dropped task back and shows an error if persistence fails', async () => {
  let fail!: (error: Error) => void;
  fixtures.update.mockImplementation(() => new Promise<Task>((_, reject) => { fail = reject; }));
  render(<App />); await screen.findByRole('button', { name: 'Open task: First task' });
  act(() => { fixtures.dragEnd!({ active: { id: task.id }, over: { id: 'done' } } as DragEndEvent); });
  expect(within(screen.getByRole('region', { name: 'Done', exact: true })).getByRole('button', { name: 'Open task: First task' })).toBeTruthy();
  await act(async () => { fail(new Error('Could not save move')); });
  expect(within(screen.getByRole('region', { name: 'To Do', exact: true })).getByRole('button', { name: 'Open task: First task' })).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Done', exact: true })).queryByRole('button', { name: 'Open task: First task' })).toBe(null);
  expect(screen.getByRole('alert').textContent).toContain('Could not save move');
});
