import { useEffect, useState } from "react";
import { useAuth } from "../context/auth.context.jsx";
import { Spinner, Empty, Badge, Progress } from "../components/ui.jsx";
import { getDashboardSummary } from "../services/Dashboard.services.js";
import { getExpiringItems } from "../services/Inventory.services.js";
import { getAuditLog } from "../services/Report.services.js";
import { getMyOrders, getStoreOrders, getCourierOrders, updateOrderStatus, claimOrder } from "../services/Market.services.js";
import { getMLRecommendations } from "../services/ML.services.js";
import { getShoppingLists } from "../services/ShoppingList.services.js";
import { normalizeApiList } from "../utils/apiData.js";

const hr = new Date().getHours();
const GREET = hr < 12 ? "Mirëmëngjes" : hr < 18 ? "Mirëdita" : "Mirëmbrëma";
const money = (v) => `${Number(v || 0).toFixed(2)}€`;

const ORDER_LABEL = {
  pending: "Në pritje",
  accepted: "U pranua",
  rejected: "U refuzua",
  preparing: "Në përgatitje",
  out_for_delivery: "Në rrugë",
  delivered: "U dorëzua",
  cancelled: "U anulua",
};
const ORDER_BADGE = {
  pending: "amber",
  accepted: "green",
  rejected: "red",
  preparing: "blue",
  out_for_delivery: "amber",
  delivered: "green",
  cancelled: "stone",
};

function Icon({ type }) {
  const common = { viewBox: "0 0 20 20", fill: "currentColor", className: "h-4 w-4" };
  const paths = {
    users: "M7 9a3 3 0 100-6 3 3 0 000 6zm7 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.5 16c0-2.5 2.5-4.5 5.5-4.5s5.5 2 5.5 4.5v.5h-11V16zm12.2-.5c0-1.6-.7-3-1.8-4 .7-.3 1.4-.5 2.1-.5 2.2 0 4 1.6 4 3.8v.7h-4.3z",
    box: "M2 5.5L10 2l8 3.5v9L10 18l-8-3.5v-9zm8 1.6L4.6 4.9 10 3l5.4 1.9L10 7.1zm-6 1l5 2.2v6.3l-5-2.2V8.1zm12 0v6.3l-5 2.2v-6.3l5-2.2z",
    bell: "M10 2a5 5 0 00-5 5v3.2L3.5 13v1h13v-1L15 10.2V7a5 5 0 00-5-5zm-2 13.5a2 2 0 004 0H8z",
    truck: "M2 4.5h10v3h3l3 3.4v3.6h-1.7a2.1 2.1 0 01-4.2 0H8.2a2.1 2.1 0 01-4.2 0H2v-10zm10 4.6v3h4.4l.1-.1-2.2-2.9H12zM6.1 15.6a.9.9 0 100-1.8.9.9 0 000 1.8zm8.1 0a.9.9 0 100-1.8.9.9 0 000 1.8z",
    ok: "M10 1.8a8.2 8.2 0 100 16.4 8.2 8.2 0 000-16.4zm4 5.9l-4.9 5.6-3-2.7 1.1-1.2 1.8 1.6 3.8-4.4 1.2 1.1z",
    coin: "M10 1.8a8.2 8.2 0 100 16.4 8.2 8.2 0 000-16.4zm.8 3v1A3 3 0 0113 7.1l-1.3.9c-.3-.5-.9-.8-1.7-.8-.9 0-1.4.4-1.4.9 0 .5.4.7 1.7 1 1.8.4 2.9 1 2.9 2.5 0 1.3-.9 2.2-2.4 2.4v1H9.2v-1a3.4 3.4 0 01-2.6-1.6l1.4-.8c.4.6 1 1 1.9 1 1 0 1.5-.4 1.5-1 0-.6-.5-.8-1.9-1.1-1.7-.4-2.7-1-2.7-2.4 0-1.2.9-2 2.4-2.3v-1h1.6z",
    warn: "M10 2.3L18.6 17H1.4L10 2.3zm0 4.2a.9.9 0 00-.9.95l.25 4.1a.65.65 0 001.3 0l.25-4.1A.9.9 0 0010 6.5zm0 7.2a1 1 0 100 2 1 1 0 000-2z",
    cart: "M2 3h2.3l.6 2H18l-2 7H6.4L5 5.6 4.6 4H2V3zm5 9.6h8.4l1.3-4.6H6.1l.9 4.6zM7.5 16a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8zm7 0a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z",
  };
  return <svg {...common}><path d={paths[type] || paths.box} /></svg>;
}

