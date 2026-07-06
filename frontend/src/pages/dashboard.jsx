import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/auth.context.jsx";
import api from "../services/api.js";
import {
  getDashboardActivity,
  getDashboardCharts,
  getDashboardSummary,
} from "../services/dashboard.service.js";
import { getExpiringItems } from "../services/inventory.service.js";
import { getMLRecommendations } from "../services/ml.service.js";
import { getMyOrders } from "../services/marketplace.service.js";
import { getShoppingLists } from "../services/shopping.service.js";

const CARD_ACCENTS = [
  "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-stone-500/10 text-stone-600 dark:text-stone-300",
];

const CHART_COLORS = ["#f97316", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#64748b"];
const WEEK_DAYS = ["Hënë", "Martë", "Mërkurë", "Enjte", "Premte", "Shtunë", "Diel"];

const emptyState = {
  summary: null,
  reports: null,
  charts: null,
  expiring: [],
  orders: [],
  shopping: [],
  ml: [],
  notifications: [],
  activity: [],
  mealPlans: [],
};

function Icon({ name, className = "h-5 w-5" }) {
  const icons = {
    box: "M4 4.5 10 2l6 2.5v7L10 18l-6-6.5v-7Zm6 3L5.9 5.8 10 4.1l4.1 1.7L10 7.5Zm-4.5.1v3.1L9.2 15V8.9L5.5 7.6Zm9 0-3.7 1.3V15l3.7-4.3V7.6Z",
    alert: "M10 2.5 18 16H2L10 2.5Zm0 4.5a.8.8 0 0 0-.8.85l.25 4.2a.55.55 0 0 0 1.1 0l.25-4.2A.8.8 0 0 0 10 7Zm0 6.9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
    recipe: "M4 3.5A7.7 7.7 0 0 1 9 5v11.3A7.4 7.4 0 0 0 4 15V3.5Zm7 1.5a7.7 7.7 0 0 1 5-1.5V15a7.4 7.4 0 0 0-5 1.3V5Z",
    calendar: "M6 2h1.5v2h5V2H14v2h1.5A2.5 2.5 0 0 1 18 6.5v8A2.5 2.5 0 0 1 15.5 17h-11A2.5 2.5 0 0 1 2 14.5v-8A2.5 2.5 0 0 1 4.5 4H6V2Zm10.5 6h-13v6.5c0 .55.45 1 1 1h11c.55 0 1-.45 1-1V8Z",
    cart: "M2 3h2.4l.5 2H18l-2 7H6.2L4.3 4H2V3Zm5 12a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
    order: "M4 3h8l4 4v10H4V3Zm7 1.7V8h3.3L11 4.7ZM7 10v1.5h6V10H7Zm0 3v1.5h6V13H7Z",
    bell: "M10 2a5 5 0 0 0-5 5v3.2L3.5 13v1h13v-1L15 10.2V7a5 5 0 0 0-5-5Zm-2 13.5a2 2 0 0 0 4 0H8Z",
    spark: "M11 2 9.2 7.2 4 9l5.2 1.8L11 16l1.8-5.2L18 9l-5.2-1.8L11 2Z",
    activity: "M3 10h3l2-5 4 10 2-5h3v1.7h-1.9L12 17 8 7l-1 4.7H3V10Z",
  };

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d={icons[name] || icons.box} />
    </svg>
  );
}

function unwrap(response, fallback) {
  const payload = response?.data ?? response;
  return payload?.data ?? payload ?? fallback;
}

