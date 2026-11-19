import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 刷新 cookie session。靜態資源略過。
     * 綠界 ReturnURL／PeriodReturnURL 都在 api/payments/ecpay/ 下，整段排除，
     * 避免 refresh 吃掉 raw body 導致 CheckMacValue 驗不過。
     */
    "/((?!_next/static|_next/image|favicon.ico|api/ecpay/|api/payments/ecpay/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
