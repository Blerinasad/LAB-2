import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setItems, markRead as markSlice, setUnread } from "../store/notifSlice.js";
import api from "../services/api.js";
import { Empty } from "../components/ui.jsx";
import { normalizeApiList } from "../utils/apiData.js";

const nsv = { viewBox:"0 0 20 20", fill:"currentColor", width:16, height:16 };
const NFlame = () => <svg {...nsv}><path d="M10 2s.6 2.4-1.2 4.6C7.2 8.5 6 9.8 6 12a4 4 0 0 0 8 0c0-1.4-.6-2.4-1.2-3.3-.4.9-1 1.4-1 1.4.3-2.6-.6-5.7-1.8-8.1Z"/></svg>;
const NSpark = () => <svg {...nsv}><path d="M10 2l1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6L10 2Zm6 8 .9 2.1L19 13l-2.1.9L16 16l-.9-2.1L13 13l2.1-.9L16 10Z"/></svg>;
const NBox = () => <svg {...nsv}><path d="M2 5.5 10 2l8 3.5v9L10 18l-8-3.5v-9Zm8 1.6L4.6 4.9 10 3l5.4 1.9L10 7.1Zm-6 1 5 2.2v6.3l-5-2.2V8.1Zm12 0v6.3l-5 2.2v-6.3l5-2.2Z"/></svg>;
const TYPE = {
  expiry_alert: { icon:<NFlame/>, color:"text-amber-500", bg:"bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50" },
  recommendation: { icon:<NSpark/>, color:"text-violet-500", bg:"bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50" },
  order: { icon:<NBox/>, color:"text-blue-500", bg:"bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50" },
  system: { icon:"ℹ", color:"text-stone-500", bg:"bg-stone-50 dark:bg-white/[0.04] border-stone-200 dark:border-white/[0.06]" },
};

export default function Notifications() {
  const dispatch = useDispatch();
  const items = useSelector((s) => s.notif.items);
  const unread = useSelector((s) => s.notif.unread);

  useEffect(() => {
    api.get("/notifications/my").then(({ data }) => dispatch(setItems(normalizeApiList(data, ["notifications"]))));
  }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    dispatch(markSlice(id));
  };

  const markAll = async () => {
    await api.patch("/notifications/mark-all-read").catch(() => {});
    api.get("/notifications/my").then(({ data }) => { dispatch(setItems(normalizeApiList(data, ["notifications"]))); dispatch(setUnread(0)); });
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-stone-500 dark:text-stone-500">{(Array.isArray(items) ? items : []).length} njoftime</span>
          {unread > 0 && <span className="badge badge-orange">{unread} të reja</span>}
        </div>
        {unread > 0 && (
          <button className="btn-ghost btn-sm" onClick={markAll}>✓ Shëno të gjitha si të lexuara</button>
        )}
      </div>

      {(Array.isArray(items) ? items : []).length === 0 ? (
        <div className="sk-card">
          <Empty title="Nuk ka njoftime" sub="Njoftimet e reja do shfaqen këtu" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {(Array.isArray(items) ? items : []).map((n) => {
            const t = TYPE[n.type] || TYPE.system;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${t.bg} ${!n.is_read ? "cursor-pointer hover:shadow-sm" : "opacity-60"}`}
              >
                <div className={`text-xl flex-shrink-0 mt-0.5 ${t.color}`}>{t.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold text-stone-800 dark:text-stone-200 ${!n.is_read ? "font-bold" : ""}`}>{n.title}</p>
                  <p className="text-[12px] text-stone-500 dark:text-stone-500 mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-stone-400 dark:text-stone-600 mt-1.5">{n.created_at?.slice(0,16).replace("T"," ")}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
