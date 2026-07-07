import { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";
import { Badge, Card, Modal, Spinner, Empty, SearchBar, FormGroup, Input, Select, Textarea, FormRow } from "../components/ui.jsx";
import { DIFF_LABELS, DIFF_COLORS } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.js";
import { normalizeApiList } from "../utils/apiData.js";
import { useAuth } from "../context/auth.context.jsx";
import { primaryRole } from "../config/roles.js";
import { UNIT_OPTIONS, getDefaultUnitForIngredient } from "../utils/units.js";

export default function Recipes() {
  const toast = useToast();
  const { user } = useAuth();
  const canCreateRecipe = primaryRole(user) !== "User";
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [diff, setDiff] = useState("");
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState({ title:"", description:"", instructions:"", prep_time_min:"", cook_time_min:"", servings:"", difficulty:"medium", is_public:1 });
  const [ingList, setIngList] = useState([{ ingredient_id:"", quantity:"", unit:"" }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (diff) p.set("difficulty", diff);
      const { data } = await api.get(`/recipes?${p}`);
      setItems(normalizeApiList(data, ["items", "recipes"])); setTotal(data.data?.total || 0);
    } finally { setLoading(false); }
  }, [search, diff]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/ingredients").then((response) => {
      const payload = response.data?.data ?? response.data;
      const ingredientList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.ingredients)
        ? payload.ingredients
        : Array.isArray(payload?.rows)
        ? payload.rows
        : Array.isArray(payload?.items)
        ? payload.items
        : [];
      setIngredients(ingredientList);
    }).catch(() => setIngredients([]));
  }, []);

  const loadDetail = async (id) => {
    const { data } = await api.get(`/recipes/${id}`);
    setDetail(data.data);
  };

  const addIngRow = () => setIngList([...ingList, { ingredient_id:"", quantity:"", unit:"" }]);
  const updIng = (i, field, val) => setIngList(ingList.map((row, idx) => {
    if (idx !== i) return row;
    if (field !== "ingredient_id") return { ...row, [field]: val };
    const ingredient = safeIngredients.find((item) => String(item.id) === String(val));
    return { ...row, ingredient_id: val, unit: getDefaultUnitForIngredient(ingredient) };
  }));
  const safeItems = Array.isArray(items) ? items : [];
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/recipes", { ...form, ingredients: ingList.filter((r) => r.ingredient_id) });
      toast.success("Receta u krijua"); setModal(false); load();
    } catch (e) { toast.danger("Gabim", e.response?.data?.message); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Kërko recetë..." style={{ flex:1 }} />
        <Select className="sk-input w-full sm:w-[140px]" value={diff} onChange={(e) => setDiff(e.target.value)}>
          <option value="">Të gjitha</option>
          <option value="easy">Lehtë</option>
          <option value="medium">Mesatare</option>
          <option value="hard">Vështirë</option>
        </Select>
        {canCreateRecipe && (
          <button className="btn-primary w-full sm:w-auto" onClick={() => setModal(true)}>+ Recetë e Re</button>
        )}
      </div>

      <p className="mb-4 text-[12px] text-stone-400">{total} receta të disponueshme</p>

      {loading ? <Spinner center /> : safeItems.length === 0 ? (
        <Empty icon="—" title="Nuk ka receta" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="sk-table">
              <thead><tr><th>Titulli</th><th>Vështirësia</th><th>Koha</th><th>Servime</th><th></th></tr></thead>
              <tbody>
                {safeItems.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold text-stone-800 dark:text-stone-200">{r.title}</td>
                    <td><Badge variant={DIFF_COLORS[r.difficulty]?.replace("badge-","") || "ash"}>{DIFF_LABELS[r.difficulty]}</Badge></td>
                    <td>{(r.prep_time_min||0)+(r.cook_time_min||0)} min</td>
                    <td>{r.servings || "–"}</td>
                    <td><button className="btn-secondary btn-xs" onClick={() => loadDetail(r.id)}>Shiko</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)} wide
          actions={<button className="btn-secondary" onClick={() => setDetail(null)}>Mbyll</button>}>
          <p className="mb-4 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">{detail.description}</p>
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge variant={DIFF_COLORS[detail.difficulty]?.replace("badge-","") || "ash"}>{DIFF_LABELS[detail.difficulty]}</Badge>
            <Badge variant="ash">Koha: {(detail.prep_time_min||0)+(detail.cook_time_min||0)} min</Badge>
            {detail.servings && <Badge variant="ash">Servime: {detail.servings}</Badge>}
          </div>
          {Array.isArray(detail.ingredients) && detail.ingredients.length > 0 && (
            <div className="mb-5 rounded-xl bg-stone-50 p-4 dark:bg-white/[0.03]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Ingredientët</p>
              {detail.ingredients.map((i) => (
                <div key={i.id} className="flex items-center gap-3 border-b border-stone-200/70 py-2 last:border-none dark:border-white/[0.05]">
                  <span className="flex-1 text-[13px] font-medium text-stone-700 dark:text-stone-300">{i.ingredient_name}</span>
                  <span className="text-[12px] font-semibold text-orange-500">{i.quantity} {i.unit}</span>
                  {i.is_optional ? <Badge variant="ash">opsional</Badge> : null}
                </div>
              ))}
            </div>
          )}
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Udhëzimet</p>
          <p className="whitespace-pre-line text-[13px] leading-7 text-stone-600 dark:text-stone-400">{detail.instructions}</p>
        </Modal>
      )}

      {/* Create Modal */}
      {modal && canCreateRecipe && (
        <Modal title="Recetë e Re" onClose={() => setModal(false)} wide
          actions={<><button className="btn-secondary" onClick={() => setModal(false)}>Anulo</button><button className="btn-primary" form="rec-form" type="submit">Krijo Recetën</button></>}>
          <form id="rec-form" onSubmit={submit}>
            <FormGroup label="Titulli"><Input value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} required /></FormGroup>
            <FormGroup label="Përshkrimi"><Input value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} /></FormGroup>
            <FormRow>
              <FormGroup label="Koha Prep (min)"><Input type="number" value={form.prep_time_min} onChange={(e) => setForm({...form,prep_time_min:e.target.value})} /></FormGroup>
              <FormGroup label="Koha Gatimit (min)"><Input type="number" value={form.cook_time_min} onChange={(e) => setForm({...form,cook_time_min:e.target.value})} /></FormGroup>
            </FormRow>
            <FormRow>
              <FormGroup label="Servime"><Input type="number" value={form.servings} onChange={(e) => setForm({...form,servings:e.target.value})} /></FormGroup>
              <FormGroup label="Vështirësia">
                <Select value={form.difficulty} onChange={(e) => setForm({...form,difficulty:e.target.value})}>
                  <option value="easy">Lehtë</option><option value="medium">Mesatare</option><option value="hard">Vështirë</option>
                </Select>
              </FormGroup>
            </FormRow>
            <FormGroup label="Udhëzimet"><Textarea value={form.instructions} onChange={(e) => setForm({...form,instructions:e.target.value})} required rows={5} /></FormGroup>
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Ingredientët</p>
              {ingList.map((row, i) => (
                <div key={i} className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_1fr_1fr]">
                  <Select value={row.ingredient_id} onChange={(e) => updIng(i,"ingredient_id",e.target.value)} style={{ flex:2 }}>
                    <option value="">Ingredienti...</option>
                    {safeIngredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                  </Select>
                  <Input type="number" step="0.01" placeholder="Sasia" value={row.quantity} onChange={(e) => updIng(i,"quantity",e.target.value)} style={{ flex:1 }} />
                  <Select value={row.unit || "piece"} onChange={(e) => updIng(i,"unit",e.target.value)} style={{ flex:1 }}>
                    {UNIT_OPTIONS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                  </Select>
                </div>
              ))}
              <button className="btn-secondary btn-sm mt-1" onClick={addIngRow} type="button">+ Shto Ingredientin</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
