const ADVANCED_TITLE_SUFFIX = "的進階報告";
const PC_ADVANCED_TITLE_SUFFIX = "的紫微斗數進階報告";

export function pcReportTitle(title: string, isPc: boolean): string {
  if (!isPc || !title.endsWith(ADVANCED_TITLE_SUFFIX)) {
    return title;
  }
  return `${title.slice(0, -ADVANCED_TITLE_SUFFIX.length)}${PC_ADVANCED_TITLE_SUFFIX}`;
}
