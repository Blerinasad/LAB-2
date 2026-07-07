import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import { Spinner, Empty, Modal, ConfirmModal, SearchBar, FormGroup, Input, Select, FormRow } from "../components/ui.jsx";
import { expiryColor, expiryLabel, fmtDate } from "../utils/helpers.js";
import { useToast } from "../hooks/useToast.js";
import { normalizeApiList } from "../utils/apiData.js";
import { UNIT_OPTIONS, getDefaultUnitForIngredient, normalizeUnit } from "../utils/units.js";

const LOCS = ["Frigorifer","Ngrirës","Qilar","Kuzhinë","Raft"];
const EMPTY = { ingredient_id:"", quantity:"", unit:"piece", purchase_date:"", expiry_date:"", location:"", notes:"" };
const PAGE_SIZE = 20;

export default function Inventory() {
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      p.set("page", String(page));
      p.set("limit", String(PAGE_SIZE));
      const { data } = await api.get(`/inventory?${p}`);
      setItems(normalizeApiList(data, ["items"]));
      setTotal(data.data?.total || 0);
    } finally { setLoading(false); }
  }, [search, page]);

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

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ingredient_id: item.ingredient_id, quantity: item.quantity,
      purchase_date: fmtDate(item.purchase_date), expiry_date: fmtDate(item.expiry_date),
      unit: normalizeUnit(item.unit), location: item.location || "", notes: item.notes || "" });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editItem ? await api.put(`/inventory/${editItem.id}`, form) : await api.post("/inventory", form);
      toast.success(editItem ? "Artikulli u përditësua!" : "Artikulli u shtua!");
      setModal(false); load();
    } catch (err) { toast.danger("Gabim", err.response?.data?.message || err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/inventory/${id}`).catch(() => {});
    toast.warn("Fshirë");
    if (page > 1 && safeItems.length === 1) setPage(page - 1);
    else load();
  };

  const safeItems = Array.isArray(items) ? items : [];
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];
  const expiringCount = safeItems.filter(i => i.days_until_expiry <= 3).length;
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / PAGE_SIZE));
  const handleIngredientChange = (ingredientId) => {
    const ingredient = safeIngredients.find((item) => String(item.id) === String(ingredientId));
    setForm({ ...form, ingredient_id: ingredientId, unit: getDefaultUnitForIngredient(ingredient) });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Kërko ingredient..." style={{ flex: 1 }} />
        <button className="btn-secondary mr-2" onClick={() => navigate("/photoscan")}>PhotoScan</button>
          <button className="btn-primary w-full sm:w-auto" onClick={openCreate}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
          Shto Artikull
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-2.5 mb-5">
        <span className="text-[13px] text-stone-500 dark:text-stone-500">{total} artikuj</span>
        {expiringCount > 0 && (
          <span className="badge badge-red">{expiringCount} po skadojnë</span>
        )}
      </div>

      {loading ? <Spinner center /> : safeItems.length === 0 ? (
        <Empty title="Inventari është bosh" sub='Kliko "Shto Artikull" për të filluar'
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button className="btn-secondary" onClick={() => navigate("/photoscan")}>PhotoScan</button>
              <button className="btn-primary" onClick={openCreate}>Shto Artikullin e Parë</button>
            </div>
          } />
      ) : (
        <>
          <div className="sk-card overflow-x-auto p-0">
            <table className="sk-table">
              <thead><tr><th>Ingredienti</th><th>Sasia</th><th>Vendndodhja</th><th>Skadon</th><th>Kategoria</th><th></th></tr></thead>
              <tbody>
                {safeItems.map((item) => {
                  const days = item.days_until_expiry;
                  const color = expiryColor(days);
                  return (
                    <tr key={item.id}>
                      <td className="font-semibold text-stone-800 dark:text-stone-200">{item.ingredient_name}</td>
                      <td className="font-display text-orange-500 font-bold">{item.quantity} {item.unit}</td>
                      <td className="text-stone-500 dark:text-stone-500">{item.location || "–"}</td>
                      <td><span className="text-[12px] font-bold" style={{ color }}>{expiryLabel(days)} · {fmtDate(item.expiry_date)}</span></td>
                      <td><span className="badge badge-stone">{item.category_name}</span></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn-ghost btn-xs" onClick={() => openEdit(item)}>Edito</button>
                          <button className="btn-danger btn-xs" onClick={() => setConfirmDelete({ id: item.id, name: item.ingredient_name })}>Fshi</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-stone-500 dark:text-stone-500">
              Faqja {page} nga {totalPages} · {safeItems.length} nga {total} artikuj
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Mbrapa</button>
              <button className="btn-secondary btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Para</button>
            </div>
          </div>
        </>
      )}

      {modal && (
        <Modal title={editItem ? "Modifiko Artikullin" : "Shto në Inventar"} onClose={() => setModal(false)}
          footer={<>
            <button className="btn-secondary" onClick={() => setModal(false)}>Anulo</button>
            <button className="btn-secondary mr-2" onClick={() => navigate("/photoscan")}>PhotoScan</button>
          <button className="btn-primary" form="inv-form" type="submit" disabled={saving}>
              {saving ? "Duke ruajtur..." : editItem ? "Ruaj Ndryshimet" : "Shto Artikullin"}
            </button>
          </>}>
          <form id="inv-form" onSubmit={submit}>
            <FormGroup label="Ingredienti">
              <Select value={form.ingredient_id} onChange={(e) => handleIngredientChange(e.target.value)} required disabled={!!editItem}>
                <option value="">Zgjidh ingredientin...</option>
                {safeIngredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </Select>
            </FormGroup>
            <FormRow>
              <FormGroup label="Sasia">
                <Input type="number" step="0.01" min="0.01" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} required />
              </FormGroup>
              <FormGroup label="Vendndodhja">
                <Select value={form.location} onChange={(e) => setForm({...form, location: e.target.value})}>
                  <option value="">Zgjidh...</option>
                  {LOCS.map((l) => <option key={l}>{l}</option>)}
                </Select>
              </FormGroup>
            </FormRow>
            <FormGroup label="Njësia">
              <Select value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})}>
                {UNIT_OPTIONS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </Select>
            </FormGroup>
            <FormRow>
              <FormGroup label="Data Blerjes">
                <Input type="date" value={form.purchase_date} onChange={(e) => setForm({...form, purchase_date: e.target.value})} required />
              </FormGroup>
              <FormGroup label="Data Skadimit">
                <Input type="date" value={form.expiry_date} onChange={(e) => setForm({...form, expiry_date: e.target.value})} required />
              </FormGroup>
            </FormRow>
            <FormGroup label="Shënime">
              <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="Shënime shtesë (opsionale)" />
            </FormGroup>
          </form>
        </Modal>
      )}
    {confirmDelete && (
      <ConfirmModal
        title="Fshi nga Inventari"
        message={`A je i sigurt që dëshiron të fshish "${confirmDelete.name}"? Ky veprim nuk mund të zhbëhet.`}
        confirmText="Fshi"
        onConfirm={async () => { await handleDelete(confirmDelete.id); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    )}
    </div>
  );
}
