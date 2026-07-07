export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-[#0f1117]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500 dark:border-white/10 dark:border-t-orange-400" />
    </div>
  );
}