function asArray(value) {
  const data = unwrap(value, []);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function formatDate(value) {
  if (!value) return "Sot";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace("T", " ");
  return date.toLocaleDateString("sq-AL", { day: "2-digit", month: "short" });
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace("T", " ");
  return date.toLocaleString("sq-AL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusText(endpoint, loading) {
  if (loading) return "Duke u ngarkuar";
  if (endpoint === "error") return "Nuk u ngarkua";
  return null;
}

function Panel({ title, subtitle, action, endpoint, loading, children, className = "" }) {
  const stateText = statusText(endpoint, loading);

  return (
    <section className={`sk-card min-w-0 max-w-full ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-[12px] text-stone-500 dark:text-stone-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {stateText ? <EmptyState title={stateText} /> : children}
    </section>
  );
}

function EmptyState({ title = "Nuk ka të dhëna për momentin.", compact = false }) {
  return (
    <div className={`rounded-xl border border-dashed border-stone-200 bg-stone-50 text-center text-stone-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-stone-500 ${compact ? "px-3 py-4 text-[12px]" : "px-4 py-8 text-[13px]"}`}>
      {title}
    </div>
  );
}

function KpiCard({ title, value, status, icon, accent = 0 }) {
  return (
    <div className="sk-card sk-card-hover min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-600">
            {title}
          </p>
          <p className="mt-3 font-display text-[26px] font-bold leading-none tracking-tight text-stone-900 dark:text-stone-100 sm:text-[30px]">
            {value ?? 0}
          </p>
        </div>
        <span className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${CARD_ACCENTS[accent % CARD_ACCENTS.length]}`}>
          <Icon name={icon} />
        </span>
      </div>
      <p className="mt-3 truncate text-[12px] text-stone-500 dark:text-stone-500">{status || "N/A"}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] shadow-xl dark:border-white/[0.08] dark:bg-[#1a1d27]">
      <p className="mb-1 font-semibold text-stone-700 dark:text-stone-300">{label}</p>
      {payload.map((item) => (
        <p key={`${item.name}-${item.dataKey}`} className="font-medium" style={{ color: item.color }}>
          {item.name}: {Number(item.value || 0).toFixed(0)}
        </p>
      ))}
    </div>
  );
}

function SmallBar({ label, value, max, color = "bg-orange-500" }) {
  const pct = max > 0 ? Math.min(100, Math.round((Number(value || 0) / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
        <span className="truncate font-medium text-stone-700 dark:text-stone-300">{label}</span>
        <span className="flex-shrink-0 font-semibold text-stone-500 dark:text-stone-500">{value ?? 0}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-white/[0.08]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(emptyState);
  const [endpointState, setEndpointState] = useState({});

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      setLoading(true);

      const requests = {
        summary: getDashboardSummary(),
        reports: api.get("/reports/summary"),
        charts: getDashboardCharts(),
        expiring: getExpiringItems(5),
        orders: getMyOrders(),
        shopping: getShoppingLists({ status: "active", limit: 3 }),
        ml: getMLRecommendations(),
        notifications: api.get("/notifications", { params: { limit: 5 } }),
        activity: getDashboardActivity(8),
        mealPlans: api.get("/meal-plans", {
          params: { sort: "week_start", order: "desc", limit: 3 },
        }),
      };

      const entries = Object.entries(requests);
      const settled = await Promise.allSettled(entries.map(([, promise]) => promise));
      if (!alive) return;

      const next = { ...emptyState };
      const nextState = {};

      entries.forEach(([key], index) => {
        const result = settled[index];
        if (result.status === "fulfilled") {
          nextState[key] = "ok";
          if (["expiring", "orders", "shopping", "ml", "notifications", "activity", "mealPlans"].includes(key)) {
            next[key] = asArray(result.value);
          } else {
            next[key] = unwrap(result.value, null);
          }
        } else {
          nextState[key] = "error";
        }
      });

      setData(next);
      setEndpointState(nextState);
      setLoading(false);
    }

    loadDashboard();
    return () => {
      alive = false;
    };
  }, []);

  const summary = data.summary || data.reports || {};
  const inventory = summary.inventory || {};
  const recipes = summary.recipes || {};
  const mealPlans = summary.meal_plans || {};
  const shopping = summary.shopping || {};
  const ordersSummary = summary.orders || {};
  const charts = data.charts || {};

  const role = user?.roles?.[0] || "User";
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Përdorues";
  const today = new Date().toLocaleDateString("sq-AL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const inventoryTrend = useMemo(() => {
    const expiry = charts.expiry_timeline || [];
    if (expiry.length > 0) {
      return expiry.map((item) => ({
        label: `${Number(item.days_left || 0)}d`,
        value: Number(item.count || 0),
      }));
    }

    return [
      { label: "Total", value: Number(inventory.total_items || 0) },
      { label: "Javë", value: Number(inventory.expiring_week || 0) },
      { label: "Afër", value: Number(inventory.expiring_soon || 0) },
      { label: "Skaduar", value: Number(inventory.expired || 0) },
    ];
  }, [charts.expiry_timeline, inventory]);

  const categoryData = useMemo(() => {
    return (charts.by_category || []).slice(0, 6).map((item) => ({
      name: item.category || "Pa kategori",
      value: Number(item.items || item.total_qty || 0),
    }));
  }, [charts.by_category]);

  const stockStatus = useMemo(() => {
    const total = Number(inventory.total_items || 0);
    const expired = Number(inventory.expired || 0);
    const expiring = Number(inventory.expiring_soon || 0);
    const low = Number(inventory.low_stock || 0);
    const stable = Math.max(total - expired - expiring - low, 0);

    return [
      { name: "Në rregull", value: stable },
      { name: "Stok i ulët", value: low },
      { name: "Pranë skadimit", value: expiring },
      { name: "Skaduar", value: expired },
    ].filter((item) => item.value > 0);
  }, [inventory]);

  const weeklyMealData = useMemo(() => {
    const plans = data.mealPlans || [];
    const latest = plans[0];
    const days = latest?.days || latest?.items || [];

    if (Array.isArray(days) && days.length > 0) {
      return WEEK_DAYS.map((day, index) => {
        const matches = days.filter((entry) => {
          const raw = String(entry.day_name || entry.day || entry.weekday || "").toLowerCase();
          return raw.includes(day.toLowerCase().slice(0, 3)) || Number(entry.day_of_week) === index + 1;
        });
        return { day, meals: matches.length };
      });
    }

    return WEEK_DAYS.map((day, index) => ({
      day,
      meals: Number(plans[index]?.total_meals || plans[index]?.meals_count || 0),
    }));
  }, [data.mealPlans]);

  const maxCategory = Math.max(...categoryData.map((item) => item.value), 1);
  const activeOrders = data.orders.filter((order) => !["delivered", "cancelled", "rejected"].includes(order.status));
  const outOfStock = Number(inventory.out_of_stock || 0);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 overflow-x-hidden sm:space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-950/[0.03] dark:border-white/[0.06] dark:bg-[#1a1d27] sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-orange-500">
            {role}
          </p>
          <h1 className="mt-1 break-words text-[22px] font-bold tracking-tight text-stone-950 dark:text-stone-50 sm:text-[30px]">
            Mirë se erdhe, {displayName}
          </h1>
          <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-500">
            Përmbledhja e kuzhinës tënde për sot
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-center text-[12px] font-medium text-stone-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-stone-400 sm:w-auto sm:text-left">
            {today}
          </div>
          <Link to="/reports" className="btn-primary w-full whitespace-nowrap sm:w-auto">
            Gjenero raport
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        <KpiCard
          title="Produkte në inventar"
          value={inventory.total_items ?? 0}
          status={`${inventory.total_quantity ?? 0} sasi totale`}
          icon="box"
          accent={0}
        />
        <KpiCard
          title="Produkte pranë skadimit"
          value={inventory.expiring_soon ?? 0}
          status={`${inventory.expiring_week ?? 0} brenda javës`}
          icon="alert"
          accent={1}
        />
        <KpiCard
          title="Receta"
          value={recipes.total ?? 0}
          status="Receta të disponueshme"
          icon="recipe"
          accent={2}
        />
        <KpiCard
          title="Plane vaktesh"
          value={mealPlans.active ?? data.mealPlans.length ?? 0}
          status="Plane aktive"
          icon="calendar"
          accent={3}
        />
        <KpiCard
          title="Lista blerjesh aktive"
          value={shopping.active_lists ?? data.shopping.length ?? 0}
          status={`${shopping.pending_items ?? 0} artikuj në pritje`}
          icon="cart"
          accent={4}
        />
        <KpiCard
          title="Porosi marketplace"
          value={ordersSummary.total ?? data.orders.length ?? 0}
          status={`${ordersSummary.pending ?? activeOrders.length ?? 0} aktive/në pritje`}
          icon="order"
          accent={5}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-5">
        <Panel
          title="Inventory usage trend"
          subtitle="Skadime dhe gjendje të inventarit"
          endpoint={endpointState.charts === "error" && endpointState.summary === "error" ? "error" : "ok"}
          loading={loading}
          className="xl:col-span-2"
        >
          {inventoryTrend.every((item) => item.value === 0) ? (
            <EmptyState title="Nuk ka të dhëna për trendin e inventarit." />
          ) : (
            <div className="h-[220px] min-w-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={inventoryTrend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Produkte"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="Stock status distribution"
          subtitle="Gjendja e produkteve"
          endpoint={endpointState.summary}
          loading={loading}
        >
          {stockStatus.length === 0 ? (
            <EmptyState title="Nuk ka status inventari." />
          ) : (
            <div className="h-[220px] min-w-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockStatus} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                    {stockStatus.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-5">
        <Panel
          title="Inventory by category"
          subtitle="Kategoritë kryesore në inventar"
          endpoint={endpointState.charts}
          loading={loading}
        >
          {categoryData.length === 0 ? (
            <EmptyState title="Nuk ka kategori për t'u shfaqur." />
          ) : (
            <div className="space-y-3">
              {categoryData.map((item, index) => (
                <SmallBar
                  key={item.name}
                  label={item.name}
                  value={item.value}
                  max={maxCategory}
                  color={["bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-stone-500"][index % 6]}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Weekly meal plan overview"
          subtitle="Vaktet e planifikuara këtë javë"
          endpoint={endpointState.mealPlans}
          loading={loading}
          className="xl:col-span-2"
          action={<Link to="/meal-plans" className="btn-secondary btn-sm">Meal Plans</Link>}
        >
          {weeklyMealData.every((item) => item.meals === 0) ? (
            <EmptyState title="Nuk ka plan vaktesh për këtë javë." />
          ) : (
            <div className="h-[220px] min-w-0 overflow-x-auto sm:h-[230px]">
              <div className="h-full min-w-[420px] sm:min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyMealData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="meals" name="Vakte" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-5">
        <Panel
          title="Inventory insights"
          subtitle="Produkte që kërkojnë vëmendje"
          endpoint={endpointState.expiring}
          loading={loading}
          action={<Link to="/inventory" className="btn-secondary btn-sm">Inventari</Link>}
        >
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-amber-500/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">Stok i ulët</p>
              <p className="mt-2 font-display text-2xl font-bold text-stone-900 dark:text-stone-100">{inventory.low_stock ?? 0}</p>
            </div>
            <div className="rounded-xl bg-red-500/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">Out of stock</p>
              <p className="mt-2 font-display text-2xl font-bold text-stone-900 dark:text-stone-100">{outOfStock}</p>
            </div>
          </div>

          {data.expiring.length === 0 ? (
            <EmptyState compact title="Nuk ka produkte pranë skadimit." />
          ) : (
            <div className="space-y-2">
              {data.expiring.slice(0, 5).map((item) => (
                <div key={item.id || `${item.ingredient_name}-${item.expiry_date}`} className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 px-3 py-2 dark:border-white/[0.06]">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-stone-800 dark:text-stone-200">
                      {item.ingredient_name || item.name || "Produkt"}
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-500">
                      {item.quantity ?? "N/A"} {item.unit || ""} · {formatDate(item.expiry_date)}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    {item.days_until_expiry ?? "N/A"}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="ML predictions"
          subtitle="Rekomandime nga modeli"
          endpoint={endpointState.ml}
          loading={loading}
          action={<Link to="/ml" className="btn-secondary btn-sm">ML</Link>}
        >
          {data.ml.length === 0 ? (
            <EmptyState title="Nuk ka rekomandime për momentin." />
          ) : (
            <div className="space-y-2">
              {data.ml.slice(0, 5).map((item, index) => {
                const percent = Math.round(Number(item.confidence ?? item.score ?? item.match_percentage ?? 0) * (Number(item.match_percentage) > 1 ? 1 : 100));
                return (
                  <div key={item.id || item.title || index} className="rounded-xl border border-stone-100 p-3 dark:border-white/[0.06]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-stone-800 dark:text-stone-200">
                          {item.product_name || item.item_name || item.title || item.name || "Rekomandim"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] text-stone-500 dark:text-stone-500">
                          {item.reason || item.description || "Bazuar në inventarin aktual."}
                        </p>
                      </div>
                      <span className="flex-shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {Number.isFinite(percent) ? `${percent}%` : "N/A"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Notifications"
          subtitle="Njoftimet e fundit"
          endpoint={endpointState.notifications}
          loading={loading}
          action={<Link to="/notifications" className="btn-secondary btn-sm">Njoftimet</Link>}
        >
          {data.notifications.length === 0 ? (
            <EmptyState title="Nuk ka njoftime për momentin." />
          ) : (
            <div className="space-y-2">
              {data.notifications.slice(0, 5).map((item) => (
                <div key={item.id || `${item.title}-${item.created_at}`} className={`rounded-xl border px-3 py-2 ${item.is_read ? "border-stone-100 bg-white dark:border-white/[0.06] dark:bg-transparent" : "border-orange-200 bg-orange-500/5 dark:border-orange-500/30 dark:bg-orange-500/10"}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2 w-2 rounded-full ${item.is_read ? "bg-stone-300 dark:bg-stone-700" : "bg-orange-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-stone-800 dark:text-stone-200">
                        {item.title || "Njoftim"}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-stone-500 dark:text-stone-500">
                        {item.message || "Nuk ka përshkrim."}
                      </p>
                      <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-600">
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-5">
        <Panel
          title="Activity feed"
          subtitle="Veprimet e fundit në sistem"
          endpoint={endpointState.activity}
          loading={loading}
          className="xl:col-span-2"
        >
          {data.activity.length === 0 ? (
            <EmptyState title="Nuk ka aktivitet të fundit." />
          ) : (
            <div className="overflow-x-auto">
              <table className="sk-table min-w-[620px]">
                <thead>
                  <tr>
                    <th>Veprimi</th>
                    <th>Entiteti</th>
                    <th>Përdoruesi</th>
                    <th>Koha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activity.slice(0, 8).map((item, index) => (
                    <tr key={item.id || `${item.type}-${item.created_at}-${index}`}>
                      <td>
                        <span className="badge badge-orange">{item.action || item.type || "INFO"}</span>
                      </td>
                      <td className="font-semibold text-stone-800 dark:text-stone-200">
                        {item.entity || item.label || item.source || "N/A"}
                      </td>
                      <td>{item.email || item.user || displayName}</td>
                      <td>{formatDateTime(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Meal plan"
          subtitle="Plani më i fundit"
          endpoint={endpointState.mealPlans}
          loading={loading}
          action={<Link to="/meal-plans" className="btn-secondary btn-sm">Hap</Link>}
        >
          {data.mealPlans.length === 0 ? (
            <EmptyState title="Nuk ka plane vaktesh aktive." />
          ) : (
            <div className="space-y-2">
              {data.mealPlans.slice(0, 3).map((plan) => (
                <div key={plan.id || plan.title} className="rounded-xl border border-stone-100 p-3 dark:border-white/[0.06]">
                  <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-200">
                    {plan.title || plan.name || "Plan vaktesh"}
                  </p>
                  <p className="mt-1 text-[12px] text-stone-500 dark:text-stone-500">
                    {formatDate(plan.week_start || plan.start_date || plan.created_at)} · {plan.status || "active"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}
