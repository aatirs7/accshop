"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronUp, ChevronDown, Pencil, Trash2, X } from "lucide-react";
import {
  addTask,
  toggleTask,
  editTask,
  deleteTask,
  moveTask,
} from "@/actions/admin/daily-operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Priority = "low" | "medium" | "high";
type Task = {
  id: string;
  description: string;
  priority: Priority | null;
  done: boolean;
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "border-red-500/40 bg-red-500/10 text-red-400",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  low: "border-sky-500/40 bg-sky-500/10 text-sky-400",
};

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function DailyTasks({ date, tasks }: { date: string; tasks: Task[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const doneCount = tasks.filter((t) => t.done).length;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        if (okMsg) toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(r.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Daily Tasks</CardTitle>
        <span className="text-sm text-muted-foreground">
          {doneCount}/{tasks.length} done
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          ref={formRef}
          action={(fd) =>
            startTransition(async () => {
              const r = await addTask(fd);
              if (r.ok) {
                formRef.current?.reset();
                router.refresh();
              } else {
                toast.error(r.error ?? "Could not add the task.");
              }
            })
          }
          className="flex flex-wrap gap-2"
        >
          <input type="hidden" name="opDate" value={date} />
          <Input
            name="description"
            required
            maxLength={500}
            placeholder="Add a task and press Enter"
            className="min-w-[12rem] flex-1"
          />
          <select name="priority" defaultValue="" className={selectClass} aria-label="Priority">
            <option value="">No priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <Button type="submit" size="sm" disabled={pending}>
            Add
          </Button>
        </form>

        {tasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tasks for this day yet.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {tasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                isFirst={i === 0}
                isLast={i === tasks.length - 1}
                pending={pending}
                run={run}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  isFirst,
  isLast,
  pending,
  run,
}: {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(task.description);
  const [priority, setPriority] = useState<Priority | "">(task.priority ?? "");

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 py-2">
        <Input
          value={desc}
          maxLength={500}
          onChange={(e) => setDesc(e.target.value)}
          className="min-w-[12rem] flex-1"
          autoFocus
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority | "")}
          className={selectClass}
          aria-label="Priority"
        >
          <option value="">No priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="Save"
          disabled={pending || desc.trim() === ""}
          onClick={() =>
            run(
              () =>
                editTask({
                  id: task.id,
                  description: desc.trim(),
                  priority: priority === "" ? null : priority,
                }),
              "Task updated",
            )
          }
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Cancel"
          onClick={() => {
            setDesc(task.description);
            setPriority(task.priority ?? "");
            setEditing(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <button
        type="button"
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        disabled={pending}
        onClick={() => run(() => toggleTask(task.id, !task.done))}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
          task.done
            ? "border-brand-gold bg-brand-gold text-background"
            : "border-input hover:border-brand-gold",
        )}
      >
        {task.done && <Check className="h-3.5 w-3.5" />}
      </button>

      <span
        className={cn(
          "min-w-0 flex-1 break-words text-sm",
          task.done && "text-muted-foreground line-through",
        )}
      >
        {task.description}
      </span>

      {task.priority && (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            PRIORITY_STYLES[task.priority],
          )}
        >
          {task.priority}
        </span>
      )}

      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Move up"
          disabled={pending || isFirst}
          onClick={() => run(() => moveTask(task.id, "up"))}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Move down"
          disabled={pending || isLast}
          onClick={() => run(() => moveTask(task.id, "down"))}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Edit task"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Delete task"
          disabled={pending}
          onClick={() => run(() => deleteTask(task.id))}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