function Hero({ user, title, sub }) {
  const name = user?.first_name || "Përdorues";
  return (
    <div
      className="mb-5 rounded-xl px-5 py-4 shadow-sm transition-colors dark:shadow-none"
      style={{
        background: "var(--forge)",
        border: "1px solid var(--steel)",
      }}
    >
      <p className="text-[22px] font-bold tracking-tight" style={{ color: "var(--cream)" }}>
        {GREET},{" "}
        <span className="text-orange-500 dark:text-orange-400">{name}</span>
      </p>
      <p className="mt-1 text-[13px]" style={{ color: "var(--ash)" }}>{title} · {sub}</p>
    </div>
  );
}

function StatCard({ label, value, icon, tone = "orange", sub }) {
  const colors = {
    orange: "text-orange-500 border-orange-200 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300",
    green: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "text-amber-600 border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
    blue: "text-blue-600 border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300",
    red: "text-red-600 border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300",
    stone: "text-stone-600 border-stone-200 bg-stone-50 dark:border-white/[0.10] dark:bg-white/[0.05] dark:text-stone-300",
  };
  return (
    <div className="sk-card p-4 dark:border-white/[0.08] dark:bg-[#1a1d27]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400 dark:text-stone-400">{label}</p>
          <p className="mt-2 text-[28px] font-bold leading-none text-stone-900 dark:text-white">{value}</p>
          {sub && <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${colors[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

function Panel({ title, sub, children, action }) {
  return (
    <div className="sk-card overflow-hidden p-0 dark:border-white/[0.08] dark:bg-[#1a1d27]">
      <div className="flex items-start justify-between gap-3 border-b border-stone-100 bg-stone-50/40 px-4 py-3 dark:border-white/[0.07] dark:bg-white/[0.025]">
        <div>
          <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-100">{title}</p>
          {sub && <p className="mt-0.5 text-[11.5px] text-stone-400 dark:text-stone-400">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DataRow({ title, sub, right, muted }) {
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-stone-100 py-2.5 last:border-none dark:border-white/[0.07] ${muted ? "opacity-70" : ""}`}>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-stone-800 dark:text-stone-100">{title}</p>
        {sub && <p className="mt-0.5 truncate text-[11.5px] text-stone-500 dark:text-stone-400">{sub}</p>}
      </div>
      <div className="shrink-0 text-stone-800 dark:text-stone-100">{right}</div>
    </div>
  );
}

function Notice({ children, tone = "orange", icon = "bell" }) {
  const map = {
    orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/12 dark:text-orange-300",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-300",
  };
  return (
    <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-semibold ${map[tone]}`}>
      <Icon type={icon} />
      {children}
    </div>
  );
}

function AdminDashboard({ user }) {
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getDashboardSummary(), getAuditLog({ limit: 8 })]).then(([summary, logs]) => {
      if (summary.status === "fulfilled") setData(summary.value.data);
      if (logs.status === "fulfilled") setAudit(normalizeApiList(logs.value, ["items", "rows"]));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center />;

  const users = data?.admin?.users ?? {};
  const orders = data?.admin?.orders ?? {};
  const totalUsers = Number(users.total || 0);
  const activeUsers = Number(users.active || 0);
  const inactiveUsers = Math.max(0, totalUsers - activeUsers);

  return (
    <div>
      <Hero user={user} title="Paneli i Adminit" sub="administrim dhe monitorim sistemi" />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Përdorues" value={totalUsers} icon={<Icon type="users" />} tone="orange" />
        <StatCard label="Aktivë" value={activeUsers} icon={<Icon type="ok" />} tone="green" />
        <StatCard label="Joaktivë" value={inactiveUsers} icon={<Icon type="warn" />} tone="red" />
        <StatCard label="Të ardhura" value={money(orders.revenue)} icon={<Icon type="coin" />} tone="blue" sub={`${Number(orders.total || 0)} porosi të dorëzuara`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Gjendja e përdoruesve" sub="Statusi aktual i llogarive">
          <DataRow title="Gjithsej përdorues" right={<b>{totalUsers}</b>} />
          <DataRow title="Aktivë" right={<Badge variant="green">{activeUsers}</Badge>} />
          <DataRow title="Joaktivë" right={<Badge variant="red">{inactiveUsers}</Badge>} />
        </Panel>
        <Panel title="Aktiviteti i fundit" sub="Audit log">
          {audit.length === 0 ? <Empty title="Nuk ka aktivitet" /> : audit.map((item) => (
            <DataRow
              key={item.id}
              title={item.action || "Aktivitet"}
              sub={`${item.entity || "System"}${item.entity_id ? ` #${item.entity_id}` : ""} · ${item.email || "system"}`}
              right={<span className="text-[11px] text-stone-400 dark:text-stone-500">{item.created_at?.slice(0, 16).replace("T", " ")}</span>}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function ManagerDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => getStoreOrders().then((res) => setOrders(normalizeApiList(res, ["orders"]))).catch(() => setOrders([])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    setBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await updateOrderStatus(id, status);
      await load();
    } finally {
      setBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <Spinner center />;

  const pending = orders.filter((o) => o.status === "pending");
  const active = orders.filter((o) => ["accepted", "preparing", "out_for_delivery"].includes(o.status));
  const delivered = orders.filter((o) => o.status === "delivered");
  const revenue = delivered.reduce((sum, order) => sum + Number(order.estimated_total || order.total_amount || 0), 0);

  return (
    <div>
      <Hero user={user} title="Paneli i Managerit" sub="porosi, përgatitje dhe marketplace" />
      {pending.length > 0 && <Notice>{pending.length} porosi presin pranimin</Notice>}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Në pritje" value={pending.length} icon={<Icon type="bell" />} tone="orange" />
        <StatCard label="Aktive" value={active.length} icon={<Icon type="box" />} tone="amber" />
        <StatCard label="Dorëzuar" value={delivered.length} icon={<Icon type="ok" />} tone="green" />
        <StatCard label="Të ardhura" value={money(revenue)} icon={<Icon type="coin" />} tone="blue" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Porosi të reja" sub="Prano ose refuzo">
          {pending.length === 0 ? <Empty title="Nuk ka porosi të reja" /> : pending.map((order) => (
            <DataRow
              key={order.id}
              title={`Porosi #${order.id}`}
              sub={`${order.first_name || ""} ${order.last_name || ""} · ${order.total_items ?? "0"} artikuj · ${money(order.estimated_total)}`}
              right={(
                <div className="flex gap-1">
                  <button className="btn-primary btn-xs" disabled={busy[order.id]} onClick={() => setStatus(order.id, "accepted")}>Prano</button>
                  <button className="btn-danger btn-xs" disabled={busy[order.id]} onClick={() => setStatus(order.id, "rejected")}>Refuzo</button>
                </div>
              )}
            />
          ))}
        </Panel>
        <Panel title="Në proces" sub="Porosi të pranuara ose në dorëzim">
          {active.length === 0 ? <Empty title="Nuk ka porosi aktive" /> : active.map((order) => (
            <DataRow
              key={order.id}
              title={`Porosi #${order.id}`}
              sub={`${order.delivery_address || "Pa adresë"} · ${money(order.estimated_total)}`}
              right={<Badge variant={ORDER_BADGE[order.status]}>{ORDER_LABEL[order.status]}</Badge>}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function CourierDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => getCourierOrders().then((res) => setOrders(normalizeApiList(res, ["orders"]))).catch(() => setOrders([])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleClaim = async (id) => {
    setBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await claimOrder(id);
      await load();
    } finally {
      setBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDelivered = async (id) => {
    setBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await updateOrderStatus(id, "delivered");
      await load();
    } finally {
      setBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <Spinner center />;

  const available = orders.filter((o) => !o.courier_id && ["accepted", "preparing"].includes(o.status));
  const active = orders.filter((o) => o.courier_id && o.status === "out_for_delivery");
  const deliveredToday = orders.filter((o) => o.status === "delivered" && String(o.updated_at || o.created_at).slice(0, 10) === new Date().toISOString().slice(0, 10));

  return (
    <div>
      <Hero user={user} title="Paneli i Korrierit" sub="marrje dhe dorëzime" />
      {available.length > 0 && <Notice tone="green" icon="box">{available.length} porosi janë gati për marrje</Notice>}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Gati për marrje" value={available.length} icon={<Icon type="box" />} tone="green" />
        <StatCard label="Në dorëzim" value={active.length} icon={<Icon type="truck" />} tone="amber" />
        <StatCard label="Dorëzuar sot" value={deliveredToday.length} icon={<Icon type="ok" />} tone="blue" />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Gati për marrje">
          {available.length === 0 ? <Empty title="Nuk ka porosi" /> : available.map((order) => (
            <DataRow
              key={order.id}
              title={`Porosi #${order.id}`}
              sub={`${order.delivery_address || "Pa adresë"} · ${money(order.estimated_total)}`}
              right={<button className="btn-primary btn-xs" disabled={busy[order.id]} onClick={() => handleClaim(order.id)}>Merr</button>}
            />
          ))}
        </Panel>
        <Panel title="Në dorëzim">
          {active.length === 0 ? <Empty title="Nuk ka dorëzim aktiv" /> : active.map((order) => (
            <DataRow
              key={order.id}
              title={`Porosi #${order.id}`}
              sub={`${order.delivery_address || "Pa adresë"} · ${money(order.estimated_total)}`}
              right={<button className="btn-primary btn-xs" disabled={busy[order.id]} onClick={() => handleDelivered(order.id)}>Dorëzuar</button>}
            />
          ))}
        </Panel>
        <Panel title="Dorëzuar sot">
          {deliveredToday.length === 0 ? <Empty title="Ende asnjë sot" /> : deliveredToday.map((order) => (
            <DataRow
              key={order.id}
              title={`Porosi #${order.id}`}
              sub={`${order.delivery_address || "Pa adresë"} · ${money(order.estimated_total)}`}
              right={<Badge variant="green">Dorëzuar</Badge>}
              muted
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function UserDashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recs, setRecs] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getDashboardSummary(),
      getExpiringItems(5),
      getMyOrders(),
      getMLRecommendations(),
      getShoppingLists({ status: "active", limit: 3 }),
    ]).then(([summaryRes, expiringRes, ordersRes, recsRes, listsRes]) => {
      if (summaryRes.status === "fulfilled") setSummary(summaryRes.value.data);
      if (expiringRes.status === "fulfilled") setExpiring(normalizeApiList(expiringRes.value, ["items"]));
      if (ordersRes.status === "fulfilled") setOrders(normalizeApiList(ordersRes.value, ["orders"]));
      if (recsRes.status === "fulfilled") setRecs(normalizeApiList(recsRes.value, ["recommendations"]).slice(0, 3));
      if (listsRes.status === "fulfilled") setLists(normalizeApiList(listsRes.value, ["lists"]).slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center />;

  const inv = summary?.inventory ?? {};
  const activeOrder = orders.find((o) => !["delivered", "cancelled", "rejected"].includes(o.status));

  return (
    <div>
      <Hero
        user={user}
        title="Paneli i kuzhinës"
        sub={expiring.length > 0 ? `${expiring.length} produkte skadojnë së shpejti` : "inventari është në rregull"}
      />
      {activeOrder && (
        <Notice icon="truck">Porosia #{activeOrder.id} është: {ORDER_LABEL[activeOrder.status] || activeOrder.status}</Notice>
      )}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Artikuj" value={inv.total_items ?? 0} icon={<Icon type="box" />} />
        <StatCard label="Skadojnë" value={inv.expiring_soon ?? 0} icon={<Icon type="warn" />} tone="amber" />
        <StatCard label="Lista aktive" value={summary?.shopping?.active_lists ?? 0} icon={<Icon type="cart" />} tone="green" />
        <StatCard label="Porosi" value={orders.length} icon={<Icon type="truck" />} tone="blue" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Skadojnë së shpejti" sub="Brenda 5 ditëve">
          {expiring.length === 0 ? <Empty title="Asgjë kritike" /> : expiring.slice(0, 5).map((item) => (
            <DataRow
              key={item.id}
              title={item.ingredient_name}
              sub={`${item.quantity} ${item.unit} · ${item.location || "Pa lokacion"}`}
              right={<Badge variant={item.days_until_expiry <= 2 ? "red" : "amber"}>{item.days_until_expiry} ditë</Badge>}
            />
          ))}
        </Panel>
        <Panel title="ML Sugjerime" sub="Bazuar në inventar">
          {recs.length === 0 ? <Empty title="Nuk ka sugjerime" /> : recs.map((recipe, index) => (
            <DataRow
              key={recipe.recipe_id || index}
              title={recipe.title}
              sub={`${recipe.match_percentage || 0}% përputhje`}
              right={<Badge variant="green">{Math.round(Number(recipe.score || 0) * 100)}%</Badge>}
            />
          ))}
        </Panel>
        <Panel title="Listat aktive">
          {lists.length === 0 ? <Empty title="Nuk ka lista aktive" /> : lists.map((list) => {
            const total = Math.max(Number(list.total_items || 0), 1);
            const pct = Math.round((Number(list.purchased_items || 0) / total) * 100);
            return (
              <div key={list.id} className="border-b border-stone-100 py-2.5 last:border-none dark:border-white/[0.07]">
                <div className="mb-2 flex justify-between text-[12px]">
                  <span className="font-semibold text-stone-800 dark:text-stone-100">{list.title}</span>
                  <span className="text-stone-400 dark:text-stone-500">{list.purchased_items || 0}/{list.total_items || 0}</span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </Panel>
        <Panel title="Porositë e fundit">
          {orders.length === 0 ? <Empty title="Ende nuk ke porosi" /> : orders.slice(0, 5).map((order) => (
            <DataRow
              key={order.id}
              title={`Porosi #${order.id}`}
              sub={`${order.store_name || "Market"} · ${money(order.estimated_total || order.total_amount)}`}
              right={<Badge variant={ORDER_BADGE[order.status]}>{ORDER_LABEL[order.status] || order.status}</Badge>}
            />
          ))}
        </Panel>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  if (roles.includes("Admin")) return <AdminDashboard user={user} />;
  if (roles.includes("Manager")) return <ManagerDashboard user={user} />;
  if (roles.includes("Courier")) return <CourierDashboard user={user} />;
  return <UserDashboard user={user} />;
}
