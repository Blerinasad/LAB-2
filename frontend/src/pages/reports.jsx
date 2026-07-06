import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import api from "../services/api.js";
import { Card, Spinner, Empty, Badge, Progress } from "../components/ui.jsx";

const TABS = [
  { key:"summary",     label:"Përmbledhje" },
  { key:"waste",       label:"Humbja" },
  { key:"consumption", label:"Konsumimi" },
];

const DL_CSV = (path, name) => {
  api.get(path, { responseType:"blob" }).then(({ data }) => {
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
  });
};

const PIE_COLORS = ["#f97316","#f59e0b","#10b981","#3b82f6","#8b5cf6"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1a1d27] border border-stone-200 dark:border-white/[0.08] rounded-xl px-3 py-2 shadow-xl text-[12px]">
      <p className="font-semibold text-stone-700 dark:text-stone-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {Number(p.value).toFixed(2)}</p>
      ))}
    </div>
  );
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [waste, setWaste] = useState([]);
  const [consum, setConsum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    setLoading(true);
    const p = {};
    if (from) p.from_date = from;
    if (to) p.to_date   = to;
    Promise.all([
      api.get("/reports/summary", { params: p }),
      api.get("/reports/waste",   { params: p }),
      api.get("/reports/consumption", { params: p }),
    ]).then(([s,w,c]) => {
      setData(s.data.data);
      setWaste(w.data.data || []);
      setConsum(c.data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [from, to]);

  const inv = data?.inventory ?? {};
  const waste_ = data?.waste ?? {};
  const top = data?.top_ingredients ?? [];
  const weekly = (data?.weekly_waste ?? []).map((x) => ({ date: String(x.date).slice(5,10), kg: Number(x.kg || 0) }));
  const maxTop = top[0]?.total_used || 1;

  const REASON_MAP = { expired:"badge-red", spoiled:"badge-amber", overcooked:"badge-stone", other:"badge-stone" };

  return (
    <div>
      {/* Filter bar */}
      <div className="sk-card mb-5">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="sk-label">Nga data</label>
            <input type="date" className="sk-input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="sk-label">Deri më</label>
            <input type="date" className="sk-input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(from || to) && (
            <button className="btn-secondary btn-sm" onClick={() => { setFrom(""); setTo(""); }}>✕ Pastro filtrat</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 overflow-x-auto pb-1"><div className="flex gap-1 p-1 bg-stone-100 dark:bg-white/[0.06] rounded-xl w-max border border-stone-200 dark:border-white/[0.08]">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${tab===t.key ? "bg-white dark:bg-white/[0.1] text-stone-900 dark:text-stone-100 shadow-sm font-semibold" : "text-stone-500 hover:text-stone-800 dark:text-stone-500 dark:hover:text-stone-300"}`}>
            {t.label}
          </button>
        ))}
      </div></div>

      {loading ? <Spinner center /> : (
        <>
          {tab === "summary" && data && (
            <div>
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {[
                  { label:"Total Artikuj", value: inv.total_items??0, sub:"në inventar", color:"#f97316" },
                  { label:"Po Skadojnë",   value: inv.expiring_soon??0, sub:"brenda 3 ditëve", color:"#f59e0b" },
                  { label:"Humbja",        value: `${Number(waste_.total_kg??0).toFixed(1)}kg`, sub:`${waste_.events??0} ngjarje`, color:"#ef4444" },
                ].map((s) => (
                  <div key={s.label} className="sk-card" style={{ borderTop: `2px solid ${s.color}` }}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-600 mb-1">{s.label}</p>
                    <p className="font-display text-[30px] font-bold tracking-tight" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[12px] text-stone-400 dark:text-stone-600 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Top ingredients bar chart */}
                <Card title="Top 5 Ingredientë" sub="Sipas konsumimit total">
                  {top.length === 0 ? <Empty title="Nuk ka histori" /> : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={top.map((x) => ({ name: x.name.slice(0,10), v: Number(x.total_used).toFixed(1) }))} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                          <XAxis dataKey="name" tick={{ fontSize:11, fill:"#9ca3af" }} />
                          <YAxis tick={{ fontSize:10, fill:"#9ca3af" }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="v" name="Konsumimi" fill="#f97316" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      {top.map((i,idx) => (
                        <div key={i.name} className="mt-2">
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="font-medium text-stone-700 dark:text-stone-300">{i.name}</span>
                            <span className="text-orange-500 font-semibold">{Number(i.total_used).toFixed(1)}</span>
                          </div>
                          <Progress value={i.total_used} max={maxTop} color={PIE_COLORS[idx % PIE_COLORS.length]} />
                        </div>
                      ))}
                    </>
                  )}
                </Card>

                {/* Weekly waste line chart */}
                <Card title="Humbja Javore" sub="kg harxhuar / ditë">
                  {weekly.length === 0 ? <Empty title="Nuk ka të dhëna" /> : (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={weekly} margin={{ top:5, right:10, bottom:0, left:-20 }}>
                        <XAxis dataKey="date" tick={{ fontSize:11, fill:"#9ca3af" }} />
                        <YAxis tick={{ fontSize:10, fill:"#9ca3af" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="kg" name="Humbja (kg)" stroke="#f97316" strokeWidth={2} dot={{ fill:"#f97316", r:4 }} activeDot={{ r:6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>
            </div>
          )}

          {tab === "waste" && (
            <Card title="Historia e Humbjes"
              action={<button className="btn-secondary btn-sm" onClick={() => DL_CSV("/reports/waste?format=csv","waste_report.csv")}>↓ CSV</button>}>
              {waste.length === 0 ? <Empty title="Nuk ka humbje" /> : (
                <div className="overflow-x-auto"><table className="sk-table">
                  <thead><tr><th>Ingredienti</th><th>Sasia</th><th>Arsyeja</th><th>Data</th></tr></thead>
                  <tbody>
                    {waste.map((w) => (
                      <tr key={w.id}>
                        <td className="font-semibold text-stone-800 dark:text-stone-200">{w.ingredient_name}</td>
                        <td className="font-display text-orange-500 font-bold">{w.quantity_wasted} kg</td>
                        <td><Badge variant={REASON_MAP[w.reason]?.replace("badge-","") || "stone"}>{w.reason}</Badge></td>
                        <td className="text-stone-400 dark:text-stone-600">{w.wasted_at?.slice(0,10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </Card>
          )}

          {tab === "consumption" && (
            <Card title="Historia e Konsumimit"
              action={<button className="btn-secondary btn-sm" onClick={() => DL_CSV("/reports/consumption?format=csv","consumption_report.csv")}>↓ CSV</button>}>
              {consum.length === 0 ? <Empty title="Nuk ka histori" /> : (
                <div className="overflow-x-auto"><table className="sk-table">
                  <thead><tr><th>Ingredienti</th><th>Sasia</th><th>Data</th></tr></thead>
                  <tbody>
                    {consum.map((c) => (
                      <tr key={c.id}>
                        <td className="font-semibold text-stone-800 dark:text-stone-200">{c.ingredient_name}</td>
                        <td className="font-display text-orange-500 font-bold">{c.quantity_used}</td>
                        <td className="text-stone-400 dark:text-stone-600">{c.consumed_at?.slice(0,10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
