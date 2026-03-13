import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TASKS_FILE = path.join(process.cwd(), "AI_TASKS.md");

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

function readFile(): string {
  return fs.existsSync(TASKS_FILE) ? fs.readFileSync(TASKS_FILE, "utf-8") : "";
}

function writeFile(content: string) {
  fs.writeFileSync(TASKS_FILE, content, "utf-8");
}

function nextTaskId(content: string): string {
  const matches = content.match(/TASK-(\d+)/g) ?? [];
  const max = matches.reduce((m, t) => Math.max(m, parseInt(t.replace("TASK-", ""))), 0);
  return `TASK-${String(max + 1).padStart(3, "0")}`;
}

// GET — return all tasks parsed from the markdown
export async function GET() {
  const content = readFile();

  const tasks: Task[] = [];
  // Split on task headings and parse each block individually
  const blocks = content.split(/(?=### TASK-\d+)/);
  for (const block of blocks) {
    const idMatch = block.match(/### (TASK-\d+) — (.+)/);
    if (!idMatch) continue;
    const get = (field: string) => {
      const m = block.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`));
      return m ? m[1].trim() : "";
    };
    const status = get("Status");
    tasks.push({
      id: idMatch[1],
      title: idMatch[2].trim(),
      priority: get("Priority") as Task["priority"],
      source: get("Source"),
      logged: get("Logged"),
      done: status.includes("[x]"),
      inProgress: status.includes("[~]"),
      description: get("Description"),
      notes: get("Notes"),
    });
  }

  return NextResponse.json({ tasks, raw: content });
}

// POST — add a new task
export async function POST(req: NextRequest) {
  const { title, description, priority = "Medium", source = "OpenClaw" } = await req.json();

  if (!title || !description) {
    return NextResponse.json({ error: "title and description are required" }, { status: 400 });
  }

  const content = readFile();
  const id = nextTaskId(content);
  const date = new Date().toISOString().split("T")[0];

  const taskBlock = `\n### ${id} — ${title}\n- **Priority:** ${priority}\n- **Source:** ${source}\n- **Logged:** ${date}\n- **Status:** [ ] Todo\n- **Description:** ${description}\n- **Notes:** —\n`;

  const section = priority === "High" ? "## 🔴 High Priority" :
                  priority === "Low"  ? "## 🟢 Low Priority"  :
                                        "## 🟡 Medium Priority";

  const placeholder = priority === "High" ? "_Nothing here yet. Ask OpenClaw to analyse the dashboard and log recommendations._" :
                      priority === "Low"  ? "_Nothing here yet._" :
                                           "_Nothing here yet._";

  let updated = content;
  if (updated.includes(placeholder)) {
    updated = updated.replace(placeholder, taskBlock.trim());
  } else {
    updated = updated.replace(section, section + taskBlock);
  }

  writeFile(updated);
  return NextResponse.json({ id, success: true });
}

// PATCH — mark a task done or add notes
export async function PATCH(req: NextRequest) {
  const { id, done, inProgress, notes } = await req.json();

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  let content = readFile();

  if (done !== undefined || inProgress !== undefined) {
    const status = done ? "[x] Done" : inProgress ? "[~] In Progress" : "[ ] Todo";
    // Replace the Status line for this task — match line-by-line, no dotAll needed
    content = content.replace(
      new RegExp(`(### ${id} — .+\n(?:- \\*\\*.+\n)*?- \\*\\*Status:\\*\\*) [^\n]+(\n)`),
      `$1 ${status}$2`
    );
    // If done, move the task block to the Completed section
    if (done) {
      const taskMatch = content.match(new RegExp(`### ${id} —[\\s\\S]+?(?=\\n###|\\n---|\\n## |$)`));
      if (taskMatch) {
        const taskBlock = taskMatch[0];
        content = content.replace(taskBlock, "").replace(/\n{3,}/g, "\n\n");
        content = content.replace("## ✅ Completed\n\n_Tasks will be moved here once implemented._", `## ✅ Completed\n\n${taskBlock.trim()}`);
        if (content.includes("## ✅ Completed\n\n### ")) {
          // already has tasks, just prepend
          content = content.replace("## ✅ Completed\n\n### ", `## ✅ Completed\n\n${taskBlock.trim()}\n\n### `);
        }
      }
    }
  }

  if (notes) {
    content = content.replace(
      new RegExp(`(### ${id} — .+\n(?:- \\*\\*.+\n)*?- \\*\\*Notes:\\*\\*) [^\n]+(\n|$)`),
      `$1 ${notes}$2`
    );
  }

  writeFile(content);
  return NextResponse.json({ success: true });
}
