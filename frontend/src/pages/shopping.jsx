import { useEffect, useState, useMemo } from "react";
import api from "../services/api.js";
import { Spinner, Empty, Modal, Badge, FormGroup, Input, Select } from "../components/ui.jsx";
import { fmtDate } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.js";
import { normalizeApiList } from "../utils/apiData.js";
import { UNIT_OPTIONS, getDefaultUnitForIngredient } from "../utils/units.js";

const STATUS_LABEL = { active:"Aktive", completed:"Kompletuar", archived:"Arkivuar" };
const STATUS_BADGE = { active:"green", completed:"blue", archived:"stone" };

export default function Shopping() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [ingredients, setIngredients] = useState([]);

  const [listModal, setListModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [title, setTitle] = useState("");
  const [itemForm, setItemForm] = useState({ ingredient_id:"", quantity_needed:"", unit:"piece" });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/shopping-lists");
      const next = normalizeApiList(data, ["lists", "shoppingLists"]);
      setLists(next);
      if (selected?.id && !next.some(l => l.id === selected.id)) { setSelected(null); setDetail(null); }
    } catch (e) { toast.danger("Gabim", e.response?.data?.message || "Listat nuk u lexuan"); }
    finally { setLoading(false); }
  };

  const loadDetail = async (id) => {
    try { const { data } = await api.get(`/shopping-lists/${id}`); setDetail(data.data); setSelected(data.data); }
    catch { toast.danger("Gabim", "Lista nuk u hap"); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { api.get("/ingredients").then(({data}) => setIngredients(normalizeApiList(data, ["ingredients"]))).catch(() => setIngredients([])); }, []);

  const createList = async () => {
    const t = title.trim();
    if (t.length < 3) { toast.warn("Titull i shkurtër", "Së paku 3 karaktere."); return; }
    try {
      await api.post("/shopping-lists", { title:t });
      toast.success("Lista u krijua", t);
      setListModal(false); setTitle("");
      load();
    } catch (e) { toast.danger("Gabim", e.response?.data?.message || "Nuk u krijua"); }
  };

  const addItem = async () => {
    if (!detail) return;
    if (!itemForm.ingredient_id || !itemForm.quantity_needed) { toast.warn("Mungon", "Zgjidh ingredientin dhe sasinë"); return; }
    try {
      await api.post(`/shopping-lists/${detail.id}/items`, {
        ingredient_id: itemForm.ingredient_id,
        quantity_needed: Number(itemForm.quantity_needed),
        unit: itemForm.unit || "piece",
      });
      toast.success("U shtua", "Artikulli u shtua në listë");
      setItemModal(false); setItemForm({ ingredient_id:"", quantity_needed:"", unit:"piece" });
      loadDetail(detail.id);
    } catch (e) { toast.danger("Gabim", e.response?.data?.message || "Nuk u shtua"); }
  };

  const togglePurchased = async (itemId) => {
    try { await api.patch(`/shopping-lists/${detail.id}/items/${itemId}/purchase`); loadDetail(detail.id); }
    catch { toast.danger("Gabim", "Nuk u përditësua"); }
  };

  const deleteItem = async (itemId) => {
    try { await api.delete(`/shopping-lists/${detail.id}/items/${itemId}`); loadDetail(detail.id); }
    catch { toast.danger("Gabim", "Nuk u fshi"); }
  };

  const setStatus = async (id, status) => {
    try { await api.patch(`/shopping-lists/${id}/status`, { status }); toast.success("U përditësua", STATUS_LABEL[status]); load(); if (detail?.id===id) loadDetail(id); }
    catch { toast.danger("Gabim", "Nuk u përditësua"); }
  };

  const deleteList = async (id) => {
    try { await api.delete(`/shopping-lists/${id}`); toast.warn("U fshi", "Lista u fshi"); setDetail(null); setSelected(null); load(); }
    catch { toast.danger("Gabim", "Nuk u fshi"); }
  };

  const safeLists = Array.isArray(lists) ? lists : [];
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  const safeDetailItems = Array.isArray(detail?.items) ? detail.items : [];
  const activeCount = useMemo(() => safeLists.filter(l => l.status === "active").length, [safeLists]);

  if (loading) return <Spinner center />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[15px] font-semibold text-stone-800 dark:text-stone-200">Listat e Blerjes</p>
          <p className="text-[12.5px] text-stone-500 dark:text-stone-400">{activeCount} aktive · {safeLists.length} gjithsej. Për të porositur, shko te Marketplace.</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setListModal(true)}>Listë e re</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista e listave */}
        <div className="lg:col-span-1 sk-card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 dark:border-white/[0.06]">
            <p className="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Listat</p>
          </div>
          {!safeLists.length ? (
            <div className="px-4 py-6 text-center text-[12.5px] text-stone-400">Ende s'ke lista.</div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-white/[0.05]">
              {safeLists.map(l => (
                <button key={l.id} onClick={() => loadDetail(l.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${detail?.id===l.id ? "bg-orange-50 dark:bg-orange-950/30" : "hover:bg-stone-50 dark:hover:bg-white/[0.03]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 truncate">{l.title}</span>
                    <Badge variant={STATUS_BADGE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{fmtDate(l.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detajet e listës */}
        <div className="lg:col-span-2 sk-card p-0 overflow-hidden">
          {!detail ? (
            <div className="py-16"><Empty title="Zgjidh një listë" sub="Kliko një listë majtas për të parë artikujt." /></div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-stone-100 dark:border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-stone-800 dark:text-stone-200 truncate">{detail.title}</p>
                  <p className="text-[11.5px] text-stone-500 dark:text-stone-400">{safeDetailItems.length} artikuj</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="btn-secondary btn-xs" onClick={() => setItemModal(true)}>Shto artikull</button>
                  {detail.status === "active" && <button className="btn-ghost btn-xs" onClick={() => setStatus(detail.id,"completed")}>Kompleto</button>}
                  <button className="btn-danger btn-xs" onClick={() => deleteList(detail.id)}>Fshi listën</button>
                </div>
              </div>

              {!safeDetailItems.length ? (
                <div className="px-4 py-10 text-center text-[12.5px] text-stone-400">Lista është bosh. Shto artikuj.</div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-white/[0.05]">
                  {safeDetailItems.map(it => (
                    <div key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                      <button onClick={() => togglePurchased(it.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${it.is_purchased ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 dark:border-white/20"}`}>
                        {it.is_purchased ? "✓" : ""}
                      </button>
                      <span className={`flex-1 text-[13px] ${it.is_purchased ? "line-through text-stone-400" : "text-stone-800 dark:text-stone-200"}`}>
                        {it.ingredient_name || it.name}
                      </span>
                      <span className="text-[12px] text-stone-500 dark:text-stone-400">{it.quantity_needed} {it.unit}</span>
                      <button className="btn-ghost btn-xs" onClick={() => deleteItem(it.id)}>Hiq</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {listModal && (
        <Modal title="Listë e re" onClose={() => setListModal(false)}
          actions={<>
            <button className="btn-ghost btn-sm" onClick={() => setListModal(false)}>Anulo</button>
            <button className="btn-primary btn-sm" onClick={createList}>Krijo</button>
          </>}>
          <FormGroup label="Titulli i listës">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="p.sh. Blerjet e javës" autoFocus />
          </FormGroup>
        </Modal>
      )}

      {itemModal && (
        <Modal title="Shto artikull" onClose={() => setItemModal(false)}
          actions={<>
            <button className="btn-ghost btn-sm" onClick={() => setItemModal(false)}>Anulo</button>
            <button className="btn-primary btn-sm" onClick={addItem}>Shto</button>
          </>}>
          <FormGroup label="Ingredienti">
            <Select value={itemForm.ingredient_id} onChange={e => {
              const ing = safeIngredients.find(i => String(i.id) === e.target.value);
              setItemForm({ ...itemForm, ingredient_id:e.target.value, unit: getDefaultUnitForIngredient(ing) });
            }}>
              <option value="">Zgjidh…</option>
              {safeIngredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Sasia">
            <Input type="number" min="0" step="0.1" value={itemForm.quantity_needed}
              onChange={e => setItemForm({ ...itemForm, quantity_needed:e.target.value })} />
          </FormGroup>
          <FormGroup label="Njësia">
            <Select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit:e.target.value })}>
              {UNIT_OPTIONS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
            </Select>
          </FormGroup>
        </Modal>
      )}
    </div>
  );
}
