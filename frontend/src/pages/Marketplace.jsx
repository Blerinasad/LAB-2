import { useState, useEffect, useMemo } from "react";
import api from "../services/api.js";
import { Spinner, Empty, Modal, Badge, FormGroup, Input, Select, FormRow } from "../components/ui.jsx";
import { fmtDate } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.js";
import { useAuth } from "../context/auth.context.jsx";
import { primaryRole } from "../config/roles.js";
import { normalizeApiList } from "../utils/apiData.js";

const ORDER_LABEL = { pending:"Në pritje", accepted:"Pranuar", rejected:"Refuzuar", preparing:"Në përgatitje", out_for_delivery:"Në rrugë", delivered:"Dorëzuar", cancelled:"Anuluar" };
const ORDER_BADGE = { pending:"gold", accepted:"green", rejected:"red", preparing:"blue", out_for_delivery:"gold", delivered:"green", cancelled:"stone" };
const money = (v) => `${Number(v||0).toFixed(2)}€`;

export default function Marketplace() {
  const { user } = useAuth();
  const role = primaryRole(user);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [storeOrders, setStoreOrders] = useState([]);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState({});

  // User: create order
  const [lists, setLists] = useState([]);
  const [orderModal, setOrderModal] = useState(false);
  const [form, setForm] = useState({ shopping_list_id:"", store_id:"", delivery_address:"", payment_method:"cash" });

  const load = async () => {
    setLoading(true);
    try {
      const reqs = [api.get("/market/stores")];
      if (role === "User") reqs.push(api.get("/market/orders/my"), api.get("/shopping-lists"));
      if (role === "Manager" || role === "Admin") reqs.push(api.get("/market/orders/store"));
      const res = await Promise.all(reqs.map(p => p.catch(() => ({ data:{ data:[] } }))));
      setStores(normalizeApiList(res[0]?.data, ["stores"]));
      if (role === "User") {
        setMyOrders(normalizeApiList(res[1]?.data, ["orders"]));
        setLists(normalizeApiList(res[2]?.data, ["lists", "shoppingLists"]).filter(l => l.status === "active"));
      } else {
        setStoreOrders(normalizeApiList(res[1]?.data, ["orders"]));
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [role]);

  const openDetail = async (id) => {
    try { const { data } = await api.get(`/market/orders/${id}`); setDetail(data.data || data); }
    catch { toast.danger("Gabim", "Nuk u hap porosia"); }
  };

  const setStatus = async (id, status) => {
    setBusy(b => ({ ...b, [id]:true }));
    try {
      await api.patch(`/market/orders/${id}/status`, { status });
      toast.success("U përditësua", `Statusi: ${ORDER_LABEL[status]}`);
      await load();
      if (detail?.id === id) openDetail(id);
    } catch (e) { toast.danger("Gabim", e.response?.data?.message || "Nuk u përditësua"); }
    finally { setBusy(b => ({ ...b, [id]:false })); }
  };

  const createOrder = async () => {
    if (!form.shopping_list_id || !form.store_id) { toast.warn("Mungon", "Zgjidh listën dhe dyqanin"); return; }
    try {
      await api.post("/market/orders", form);
      toast.success("Porosia u dërgua", "Do të njoftohesh kur të pranohet");
      setOrderModal(false);
      setForm({ shopping_list_id:"", store_id:"", delivery_address:"", payment_method:"cash" });
      load();
    } catch (e) { toast.danger("Gabim", e.response?.data?.message || "Nuk u krijua porosia"); }
  };

  if (loading) return <Spinner center />;

  // ---------- MANAGER / ADMIN VIEW ----------
  if (role === "Manager" || role === "Admin") {
    const safeStoreOrders = Array.isArray(storeOrders) ? storeOrders : [];
    const pending = safeStoreOrders.filter(o => o.status === "pending");
    const active = safeStoreOrders.filter(o => ["accepted","preparing","out_for_delivery"].includes(o.status));
    const closed = safeStoreOrders.filter(o => ["delivered","rejected","cancelled"].includes(o.status));
    const isAdmin = role === "Admin";

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Në pritje" value={pending.length} tone="gold" />
          <StatBox label="Aktive" value={active.length} tone="blue" />
          <StatBox label="Të mbyllura" value={closed.length} tone="green" />
          <StatBox label="Gjithsej" value={safeStoreOrders.length} tone="stone" />
        </div>

        <OrderSection
          title={isAdmin ? "Të gjitha porositë në pritje" : "Porositë që presin miratimin"}
          orders={pending} empty="Nuk ka porosi në pritje"
          onOpen={openDetail}
          actions={(o) => (
            <div className="flex gap-2">
              <button className="btn-primary btn-xs" disabled={busy[o.id]} onClick={() => setStatus(o.id,"accepted")}>Prano</button>
              <button className="btn-danger btn-xs" disabled={busy[o.id]} onClick={() => setStatus(o.id,"rejected")}>Refuzo</button>
            </div>
          )}
        />

        <OrderSection title="Porositë aktive" orders={active} empty="Asnjë porosi aktive" onOpen={openDetail} />
        <OrderSection title="Historiku" orders={closed} empty="Ende s'ka porosi të mbyllura" onOpen={openDetail} muted />

        {detail && <OrderModal order={detail} onClose={() => setDetail(null)} />}
      </div>
    );
  }

  // ---------- USER VIEW ----------
  const safeMyOrders = Array.isArray(myOrders) ? myOrders : [];
  const safeLists = Array.isArray(lists) ? lists : [];
  const safeStores = Array.isArray(stores) ? stores : [];
  const active = safeMyOrders.filter(o => !["delivered","rejected","cancelled"].includes(o.status));
  const past = safeMyOrders.filter(o => ["delivered","rejected","cancelled"].includes(o.status));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[15px] font-semibold text-stone-800 dark:text-stone-200">Porosit & Dyqane</p>
          <p className="text-[12.5px] text-stone-500 dark:text-stone-400">Porosit ingredientët nga një listë blerjeje te një dyqan.</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setOrderModal(true)} disabled={!safeLists.length || !safeStores.length}>
          Porosi e re
        </button>
      </div>

      {!safeLists.length && (
        <div className="sk-card p-4 text-[12.5px] text-stone-500 dark:text-stone-400">
          S'ke ndonjë listë aktive blerjeje. Krijo një te <span className="font-medium text-stone-700 dark:text-stone-300">Listat e Blerjes</span> para se të porositësh.
        </div>
      )}

      <OrderSection title="Porositë aktive" orders={active} empty="Nuk ke porosi aktive" onOpen={openDetail} />
      <OrderSection title="Historiku i porosive" orders={past} empty="Ende s'ke porositur" onOpen={openDetail} muted />

      {orderModal && (
        <Modal title="Porosi e re" onClose={() => setOrderModal(false)}
          actions={<>
            <button className="btn-ghost btn-sm" onClick={() => setOrderModal(false)}>Anulo</button>
            <button className="btn-primary btn-sm" onClick={createOrder}>Dërgo porosinë</button>
          </>}>
          <FormGroup label="Lista e blerjes">
            <Select value={form.shopping_list_id} onChange={e => setForm({ ...form, shopping_list_id:e.target.value })}>
              <option value="">Zgjidh listën…</option>
              {safeLists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Dyqani">
            <Select value={form.store_id} onChange={e => setForm({ ...form, store_id:e.target.value })}>
              <option value="">Zgjidh dyqanin…</option>
              {safeStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Adresa e dorëzimit">
            <Input value={form.delivery_address} onChange={e => setForm({ ...form, delivery_address:e.target.value })} placeholder="Rruga, qyteti…" />
          </FormGroup>
          <FormGroup label="Pagesa">
            <Select value={form.payment_method} onChange={e => setForm({ ...form, payment_method:e.target.value })}>
              <option value="cash">Kesh në dorëzim</option>
              <option value="card">Kartë</option>
            </Select>
          </FormGroup>
        </Modal>
      )}

      {detail && <OrderModal order={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

// ---------- Nën-komponentë ----------
function StatBox({ label, value, tone }) {
  const colors = {
    gold:"text-amber-600 dark:text-amber-400", blue:"text-blue-600 dark:text-blue-400",
    green:"text-emerald-600 dark:text-emerald-400", stone:"text-stone-700 dark:text-stone-300",
  };
  return (
    <div className="sk-card p-4">
      <p className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
    </div>
  );
}

function OrderSection({ title, orders, empty, onOpen, actions, muted }) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  return (
    <div className="sk-card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 dark:border-white/[0.06]">
        <p className="text-[13px] font-semibold text-stone-700 dark:text-stone-300">{title}</p>
      </div>
      {!safeOrders.length ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-stone-400">{empty}</div>
      ) : (
        <div className="divide-y divide-stone-100 dark:divide-white/[0.05]">
          {safeOrders.map(o => (
            <div key={o.id} className={`flex items-center gap-3 px-4 py-3 ${muted ? "opacity-80" : ""}`}>
              <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(o.id)}>
                <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 truncate">
                  Porosi #{o.id}{o.store_name ? ` · ${o.store_name}` : ""}
                </p>
                <p className="text-[11.5px] text-stone-500 dark:text-stone-400">
                  {o.total_items ?? o.item_count ?? "–"} artikuj · {money(o.estimated_total ?? o.total_amount)} · {fmtDate(o.created_at)}
                </p>
              </button>
              <Badge variant={ORDER_BADGE[o.status] || "stone"}>{ORDER_LABEL[o.status] || o.status}</Badge>
              {actions && actions(o)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderModal({ order, onClose }) {
  return (
    <Modal title={`Porosi #${order.id}`} onClose={onClose}>
      <div className="space-y-3 text-[13px]">
        <Row k="Statusi" v={<Badge variant={ORDER_BADGE[order.status] || "stone"}>{ORDER_LABEL[order.status] || order.status}</Badge>} />
        {order.store_name && <Row k="Dyqani" v={order.store_name} />}
        {order.delivery_address && <Row k="Adresa" v={order.delivery_address} />}
        <Row k="Subtotal" v={money(order.subtotal ?? Number(order.total_amount ?? order.estimated_total) - Number(order.delivery_fee || 0))} />
        <Row k="Tarifa e dorëzimit" v={money(order.delivery_fee)} />
        <Row k="Totali" v={money(order.total_amount ?? order.estimated_total)} />
        <Row k="Krijuar" v={fmtDate(order.created_at)} />
        {Array.isArray(order.items) && order.items.length > 0 && (
          <div className="pt-2 border-t border-stone-100 dark:border-white/[0.06]">
            <p className="text-[11px] uppercase tracking-wide text-stone-400 font-semibold mb-2">Artikujt</p>
            <div className="space-y-1">
              {(Array.isArray(order.items) ? order.items : []).map((it, i) => (
                <div key={i} className="flex justify-between text-[12.5px]">
                  <span className="text-stone-700 dark:text-stone-300">{it.ingredient_name || it.name}</span>
                  <span className="text-stone-500">{it.quantity} {it.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-stone-500 dark:text-stone-400">{k}</span>
      <span className="font-medium text-stone-800 dark:text-stone-200 text-right">{v}</span>
    </div>
  );
}
