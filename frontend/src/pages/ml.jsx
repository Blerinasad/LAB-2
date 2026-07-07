import { useEffect, useState } from "react";
import { Badge, Card, Empty, Progress, Spinner, Tabs } from "../components/ui.jsx";
import api from "../services/api.js";
import { normalizeApiList } from "../utils/apiData.js";

const RISK_COLOR = { low: "sage", medium: "gold", high: "danger" };
const PREF_COLOR = { Standard: "ash", Vegetarian: "sage", "Gluten-Free": "gold", Keto: "copper" };
const DIFF_LABELS = { easy: "Lehte", medium: "Mesatare", hard: "Veshtire" };
const CLUSTER_COLORS = ["#f97316", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];

const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
const offline = "ML Service offline. Nise nga ml-service me: .\\start.ps1";

function SectionIntro({ eyebrow, title, text, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 mb-1">{eyebrow}</p>
        <h3 className="font-display text-[20px] font-bold tracking-tight text-stone-900 dark:text-stone-100">{title}</h3>
        <p className="text-[12px] text-stone-500 dark:text-stone-500 mt-1 max-w-2xl leading-relaxed">{text}</p>
      </div>
      {action}
    </div>
  );
}

function Offline({ message = offline }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-[13px] text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-400">
      <p className="font-semibold">Lidhja me sherbimin ML deshtoi</p>
      <p className="mt-1 text-[12px] opacity-80">{message}</p>
    </div>
  );
}

function MetricRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-100 py-2 last:border-none dark:border-white/[0.05]">
      <span className="text-[12px] text-stone-500 dark:text-stone-500">{label}</span>
      <span className={`text-[12px] font-semibold ${highlight ? "text-orange-500" : "text-stone-700 dark:text-stone-300"}`}>{value}</span>
    </div>
  );
}

function BarMetric({ label, value, color = "#f97316" }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-medium capitalize text-stone-600 dark:text-stone-400">{label}</span>
        <span className="font-semibold" style={{ color }}>{pct(value)}</span>
      </div>
      <Progress value={Number(value || 0) * 100} color={color} />
    </div>
  );
}

