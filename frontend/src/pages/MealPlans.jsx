import { useState, useEffect } from "react";
import api from "../services/api.js";
import { Badge, Card, Modal, Spinner, Empty, FormGroup, Input, Select, FormRow, SearchBar } from "../components/ui.jsx";
import { DAYS_ALB, MEAL_LABELS, fmtDate } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.js";

const STATUS_COLOR = { draft:"ash", active:"sage", completed:"copper" };
const STATUS_LABEL = { draft:"Draft", active:"Aktiv", completed:"Kompletuar" };

export default function MealPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [dayModal, setDayModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ title:"", week_start:"", week_end:"", status:"draft" });
  const [dayForm, setDayForm] = useState({ recipe_id:"", day_of_week:"1", meal_type:"lunch", servings:"2" });
  const [filters, setFilters] = useState({ search:"", status:"", from_date:"", to_date:"", sort:"week_start", order:"desc" });

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
      const { data } = await api.get("/meal-plans", { params });
      setPlans(data.data || []);
    }
    finally { setLoading(false); }
  };

  const loadDetail = async (id) => {
    const { data } = await api.get(`/meal-plans/${id}`);
    setDetail(data.data);
  };

  useEffect(() => { load(); }, [filters]);
  useEffect(() => { api.get("/recipes?limit=100").then(({ data }) => setRecipes(data.data?.items || [])); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/meal-plans", form); toast.success("Plani u krijua"); setModal(false); load(); }
    catch (e) { toast.danger("Gabim", e.response?.data?.message); }
  };

  const addDay = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/meal-plans/${detail.id}/days`, dayForm);
      toast.success("Dita u shtua"); setDayModal(false); loadDetail(detail.id);
    } catch (e) { toast.danger("Gabim", e.response?.data?.message); }
  };

  const generateShopping = async (planId) => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/meal-plans/${planId}/generate-shopping`);
      if (data.data.shopping_list_id) {
        toast.success("Lista u gjenerua", `${data.data.missing_count} artikuj mungojnë. Hape te Lista Blerje.`);
        sessionStorage.setItem("sk_open_shopping_list", String(data.data.shopping_list_id));
        window.dispatchEvent(new CustomEvent("sk:navigate", { detail: "shopping" }));
      } else {
        toast.info("Nuk ka nevojë për blerje", "Inventari i mbulon të gjithë ingredientët e këtij plani.");
      }
    } catch (e) { toast.danger("Gabim", e.response?.data?.message); }
    finally { setGenerating(false); }
  };

  const updateStatus = async (plan, status) => {
    try {
      await api.put(`/meal-plans/${plan.id}`, { title: plan.title, status });
      toast.success("Statusi u përditësua", STATUS_LABEL[status]);
      await load();
      if (detail?.id === plan.id) await loadDetail(plan.id);
    } catch (e) { toast.danger("Gabim", e.response?.data?.message); }
  };

  const removeDay = async (dayId) => {
    if (!confirm("Hiqe këtë vakt nga plani?")) return;
    try {
      await api.delete(`/meal-plans/${detail.id}/days/${dayId}`);
      toast.warn("Vakti u hoq");
      await loadDetail(detail.id);
    } catch (e) { toast.danger("Gabim", e.response?.data?.message); }
  };

  const deletePlan = async (planId) => {
    if (!confirm("Fshi planin javor? Ky veprim nuk kthehet.")) return;
    try {
      await api.delete(`/meal-plans/${planId}`);
      toast.warn("Plani u fshi");
      if (detail?.id === planId) setDetail(null);
      await load();
    } catch (e) { toast.danger("Gabim", e.response?.data?.message); }
  };

  return (
    <div>
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_.8fr_.8fr_.8fr_.8fr_auto] xl:items-end">
          <FormGroup label="Kërko plan">
            <SearchBar value={filters.search} onChange={(v) => setFilters({...filters, search:v})} placeholder="Kërko sipas titullit..." />
          </FormGroup>
          <FormGroup label="Statusi">
            <Select value={filters.status} onChange={(e) => setFilters({...filters, status:e.target.value})}>
              <option value="">Të gjitha</option>
              <option value="draft">Draft</option>
              <option value="active">Aktiv</option>
              <option value="completed">Kompletuar</option>
            </Select>
          </FormGroup>
          <FormGroup label="Nga java">
            <Input type="date" value={filters.from_date} onChange={(e) => setFilters({...filters, from_date:e.target.value})} />
          </FormGroup>
          <FormGroup label="Deri">
            <Input type="date" value={filters.to_date} onChange={(e) => setFilters({...filters, to_date:e.target.value})} />
          </FormGroup>
          <FormGroup label="Rendit">
            <Select value={`${filters.sort}:${filters.order}`} onChange={(e) => { const [sort, order] = e.target.value.split(":"); setFilters({...filters, sort, order}); }}>
              <option value="week_start:desc">Java më e re</option>
              <option value="week_start:asc">Java më e vjetër</option>
              <option value="title:asc">Titulli A-Z</option>
              <option value="status:asc">Statusi</option>
            </Select>
          </FormGroup>
          <button className="btn-primary w-full xl:w-auto" onClick={() => setModal(true)}>+ Plan i Ri</button>
        </div>
      </Card>

      {loading ? <Spinner center /> : plans.length === 0 ? (
        <Empty icon="—" title="Nuk ka plane" sub="Krijo planin e parë javor!" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="sk-table">
              <thead><tr><th>Titulli</th><th>Java</th><th>Statusi</th><th></th></tr></thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold text-stone-800 dark:text-stone-200">{p.title}</td>
                    <td>{fmtDate(p.week_start)} - {fmtDate(p.week_end)}</td>
                    <td><Badge variant={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-secondary btn-xs" onClick={() => loadDetail(p.id)}>Shiko</button>
                        <button className="btn-primary btn-xs" onClick={() => generateShopping(p.id)} disabled={generating}>
                          {generating ? "..." : "Gjenero Blerjet"}
                        </button>
                        <button className="btn-danger btn-xs" onClick={() => deletePlan(p.id)}>Fshi</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create */}
      {modal && (
        <Modal title="Plan i Ri Javor" onClose={() => setModal(false)}
          actions={<><button className="btn-secondary" onClick={() => setModal(false)}>Anulo</button><button className="btn-primary" form="mp-form" type="submit">Krijo</button></>}>
          <form id="mp-form" onSubmit={submit}>
            <FormGroup label="Titulli"><Input value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} required /></FormGroup>
            <FormRow>
              <FormGroup label="Fillimi Javës"><Input type="date" value={form.week_start} onChange={(e) => setForm({...form,week_start:e.target.value})} required /></FormGroup>
              <FormGroup label="Fundi Javës"><Input type="date" value={form.week_end} onChange={(e) => setForm({...form,week_end:e.target.value})} required /></FormGroup>
            </FormRow>
            <FormGroup label="Statusi">
              <Select value={form.status} onChange={(e) => setForm({...form,status:e.target.value})}>
                <option value="draft">Draft</option><option value="active">Aktiv</option>
              </Select>
            </FormGroup>
          </form>
        </Modal>
      )}

      {/* Detail */}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)} wide
          actions={
            <div className="flex flex-wrap gap-2">
              {detail.status !== "active" && <button className="btn-secondary btn-sm" onClick={() => updateStatus(detail, "active")}>Aktivizo</button>}
              {detail.status !== "completed" && <button className="btn-secondary btn-sm" onClick={() => updateStatus(detail, "completed")}>Kompleto</button>}
              <button className="btn-secondary btn-sm" onClick={() => generateShopping(detail.id)} disabled={generating}>{generating ? "..." : "Gjenero Blerjet"}</button>
              <button className="btn-primary btn-sm" onClick={() => setDayModal(true)}>+ Shto Ditë</button>
              <button className="btn-secondary" onClick={() => setDetail(null)}>Mbyll</button>
            </div>
          }>
          <p className="mb-4 text-[11px] text-stone-400">
            {fmtDate(detail.week_start)} - {fmtDate(detail.week_end)} · <Badge variant={STATUS_COLOR[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
          </p>
          {detail.days?.length === 0 ? (
            <Empty icon="—" title="Nuk ka ditë" sub='Kliko "+ Shto Ditë" për të shtuar vaktet' />
          ) : (
            <div className="flex flex-col gap-2">
              {detail.days.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-white/[0.04]">
                  <span className="min-w-[80px] text-[10px] font-bold uppercase tracking-wide text-orange-500">{DAYS_ALB[(d.day_of_week||1)-1]}</span>
                  <span className="min-w-[60px] text-[10px] text-stone-400">{MEAL_LABELS[d.meal_type]}</span>
                  <span className="flex-1 text-[12px] font-medium text-stone-700 dark:text-stone-300">{d.recipe_title}</span>
                  <span className="text-[10px] text-stone-400">{d.servings}x</span>
                  <button className="btn-danger btn-xs" onClick={() => removeDay(d.id)}>Hiq</button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Add Day */}
      {dayModal && (
        <Modal title="Shto Ditë në Plan" onClose={() => setDayModal(false)}
          actions={<><button className="btn-secondary" onClick={() => setDayModal(false)}>Anulo</button><button className="btn-primary" form="day-form" type="submit">Shto</button></>}>
          <form id="day-form" onSubmit={addDay}>
            <FormGroup label="Receta">
              <Select value={dayForm.recipe_id} onChange={(e) => setDayForm({...dayForm,recipe_id:e.target.value})} required>
                <option value="">Zgjidh recetën...</option>
                {recipes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </Select>
            </FormGroup>
            <FormRow>
              <FormGroup label="Dita e Javës">
                <Select value={dayForm.day_of_week} onChange={(e) => setDayForm({...dayForm,day_of_week:e.target.value})}>
                  {DAYS_ALB.map((d, i) => <option key={i} value={i+1}>{d}</option>)}
                </Select>
              </FormGroup>
              <FormGroup label="Vakti">
                <Select value={dayForm.meal_type} onChange={(e) => setDayForm({...dayForm,meal_type:e.target.value})}>
                  {Object.entries(MEAL_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </FormGroup>
            </FormRow>
            <FormGroup label="Servime"><Input type="number" min="1" value={dayForm.servings} onChange={(e) => setDayForm({...dayForm,servings:e.target.value})} /></FormGroup>
          </form>
        </Modal>
      )}
    </div>
  );
}
