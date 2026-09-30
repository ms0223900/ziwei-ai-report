import "server-only";

// ADMIN_USER_IDS：逗號分隔的 uuid，僅 server 讀取；空值等於沒有管理者。
export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }
  const ids = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.includes(userId);
}