function ConfMatrix({ matrix, labels = ["Low", "Med", "High"] }) {
  if (!Array.isArray(matrix) || !matrix.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-600">Confusion matrix</p>
      <div className="overflow-x-auto">
        <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-white/[0.08] min-w-[280px]">
          <table className="w-full border-collapse text-center text-[11px]">
            <thead className="bg-stone-50 dark:bg-white/[0.03]">
              <tr>
                <th className="p-2" />
                {labels.map((label) => <th key={label} className="p-2 font-semibold text-stone-400">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={labels[i]}>
                  <th className="border-t border-stone-100 p-2 font-semibold text-stone-400 dark:border-white/[0.05]">{labels[i]}</th>
                  {(Array.isArray(row) ? row : []).map((cell, j) => (
                  <td key={`${i}-${j}`} className={`border-l border-t border-stone-100 p-2 font-semibold dark:border-white/[0.05] ${i === j ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" : "text-stone-500"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/ml/recommendations/my")
      .then(({ data }) => setRecs(normalizeApiList(data, ["recommendations", "items"])))
      .catch(() => setError(offline))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center />;
  if (error) return <Offline message={error} />;

  return (
    <>
      <SectionIntro eyebrow="Content-based filtering" title="Receta te rekomanduara" text="Sugjerime te renditura sipas perputhjes me ingredientet qe ke aktualisht ne inventar." />
      {!recs.length ? <Empty title="Nuk ka rekomandime" sub="Shto ingrediente ne inventar dhe provo serish." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recs.slice(0, 9).map((recipe, index) => (
            <div key={recipe.recipe_id || index} className="sk-card sk-card-hover relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sugjerimi #{index + 1}</p>
                  <h4 className="mt-1.5 text-[14px] font-semibold leading-snug text-stone-900 dark:text-stone-100">{recipe.title}</h4>
                </div>
                <span className="font-display text-[22px] font-bold leading-none text-orange-500">{pct(recipe.score)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.difficulty && <Badge variant="ash">{DIFF_LABELS[recipe.difficulty] || recipe.difficulty}</Badge>}
                <Badge variant="sage">{recipe.match_percentage}% match</Badge>
                <Badge variant="gold">{Number(recipe.prep_time || 0) + Number(recipe.cook_time || 0)} min</Badge>
              </div>
              <div className="mt-4">
                <Progress value={recipe.match_percentage} color="#10b981" />
                <p className="mt-2 text-[11px] leading-relaxed text-stone-400 dark:text-stone-600">
                  {recipe.missing_ingredients?.length ? `Mungojne: ${recipe.missing_ingredients.slice(0, 4).join(", ")}${recipe.missing_ingredients.length > 4 ? ` +${recipe.missing_ingredients.length - 4}` : ""}` : "I ke te gjithe ingredientet kryesore."}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ClassifiersCompare() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (retrain = false) => {
    setLoading(true);
    setError("");
    api.get(`/ml/classifiers/compare${retrain ? "?retrain=true" : ""}`)
      .then(({ data: response }) => setData(response.data || response))
      .catch(() => setError(offline))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  if (loading) return <Spinner center />;
  if (error) return <Offline message={error} />;
  if (!data?.models) return <Empty title="Nuk ka te dhena" />;

  return (
    <>
      <SectionIntro
        eyebrow="Model benchmarking"
        title="Krahasimi i klasifikuesve"
        text="Matje performance per Logistic Regression, KNN, Random Forest dhe Neural Network."
        action={<button className="btn-secondary btn-sm" onClick={() => load(true)}>Ritrajno modelet</button>}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {Object.entries(data.models).map(([name, model]) => {
          const best = name === data.best_model;
          return (
            <div key={name} className={`sk-card ${best ? "!border-orange-400 dark:!border-orange-500/60" : ""}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="font-display text-[15px] font-bold text-stone-900 dark:text-stone-100">{name}</h4>
                {best && <Badge variant="copper">Modeli me i mire</Badge>}
              </div>
              <MetricRow label="Accuracy" value={pct(model.accuracy)} />
              <MetricRow label="Precision" value={pct(model.precision)} />
              <MetricRow label="Recall" value={pct(model.recall)} />
              <MetricRow label="F1 score" value={pct(model.f1_score)} highlight />
              <MetricRow label="Cross-val F1" value={pct(model.cross_val_f1)} />
              <ConfMatrix matrix={model.confusion_matrix} />
              {model.best_params && <p className="mt-3 break-all rounded-lg bg-stone-50 p-2 text-[10px] leading-relaxed text-stone-400 dark:bg-white/[0.03] dark:text-stone-600">{JSON.stringify(model.best_params)}</p>}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-stone-400 dark:text-stone-600">Dataset: {data.dataset_size || "i ruajtur"} rreshta · Features: {data.features?.join(", ")}</p>
    </>
  );
}

function Clustering() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [k, setK] = useState(3);

  const load = (clusters = k) => {
    setLoading(true);
    setError("");
    api.get(`/ml/clustering/my?n_clusters=${clusters}`)
      .then(({ data: response }) => setData(response.data || response))
      .catch(() => setError(offline))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  if (loading) return <Spinner center />;
  if (error) return <Offline message={error} />;
  if (!data?.clusters) return <Empty title="Nuk ka te dhena" />;

  return (
    <>
      <SectionIntro
        eyebrow="KMeans clustering"
        title="Grupet e sjelljes"
        text="Ingredientet grupohen sipas konsumimit, frekuences dhe humbjes per te dalluar modelet kryesore."
        action={<div className="flex items-center gap-1.5">{[2, 3, 4].map((n) => <button key={n} className={`btn-sm ${k === n ? "btn-primary" : "btn-secondary"}`} onClick={() => { setK(n); load(n); }}>{n} grupe</button>)}</div>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(Array.isArray(data.clusters) ? data.clusters : []).map((cluster) => {
          const color = CLUSTER_COLORS[cluster.cluster] || "#f97316";
          return (
            <div key={cluster.cluster} className="sk-card relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-display text-[16px] font-bold text-stone-900 dark:text-stone-100">Grupi {cluster.cluster + 1}</h4>
                <Badge variant="ash">{cluster.size} ingrediente</Badge>
              </div>
              <p className="mt-1 text-[12px] font-semibold" style={{ color }}>{cluster.label}</p>
              <div className="mt-4">
                <MetricRow label="Mesatarja e konsumimit" value={Number(cluster.avg_consumed || 0).toFixed(2)} />
                <MetricRow label="Mesatarja e humbjes" value={Number(cluster.avg_waste || 0).toFixed(2)} />
                <MetricRow label="Raporti humbje / konsum" value={pct(cluster.waste_ratio)} highlight={cluster.waste_ratio > 0.2} />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(Array.isArray(cluster.ingredients) ? cluster.ingredients : []).slice(0, 6).map((ingredient) => <span key={ingredient} className="rounded-md bg-stone-100 px-2 py-1 text-[10px] text-stone-500 dark:bg-white/[0.05] dark:text-stone-500">{ingredient}</span>)}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-stone-400 dark:text-stone-600">Inertia: {data.inertia} · Total ingrediente: {data.total_ingredients} · KMeans (n={data.n_clusters})</p>
    </>
  );
}

function Preferences() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/ml/preferences/my")
      .then(({ data: response }) => setData(response.data || response))
      .catch(() => setError(offline))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center />;
  if (error) return <Offline message={error} />;
  if (!data) return <Empty title="Nuk ka te dhena" />;

  const ratios = data.profile_ratios || {};
  return (
    <>
      <SectionIntro eyebrow="Random forest classifier" title="Profili ushqimor" text="Klasifikimi llogaritet nga historia e konsumimit dhe raportet e kategorive ushqimore." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
        <Card title="Raportet e konsumimit" sub="Shperndarja e profilit sipas kategorive">
          {Object.entries(ratios).map(([key, value]) => <BarMetric key={key} label={key.replace("_ratio", "").replace("_", " ")} value={value} />)}
        </Card>
        <div className="sk-card flex flex-col justify-between bg-gradient-to-br from-orange-500 to-amber-500 !border-transparent text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Klasifikimi i profilit</p>
            <h4 className="mt-3 font-display text-[32px] font-bold tracking-tight">{data.predicted_preference}</h4>
            <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-white/80">Modeli identifikon preferencen dominante nga zakonet e regjistruara te konsumimit.</p>
          </div>
          <div className="mt-8">
            <div className="mb-2 flex justify-between text-[12px] font-semibold"><span>Besueshmeria</span><span>{pct(data.confidence_score)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: pct(data.confidence_score) }} /></div>
            <div className="mt-4"><Badge variant={PREF_COLOR[data.predicted_preference] || "ash"}>{data.predicted_preference}</Badge></div>
          </div>
        </div>
      </div>
    </>
  );
}

function RiskPredictor() {
  const [form, setForm] = useState({ category_id: 1, shelf_life_days: 7, quantity: 1, days_until_expiry: 5 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const predict = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.post("/ml/classify/risk", Object.fromEntries(Object.entries(form).map(([key, value]) => [key, Number(value)])));
      setResult(data.data || data);
    } catch {
      setError(offline);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    ["Kategoria ID (1-6)", "category_id", 1, 6, 1],
    ["Jetegjatesia (dite)", "shelf_life_days", 1, 1000, 1],
    ["Sasia (kg / l / cope)", "quantity", 0.01, undefined, 0.01],
    ["Dite deri ne skadim", "days_until_expiry", -30, 365, 1],
  ];

  return (
    <>
      <SectionIntro eyebrow="Single item prediction" title="Parashiko rrezikun e humbjes" text="Testo nje artikull inventari dhe shiko probabilitetin per nivel te ulet, mesatar ose te larte rreziku." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.9fr)]">
        <Card title="Te dhenat e artikullit" sub="Ploteso parametrat qe analizohen nga modeli">
          <form onSubmit={predict}>
            <div className="grid gap-x-3 sm:grid-cols-2">
              {fields.map(([label, field, min, max, step]) => (
                <label key={field} className="mb-4 block">
                  <span className="sk-label">{label}</span>
                  <input className="sk-input" type="number" value={form[field]} min={min} max={max} step={step} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required />
                </label>
              ))}
            </div>
            <button className="btn-primary w-full sm:w-auto" type="submit" disabled={loading}>{loading ? "Duke analizuar..." : "Parashiko rrezikun"}</button>
          </form>
          {error && <div className="mt-4"><Offline message={error} /></div>}
        </Card>
        <Card title="Rezultati i analizes" sub="Probabilitetet e llogaritura nga klasifikuesi me i mire">
          {!result ? <Empty title="Gati per analize" sub="Ploteso te dhenat dhe kliko Parashiko rrezikun." /> : (
            <>
              <div className="mb-5 flex items-center justify-between rounded-xl bg-stone-50 p-4 dark:bg-white/[0.03]">
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Risk level</p><p className="mt-1 font-display text-[24px] font-bold capitalize text-stone-900 dark:text-stone-100">{result.risk_level}</p></div>
                <Badge variant={RISK_COLOR[result.risk_level] || "ash"}>{result.risk_level?.toUpperCase()}</Badge>
              </div>
              {Object.entries(result.probabilities || {}).filter(([, value]) => value !== null).map(([key, value]) => <BarMetric key={key} label={key} value={value} color={key === "high" ? "#ef4444" : key === "medium" ? "#f59e0b" : "#10b981"} />)}
            </>
          )}
        </Card>
      </div>
    </>
  );
}

export default function ML() {
  const [tab, setTab] = useState("recommendations");
  const tabs = [
    { key: "recommendations", label: "Rekomandime", icon: "01" },
    { key: "classifiers", label: "Klasifikuesit", icon: "02" },
    { key: "clustering", label: "Clustering", icon: "03" },
    { key: "preferences", label: "Preferencat", icon: "04" },
    { key: "risk", label: "Risk predictor", icon: "05" },
  ];
  const sections = { recommendations: <Recommendations />, classifiers: <ClassifiersCompare />, clustering: <Clustering />, preferences: <Preferences />, risk: <RiskPredictor /> };

  return (
    <div>
      <div className="relative mb-5 overflow-hidden rounded-2xl bg-[#161922] px-5 py-5 text-white shadow-sm sm:px-6 sm:py-6">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-20 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="copper">AI workspace</Badge>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 5 module ML</span>
          </div>
          <h2 className="mt-4 font-display text-[26px] font-bold tracking-tight sm:text-[30px]">Machine Learning Center</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-stone-400">Analizo inventarin, krahaso modelet dhe parashiko rrezikun e humbjes nga nje panel i vetem inteligjent.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-stone-300">
            {["4 klasifikues", "KMeans clustering", "Recipe matching", "Risk analytics"].map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">{item}</span>)}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto pb-1"><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
      <div className="min-h-[320px]">{sections[tab]}</div>
    </div>
  );
}
