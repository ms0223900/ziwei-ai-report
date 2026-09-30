const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

// 以 Asia/Taipei 顯示日期（yyyy/MM/dd）；無效輸入回空字串。
export function formatTaipeiDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + TAIPEI_OFFSET_MS);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
}
