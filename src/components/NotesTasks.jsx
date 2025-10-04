import PropTypes from 'prop-types';
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

function NotesTasks({ title, stages, onTasksChange, onExportTasks, onFocusStage }) {
  const [newTaskStage, setNewTaskStage] = useState(stages[0]?.id ?? '');
  const [taskText, setTaskText] = useState('');

  useEffect(() => {
    if (!stages.some((stage) => stage.id === newTaskStage)) {
      setNewTaskStage(stages[0]?.id ?? '');
    }
  }, [stages, newTaskStage]);

  const handleAddTask = () => {
    if (!taskText.trim()) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`;
    onTasksChange(
      newTaskStage,
      [...(stages.find((stage) => stage.id === newTaskStage)?.tasks ?? []), { id, text: taskText.trim(), done: false }],
    );
    setTaskText('');
  };

  const toggleTask = (stageId, taskId) => {
    const tasks = stages.find((stage) => stage.id === stageId)?.tasks ?? [];
    onTasksChange(
      stageId,
      tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    );
  };

  const removeTask = (stageId, taskId) => {
    const tasks = stages.find((stage) => stage.id === stageId)?.tasks ?? [];
    onTasksChange(
      stageId,
      tasks.filter((task) => task.id !== taskId),
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 card-animated">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <div className="flex gap-2 text-xs text-slate-400">
          <button
            onClick={() => onExportTasks('json')}
            className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1 transition hover:-translate-y-0.5 hover:border-cyan-400 active:scale-95"
          >
            <ArrowDownTrayIcon className="h-4 w-4" /> JSON
          </button>
          <button
            onClick={() => onExportTasks('csv')}
            className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1 transition hover:-translate-y-0.5 hover:border-cyan-400 active:scale-95"
          >
            <ArrowDownTrayIcon className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 card-animated">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newTaskStage}
            onChange={(event) => setNewTaskStage(event.target.value)}
            className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs"
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <input
            value={taskText}
            onChange={(event) => setTaskText(event.target.value)}
            placeholder="Новая задача"
            className="flex-1 rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs"
          />
          <button
            onClick={handleAddTask}
            className="flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-500/20 active:scale-95"
          >
            <PlusIcon className="h-4 w-4" /> Добавить
          </button>
        </div>
      </div>

      <div className="space-y-3 text-sm text-slate-200">
        {stages.map((stage) => (
          <div key={stage.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 card-animated">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
              <button
                onClick={() => onFocusStage(stage.id)}
                className="text-left text-slate-300 transition hover:-translate-y-0.5 hover:text-cyan-300"
              >
                {stage.name}
              </button>
              <span>{(stage.tasks ?? []).length} задач</span>
            </div>
            <div className="mt-2 space-y-2">
              {(stage.tasks ?? []).map((task) => (
                <label key={task.id} className="flex items-start gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(stage.id, task.id)}
                    className="mt-[2px] rounded border-slate-600 bg-slate-900"
                  />
                  <span className={task.done ? 'line-through text-slate-500' : ''}>{task.text}</span>
                  <button
                    onClick={() => removeTask(stage.id, task.id)}
                    className="ml-auto text-slate-500 transition hover:-translate-y-0.5 hover:text-rose-400"
                  >
                    ×
                  </button>
                </label>
              ))}
              {!(stage.tasks ?? []).length && <p className="text-xs text-slate-500">Нет задач — добавьте приоритет.</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

NotesTasks.propTypes = {
  title: PropTypes.string.isRequired,
  stages: PropTypes.array.isRequired,
  onTasksChange: PropTypes.func.isRequired,
  onExportTasks: PropTypes.func.isRequired,
  onFocusStage: PropTypes.func.isRequired,
};

export default NotesTasks;
