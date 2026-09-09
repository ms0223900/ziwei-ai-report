const DEMO_NICKNAME = "小圓";

const FOCUS_PALACE: Record<string, string> = {
  整體: "命身宮（整體運勢）",
  工作: "官祿宮（工作事業）",
  關係: "夫妻宮（關係交友）",
};

export type ChartMatrixInput = {
  nickname: string;
  birth_date: string;
  focus: string;
};

export function formatWesternBirthDate(birthDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) {
    return `生辰：${birthDate}`;
  }

  return `生辰：西元${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

export function chartSubjectLine(nickname: string): string {
  if (nickname === DEMO_NICKNAME) {
    return `命主：${nickname}（女命）`;
  }

  return `命主：${nickname}`;
}

export function chartFocusLine(focus: string): string {
  return `問事焦點：${FOCUS_PALACE[focus] ?? FOCUS_PALACE.整體}`;
}

export function buildChartMatrixCopy(input: ChartMatrixInput) {
  return {
    title: "【 紫微原局・排盤總目 】",
    bureau: "水二局・暫定命盤",
    subject: chartSubjectLine(input.nickname),
    birth: formatWesternBirthDate(input.birth_date),
    year: "歲次：癸酉年（劍鋒金）",
    focus: chartFocusLine(input.focus),
  };
}
