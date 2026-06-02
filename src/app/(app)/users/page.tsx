import { redirect } from "next/navigation";

// The users list moved into Settings. Keep this path working for old links.
export default function UsersRedirect() {
  redirect("/settings/users");
}
