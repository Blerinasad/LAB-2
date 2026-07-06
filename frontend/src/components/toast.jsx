import { useSelector, useDispatch } from "react-redux";
import { removeToast } from "../store/toast.slice.js";

const CONFIG = {
  success: { icon: "✓", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800/60", bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  warn: { icon: "!", bg: "bg-amber-50 dark:bg-amber-950/40",   border: "border-amber-200 dark:border-amber-800/60",   bar: "bg-amber-400",   text: "text-amber-700 dark:text-amber-400" },
  danger: { icon: "✕", bg: "bg-red-50 dark:bg-red-950/40",       border: "border-red-200 dark:border-red-900/60",       bar: "bg-red-500",     text: "text-red-700 dark:text-red-400" },
  info: { icon: "i", bg: "bg-blue-50 dark:bg-blue-950/40",     border: "border-blue-200 dark:border-blue-900/60",     bar: "bg-blue-500",    text: "text-blue-700 dark:text-blue-400" },
};

export default function Toaster() {
  const items = useSelector((s) => s.toast.items);
  const dispatch = useDispatch();

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[9999] flex flex-col gap-2.5 sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-[340px]">
      {items.map((t) => {
        const c = CONFIG[t.type] || CONFIG.info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border ${c.bg} ${c.border} shadow-lg shadow-black/[0.08] dark:shadow-black/30 overflow-hidden relative`}
            style={{ animation: "slideIn .2s ease" }}
          >
            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${c.bar}`} />
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${c.bar} text-white`}>
              {c.icon}
            </div>
            <div className="flex-1 min-w-0 pl-1">
              <p className={`text-[13px] font-semibold ${c.text}`}>{t.title}</p>
              {t.msg && <p className="text-[12px] text-stone-500 dark:text-stone-500 mt-0.5">{t.msg}</p>}
            </div>
            <button
              onClick={() => dispatch(removeToast(t.id))}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 text-[11px] ml-1 mt-0.5 flex-shrink-0 transition-colors"
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
