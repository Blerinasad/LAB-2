import { useState, useEffect } from "react";
import api from "../services/api.js";
import { Spinner, Badge } from "../components/ui.jsx";
import { fmtDate } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.js";

const ORDER_LABEL = { pending:"Në pritje", accepted:"Pranuar", preparing:"Në përgatitje", out_for_delivery:"Në rrugë", delivered:"Dorëzuar" };
const money = (v) => `${Number(v||0).toFixed(2)}€`;

export default function Deliveries() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/market/orders/courier");
      setOrders(data.data || []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const claim = async (id) => {
    setBusy(b => ({ ...b, [id]:true }));
    try {
      await api.post(`/market/orders/${id}/claim`);
      toast.success("U mor", "Porosia u shtua te dorëzimet e tua");
      load();
    } catch (e) { toast.danger("Gabim", e.response?.data?.message || "Nuk u mor porosia"); }
    finally { setBusy(b => ({ ...b, [id]:false })); }
  };

  const setStatus = async (id, status) => {
    setBusy(b => ({ ...b, [id]:true }));
    try {
      await api.patch(`/market/orders/${id}/status`, { status });
      toast.success("U përditësua", ORDER_LABEL[status]);
      load();
    } catch (e) { toast.danger("Gabim", e.response?.data?.message || "Nuk u përditësua"); }
    finally { setBusy(b => ({ ...b, [id]:false })); }
  };

  if (loading) return <Spinner center />;

  const available = orders.filter(o => !o.courier_id && ["accepted","preparing"].includes(o.status));
  const mine = orders.filter(o => o.courier_id && o.status === "out_for_delivery");
  const doneToday = orders.filter(o => o.status === "delivered" && isToday(o.updated_at || o.created_at));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Gati për marrje" value={available.length} tone="gold" />
        <StatBox label="Në dorëzim" value={mine.length} tone="blue" />
        <StatBox label="Dorëzuar sot" value={doneToday.length} tone="green" />
      </div>

      <Section title="Gati për marrje" empty="Asnjë porosi gati për t'u marrë tani.">
        {available.map(o => (
          <DeliveryRow key={o.id} o={o}>
            <button className="btn-primary btn-xs" disabled={busy[o.id]} onClick={() => claim(o.id)}>Merr</button>
          </DeliveryRow>
        ))}
      </Section>

      <Section title="Dorëzimet e mia" empty="S'ke ndonjë dorëzim aktiv.">
        {mine.map(o => (
          <DeliveryRow key={o.id} o={o}>
            <button className="btn-primary btn-xs" disabled={busy[o.id]} onClick={() => setStatus(o.id,"delivered")}>Shëno dorëzuar</button>
          </DeliveryRow>
        ))}
      </Section>

      <Section title="Dorëzuar sot" empty="Ende s'ke dorëzuar sot." muted>
        {doneToday.map(o => <DeliveryRow key={o.id} o={o} />)}
      </Section>
    </div>
  );
}

function isToday(d) {
  if (!d) return false;
  return String(d).slice(0,10) === new Date().toISOString().slice(0,10);
}

function StatBox({ label, value, tone }) {
  const colors = { gold:"text-amber-600 dark:text-amber-400", blue:"text-blue-600 dark:text-blue-400", green:"text-emerald-600 dark:text-emerald-400" };
  return (
    <div className="sk-card p-4">
      <p className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function Section({ title, empty, muted, children }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="sk-card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 dark:border-white/[0.06]">
        <p className="text-[13px] font-semibold text-stone-700 dark:text-stone-300">{title}</p>
      </div>
      {!has ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-stone-400">{empty}</div>
      ) : (
        <div className={`divide-y divide-stone-100 dark:divide-white/[0.05] ${muted ? "opacity-80" : ""}`}>{children}</div>
      )}
    </div>
  );
}

function DeliveryRow({ o, children }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 truncate">
          Porosi #{o.id}{o.store_name ? ` · ${o.store_name}` : ""}
        </p>
        <p className="text-[11.5px] text-stone-500 dark:text-stone-400 truncate">
          {o.delivery_address || "Pa adresë"} · {money(o.estimated_total ?? o.total_amount)}
        </p>
      </div>
      <Badge variant={o.status === "delivered" ? "green" : "gold"}>{ORDER_LABEL[o.status] || o.status}</Badge>
      {children}
    </div>
  );
}
