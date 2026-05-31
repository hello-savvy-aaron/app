export type Role = "admin" | "user";

export type ProjectStatus = "active" | "paused" | "done";
export type IssueState = "open" | "closed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  client_id: string | null;
  created_at: string;
  // Only set during admin impersonation — not a DB column.
  _impersonating?: { adminEmail: string; adminId: string };
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
  github_repo_url: string | null;
  created_at: string;
};

export type Issue = {
  id: string;
  project_id: string;
  title: string;
  body: string | null;
  github_number: number | null;
  github_url: string | null;
  state: IssueState;
  created_by: string | null;
  created_at: string;
};

export type DocumentKind = "pdf" | "html" | "link";

export type Document = {
  id: string;
  title: string;
  description: string | null;
  kind: DocumentKind;
  project_id: string;
  storage_path: string | null;
  external_url: string | null;
  requires_signoff: boolean;
  created_by: string | null;
  created_at: string;
};

export type DocumentSignoff = {
  id: string;
  document_id: string;
  profile_id: string;
  signed_name: string;
  signed_at: string;
};
