import type { Task } from "./generated/_types";
import {
  createTask,
  deleteTask,
  listTasks as fetchTasks,
  updateTask,
} from "./generated/task";
import { createApiClient } from "./generated/shared/fetchRuntime";

export const apiMode =
  import.meta.env.VITE_API_MODE === "remote" ? "remote" : "mock";
createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api",
});

let tasks: Task[] = [
  { id: 1, title: "Generate the API client", completed: true },
  { id: 2, title: "Try the configuration watcher", completed: false },
];
let nextId = 3;

export const listTasks = async (): Promise<Task[]> =>
  apiMode === "remote" ? fetchTasks() : tasks.map((task) => ({ ...task }));

export const addTask = async (title: string): Promise<Task> => {
  if (apiMode === "remote") return createTask({ title });
  const task = { id: nextId++, title, completed: false };
  tasks = [task, ...tasks];
  return { ...task };
};

export const setTaskCompleted = async (
  id: number,
  completed: boolean,
): Promise<Task> => {
  if (apiMode === "remote") return updateTask(id, { completed });
  const task = tasks.find((item) => item.id === id);
  if (!task) throw new Error("Task was not found");
  task.completed = completed;
  return { ...task };
};

export const removeTask = async (id: number): Promise<void> => {
  if (apiMode === "remote") {
    await deleteTask(id);
    return;
  }
  tasks = tasks.filter((task) => task.id !== id);
};
