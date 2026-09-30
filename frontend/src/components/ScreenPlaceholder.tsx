/** Scaffold placeholder; each screen replaces it in its slice (docs/tasks.md). */
export function ScreenPlaceholder({ screen, title }: { screen: string; title: string }) {
  return (
    <main className="p-6" data-testid={`s${screen}-placeholder`}>
      <p className="text-label text-ink-muted">شاشة {screen}</p>
      <h1 className="text-h1">{title}</h1>
    </main>
  );
}
