export type Role = "admin" | "user";

export type ProjectStatus = "active" | "paused" | "done";
export type TaskStatus = "todo" | "in_progress" | "done";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  client_id: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  client_id: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
};
