import {
  displayNameFromEmail,
  ensureProfile,
} from "../../lib/membership/ensureProfile";
import { getSessionUser } from "../../lib/supabase/session";
import { AuthEntry } from "./AuthEntry";
import { AuthSessionBar } from "./AuthSessionBar";

export async function AppHeader() {
  const user = await getSessionUser();
  if (!user) {
    return <AuthEntry />;
  }

  let displayName = displayNameFromEmail(user.email ?? "");
  let accessStatus: "locked" | "unlocked" = "locked";

  try {
    const profile = await ensureProfile({
      userId: user.id,
      email: user.email ?? "",
    });
    if (profile) {
      displayName = profile.display_name;
      accessStatus = profile.access_status;
    }
  } catch {
    // 頁首仍要看得到已登入，避免整頁崩潰。
  }

  return (
    <AuthSessionBar
      accessStatus={accessStatus}
      displayName={displayName}
      userId={user.id}
    />
  );
}
