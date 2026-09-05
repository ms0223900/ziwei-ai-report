export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sheet flex-col justify-center gap-6 px-5 py-10">
      <h1 className="font-serif text-display text-ink">紫微解讀</h1>
      <p className="text-body text-ink">
        輸入生辰，先看基本分析。進階詳批鎖住。
      </p>
      <p className="text-disclaimer text-ink-soft">
        本結果僅供娛樂與自我反思，不作為醫療、法律、財務、投資或重大人生決策依據。
      </p>
      <div className="rounded-sheet border border-line bg-sheet px-6 py-4 text-label text-ink-soft">
        Checkpoint A1：骨架已就緒。畫面 1／2 依 design brief 接上。
      </div>
    </main>
  );
}
