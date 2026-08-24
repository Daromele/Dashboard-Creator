import { redirect } from "next/navigation";
import { getSessionUserId } from "./auth";
import { loadWorkspace, type Workspace } from "./workspace";

/** Load the signed-in user's workspace, or bounce to sign-in. */
export async function requireWorkspace(): Promise<Workspace> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");
  return loadWorkspace(userId);
}
