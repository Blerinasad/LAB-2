import { useEffect, useMemo, useState } from "react";
import { Badge, Empty, Spinner } from "../components/ui.jsx";
import { getAuditLog } from "../services/Report.services.js";
import { normalizeApiList } from "../utils/apiData.js";

const PAGE_SIZE = 12;

function fmtDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace("T", " ");
  return date.toLocaleString("sq-AL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function Stat({ label, value, tone = "orange" }) {
  const colors = {
    orange: "text-orange-600 dark:text-orange-400",
    green: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    stone: "text-stone-700 dark:text-stone-300",
  };
  return (
    <div className="sk-card p-4">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">{label}</p>
      <p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p>
    </div>
  );
}

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getAuditLog({ limit: 100 })
      .then((res) => {
        if (alive) setActivities(normalizeApiList(res, ["items", "rows"]));
      })
      .catch(() => {
        if (alive) setActivities([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const safe = Array.isArray(activities) ? activities : [];
    const term = query.trim().toLowerCase();
    if (!term) return safe;
    return safe.filter((item) => {
      const text = [
        item.action,
        item.entity,
        item.entity_id,
        item.email,
        item.user_id,
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(term);
    });
  }, [activities, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = activities.filter((item) => todayKey(item.created_at) === today).length;
  const uniqueUsers = new Set(activities.map((item) => item.user_id || item.email).filter(Boolean)).size;
  const uniqueActions = new Set(activities.map((item) => item.action).filter(Boolean)).size;

  if (loading) return <Spinner center />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-stone-800 dark:text-stone-100">Aktivitetet e sistemit</p>
          <p className="text-[12.5px] text-stone-500 dark:text-stone-400">Audit log për veprimet kryesore në SmartKitchen.</p>
        </div>
        <div className="sk-search w-full sm:w-[320px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kërko veprim, entitet, email..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aktivitete" value={activities.length} />
        <Stat label="Sot" value={todayCount} tone="green" />
        <Stat label="Përdorues" value={uniqueUsers} tone="blue" />
        <Stat label="Lloje veprimesh" value={uniqueActions} tone="stone" />
      </div>

      <div className="sk-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-white/[0.06]">
          <div>
            <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-100">Lista e aktiviteteve</p>
            <p className="text-[11.5px] text-stone-400 dark:text-stone-500">{filtered.length} rezultate</p>
          </div>
          <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500">
            Faqe {currentPage}/{totalPages}
          </span>
        </div>

        {pageRows.length === 0 ? (
          <Empty title="Nuk ka aktivitete" />
        ) : (
          <div className="overflow-x-auto">
            <table className="sk-table">
              <thead>
                <tr>
                  <th>Veprimi</th>
                  <th>Entiteti</th>
                  <th>Përdoruesi</th>
                  <th>Koha</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((item) => (
                  <tr key={item.id}>
                    <td><Badge variant="orange">{item.action || "Aktivitet"}</Badge></td>
                    <td className="font-semibold text-stone-800 dark:text-stone-200">
                      {item.entity || "System"}{item.entity_id ? ` #${item.entity_id}` : ""}
                    </td>
                    <td>{item.email || item.user_id || "system"}</td>
                    <td>{fmtDateTime(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-4 py-3 dark:border-white/[0.06]">
            <button
              className="btn-secondary btn-xs"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Mbrapa
            </button>
            <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500">
              {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} nga {filtered.length}
            </span>
            <button
              className="btn-secondary btn-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Para
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
