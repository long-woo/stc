import {
  addTask,
  apiMode,
  listTasks,
  removeTask,
  setTaskCompleted,
} from "./api/tasks";
import type { Task } from "./api/generated/_types";
import "./styles.css";

type TaskFilter = "all" | "active" | "completed";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root was not found");

let tasks: Task[] = [];
let filter: TaskFilter = "all";
let loading = true;
let errorMessage = "";

const visibleTasks = (): Task[] => {
  if (filter === "active") return tasks.filter((task) => !task.completed);
  if (filter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character] ?? character);

const renderTask = (task: Task): string => `
  <li class="task-row ${task.completed ? "is-complete" : ""}">
    <label class="task-main">
      <input class="task-checkbox" type="checkbox" data-task-id="${task.id}" ${
  task.completed ? "checked" : ""
} />
      <span>${escapeHtml(task.title)}</span>
    </label>
    <button class="icon-button danger" type="button" data-delete-id="${task.id}" aria-label="Delete ${
  escapeHtml(task.title)
}">Delete</button>
  </li>`;

const render = (): void => {
  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.length - activeCount;
  const items = visibleTasks();

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">STC FRONTEND EXAMPLE</p>
          <h1>Taskboard</h1>
          <p class="subtitle">A small production-shaped client generated from OpenAPI.</p>
        </div>
        <span class="mode-badge ${apiMode}">${
    apiMode === "mock" ? "Local mock" : "Remote API"
  }</span>
      </header>

      <section class="summary-grid" aria-label="Task summary">
        <div class="summary-item"><span>Total tasks</span><strong>${tasks.length}</strong></div>
        <div class="summary-item"><span>In progress</span><strong>${activeCount}</strong></div>
        <div class="summary-item"><span>Completed</span><strong>${completedCount}</strong></div>
      </section>

      <section class="workspace">
        <div class="section-heading">
          <div>
            <p class="section-kicker">WORK QUEUE</p>
            <h2>Today&apos;s tasks</h2>
          </div>
          <div class="filters" role="group" aria-label="Filter tasks">
            ${
    (["all", "active", "completed"] as TaskFilter[]).map((option) => `
              <button class="filter-button ${
      filter === option ? "is-selected" : ""
    }" type="button" data-filter="${option}">
                ${option[0].toUpperCase()}${option.slice(1)}
              </button>`).join("")
  }
          </div>
        </div>

        ${
    errorMessage
      ? `<div class="alert" role="alert">${escapeHtml(errorMessage)}</div>`
      : ""
  }
        ${
    loading
      ? `<div class="empty-state"><strong>Loading tasks...</strong><span>Fetching the current queue.</span></div>`
      : ""
  }
        ${
    !loading && items.length === 0
      ? `<div class="empty-state"><strong>No tasks here</strong><span>Try another filter or add a new task below.</span></div>`
      : ""
  }
        ${
    !loading && items.length > 0
      ? `<ul class="task-list">${items.map(renderTask).join("")}</ul>`
      : ""
  }

        <form class="new-task" id="new-task-form">
          <input id="task-title" name="title" type="text" maxlength="120" placeholder="Add a task to the queue" autocomplete="off" required />
          <button class="primary-button" type="submit">Add task</button>
        </form>
      </section>

      <footer class="footer-note">
        <span>Contract: <code>openapi.yaml</code></span>
        <span>Generated client: <code>src/api/generated</code></span>
      </footer>
    </main>`;

  bindEvents();
};

const refresh = async (): Promise<void> => {
  loading = true;
  errorMessage = "";
  render();

  try {
    tasks = await listTasks();
  } catch (error) {
    errorMessage = error instanceof Error
      ? error.message
      : "Unable to load tasks";
  } finally {
    loading = false;
    render();
  }
};

const bindEvents = (): void => {
  document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        filter = button.dataset.filter as TaskFilter;
        render();
      });
    },
  );

  document.querySelectorAll<HTMLInputElement>("[data-task-id]").forEach(
    (checkbox) => {
      checkbox.addEventListener("change", async () => {
        const taskId = Number(checkbox.dataset.taskId);
        try {
          await setTaskCompleted(taskId, checkbox.checked);
          const task = tasks.find((item) => item.id === taskId);
          if (task) task.completed = checkbox.checked;
          render();
        } catch (error) {
          errorMessage = error instanceof Error
            ? error.message
            : "Unable to update task";
          render();
        }
      });
    },
  );

  document.querySelectorAll<HTMLButtonElement>("[data-delete-id]").forEach(
    (button) => {
      button.addEventListener("click", async () => {
        const taskId = Number(button.dataset.deleteId);
        try {
          await removeTask(taskId);
          tasks = tasks.filter((task) => task.id !== taskId);
          render();
        } catch (error) {
          errorMessage = error instanceof Error
            ? error.message
            : "Unable to delete task";
          render();
        }
      });
    },
  );

  const form = document.querySelector<HTMLFormElement>("#new-task-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.elements.namedItem("title");
    if (!(input instanceof HTMLInputElement) || !input.value.trim()) return;

    const submitButton = form.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    );
    if (submitButton) submitButton.disabled = true;

    try {
      const task = await addTask(input.value.trim());
      tasks = [task, ...tasks];
      render();
    } catch (error) {
      errorMessage = error instanceof Error
        ? error.message
        : "Unable to create task";
      render();
    }
  });
};

void refresh();
