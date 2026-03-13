"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCheck, Clock, Pin, RefreshCw, Loader2, AlertCircle, Circle, CheckCircle2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  source: string;
  logged: string;
  done: boolean;
  inProgress: boolean;
  description: string;
  notes: string;
}

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/ai-tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markDone(id: string) {
    setUpdating(id);
    await fetch("/api/ai-tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done: true }),
    });
    await load();
    setUpdating(null);
  }

  async function markInProgress(id: string) {
    setUpdating(id);
    await fetch("/api/ai-tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, inProgress: true }),
    });
    await load();
    setUpdating(null);
  }

  const todo = tasks.filter((t) => !t.done && !t.inProgress).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const inProgress = tasks.filter((t) => t.inProgress && !t.done);
  const done = tasks.filter((t) => t.done);

  const priorityStyle = (p: string) => ({
    High: { color: "#ff6b6b", background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)" },
    Medium: { color: "#ffd93d", background: "rgba(255,217,61,0.1)", border: "1px solid rgba(255,217,61,0.3)" },
    Low: { color: "#6bcb77", background: "rgba(107,203,119,0.1)", border: "1px solid rgba(107,203,119,0.3)" },
  }[p] ?? {});

  function TaskCard({ task }: { task: Task }) {
    return (
      <div
        className="rounded-xl p-4 flex flex-col gap-2"
        style={{ background: "#0d1f2d", border: "1px solid #1e2d3d" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Pin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#4a90b8" }} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white leading-snug">{task.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "#2a5a7a" }}>{task.id} · {task.source} · {task.logged}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium" style={priorityStyle(task.priority)}>
            {task.priority}
          </span>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "#6a9ab8" }}>{task.description}</p>

        {task.notes && task.notes !== "—" && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#060a0f", color: "#4a90b8", borderLeft: "2px solid #1e3d5a" }}>
            <span className="font-medium text-white">Copilot notes: </span>{task.notes}
          </p>
        )}

        {!task.done && (
          <div className="flex items-center gap-2 mt-1">
            {!task.inProgress && (
              <button
                onClick={() => markInProgress(task.id)}
                disabled={updating === task.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                style={{ background: "#1e2d3d", color: "#a0c4d8" }}
              >
                {updating === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                Start
              </button>
            )}
            <button
              onClick={() => markDone(task.id)}
              disabled={updating === task.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
              style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}
            >
              {updating === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
              Mark done
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen" style={{ background: "#060a0f" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Pin className="w-5 h-5" style={{ color: "#00ff88" }} />
            AI Task Queue
          </h1>
          <p className="text-sm mt-1" style={{ color: "#4a90b8" }}>
            Recommendations from OpenClaw · Implemented by GitHub Copilot
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
          style={{ background: "#0d1f2d", border: "1px solid #1e2d3d", color: "#4a90b8" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: "#0a1a0a", border: "1px solid #1a3a1a" }}>
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#00ff88" }} />
        <p className="text-xs leading-relaxed" style={{ color: "#6a9a6a" }}>
          <span className="text-white font-medium">How this works:</span> Ask OpenClaw to analyse your SEO data in the chat panel → click <strong className="text-white">📌 Log as task</strong> on any recommendation → come back to VS Code and tell Copilot <em className="text-white">&quot;implement the next task from AI_TASKS.md&quot;</em>. Tasks are stored in <code className="text-white">AI_TASKS.md</code> in your project root.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#4a90b8" }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Todo */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Circle className="w-4 h-4" style={{ color: "#4a90b8" }} />
              <h2 className="text-sm font-semibold text-white">To Do</h2>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1e2d3d", color: "#4a90b8" }}>{todo.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {todo.length === 0 ? (
                <p className="text-xs py-8 text-center" style={{ color: "#2a4a5a", border: "1px dashed #1e2d3d", borderRadius: "12px" }}>
                  No tasks yet.<br />Ask OpenClaw to analyse your dashboard.
                </p>
              ) : (
                todo.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </div>
          </div>

          {/* In Progress */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: "#ffd93d" }} />
              <h2 className="text-sm font-semibold text-white">In Progress</h2>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1e2d3d", color: "#4a90b8" }}>{inProgress.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {inProgress.length === 0 ? (
                <p className="text-xs py-8 text-center" style={{ color: "#2a4a5a", border: "1px dashed #1e2d3d", borderRadius: "12px" }}>
                  Nothing in progress.
                </p>
              ) : (
                inProgress.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </div>
          </div>

          {/* Done */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" style={{ color: "#00ff88" }} />
              <h2 className="text-sm font-semibold text-white">Done</h2>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "#1e2d3d", color: "#4a90b8" }}>{done.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {done.length === 0 ? (
                <p className="text-xs py-8 text-center" style={{ color: "#2a4a5a", border: "1px dashed #1e2d3d", borderRadius: "12px" }}>
                  Nothing completed yet.
                </p>
              ) : (
                done.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
