import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 刷新 cookie session。靜態資源略過。
     * 未來 webhook（例如 /api/ecpay/）必須排除，避免 refresh 吃掉 raw body。
     */
    "/((?!_next/static|_next/image|favicon.ico|api/ecpay/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
