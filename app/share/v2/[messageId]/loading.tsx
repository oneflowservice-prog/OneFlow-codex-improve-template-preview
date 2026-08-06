export default function LoadingPage() {
  return (
    <div className="flex h-full w-full grow flex-col bg-[hsl(var(--background))]">
      <div className="flex h-full grow items-center justify-center p-3">
        <div className="h-full w-full animate-pulse overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.52)]">
          <div className="flex h-10 items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.86)] px-3">
            <div className="h-3 w-20 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
            <div className="h-3 w-28 rounded-full bg-[hsl(var(--foreground)/0.08)]" />
            <div className="ml-auto h-6 w-16 rounded-md bg-[hsl(var(--foreground)/0.08)]" />
          </div>
          <div className="grid h-[calc(100%-2.5rem)] place-items-center">
            <div className="w-full max-w-3xl px-5">
              <div className="h-10 w-[58%] rounded-xl bg-[hsl(var(--foreground)/0.08)]" />
              <div className="mt-4 h-4 w-[82%] rounded-full bg-[hsl(var(--foreground)/0.08)]" />
              <div className="mt-2 h-4 w-[68%] rounded-full bg-[hsl(var(--foreground)/0.08)]" />
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <div
                    key={`share-preview-card-${index}`}
                    className="h-28 rounded-xl bg-[hsl(var(--foreground)/0.08)]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50 hidden md:block">
        <div className="h-7 w-36 animate-pulse rounded-full border-[0.5px] border-[#BABABA] bg-[hsl(var(--surface))] shadow-lg" />
      </div>
    </div>
  );
}
