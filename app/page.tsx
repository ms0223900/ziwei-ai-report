export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <p className="text-label-caps text-tertiary uppercase">紫微 AI 觀星</p>
      <h1 className="text-display-lg text-on-background">輸入生辰，看見一份解讀</h1>
      <p className="text-body-md text-on-surface-variant">
        本服務僅供娛樂用途，不作為醫療、法律、財務、投資或重大人生決策依據。
      </p>
      <div className="rounded-lg bg-surface-container-low px-6 py-4 text-body-sm text-on-surface-variant">
        Checkpoint A1：專案骨架已就緒。生辰表單與報告將在後續單元接上。
      </div>
    </main>
  );
}
