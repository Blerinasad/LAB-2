import { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";
import { Spinner, Empty, Modal, ConfirmModal, SearchBar, FormGroup, Input, Select, FormRow } from "../components/ui.jsx";
import { expiryColor, expiryLabel, fmtDate } from "../utils/helpers.js";
import { useToast } from "../hooks/use-toast.js";
import PhotoScan from "./photo-scan.jsx";

const LOCS = ["Frigorifer","Ngrirës","Qilar","Kuzhinë","Raft"];
const EMPTY = { ingredient_id:"", quantity:"", purchase_date:"", expiry_date:"", location:"", notes:"" };

function ExpiryBar({ days }) {
  const color = days <= 2 ? "bg-red-500" : days <= 5 ? "bg-amber-400" : "bg-emerald-500";
  return <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />;
}

export default function Inventory() {
  const toast = useToast();
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
  const [photoScan, setPhotoScan] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      const { data } = await api.get(`/inventory?${p}`);
      setItems(data.data?.items || data.data || []);
      setTotal(data.data?.total || 0);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/ingredients").then(({ data }) => setIngredients(data.data || [])); }, []);

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ ingredient_id: item.ingredient_id, quantity: item.quantity,
      purchase_date: fmtDate(item.purchase_date), expiry_date: fmtDate(item.expiry_date),
      location: item.location || "", notes: item.notes || "" });
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
    load();
  };

  const expiringCount = items.filter(i => i.days_until_expiry <= 3).length;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Kërko ingredient..." style={{ flex: 1 }} />
        <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-white/[0.06] rounded-xl border border-stone-200 dark:border-white/[0.08]">
          {["grid","list"].map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12px] transition-all ${viewMode===m ? "bg-white dark:bg-white/[0.1] text-stone-900 dark:text-stone-100 shadow-sm" : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"}`}>
              {m === "grid" ? "⊞" : "☰"}
            </button>
          ))}
        </div>
        <button className="btn-secondary mr-2" onClick={() => setPhotoScan(true)}>PhotoScan</button>
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

      {loading ? <Spinner center /> : items.length === 0 ? (
        <Empty title="Inventari është bosh" sub='Kliko "Shto Artikull" për të filluar'
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button className="btn-secondary" onClick={() => setPhotoScan(true)}>PhotoScan</button>
              <button className="btn-primary" onClick={openCreate}>Shto Artikullin e Parë</button>
            </div>
          } />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 min-[430px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {items.map((item) => {
            const days = item.days_until_expiry;
            const color = expiryColor(days);
            return (
              <div key={item.id} className="sk-card sk-card-hover relative overflow-hidden group cursor-pointer" onClick={() => openEdit(item)}>
                <ExpiryBar days={days} />
                <div className="flex items-start justify-between mb-3 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color, borderColor: `${color}40`, background: `${color}15` }}>
                    {expiryLabel(days)}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all text-xs"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: item.id, name: item.ingredient_name }); }}>Fshi</button>
                </div>
                <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 mb-1 truncate">{item.ingredient_name}</p>
                <p className="font-display text-[24px] font-bold text-orange-500 leading-none">{item.quantity}<span className="text-[12px] text-stone-400 dark:text-stone-600 font-sans ml-1">{item.unit}</span></p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-stone-400 dark:text-stone-600">{item.category_name}</span>
                  <span className="text-[10px] text-stone-400 dark:text-stone-600">{item.location || "–"}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sk-card overflow-x-auto p-0">
          <table className="sk-table">
            <thead><tr><th>Ingredienti</th><th>Sasia</th><th>Vendndodhja</th><th>Skadon</th><th>Kategoria</th><th></th></tr></thead>
            <tbody>
              {items.map((item) => {
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
      )}

      {modal && (
        <Modal title={editItem ? "Modifiko Artikullin" : "Shto në Inventar"} onClose={() => setModal(false)}
          footer={<>
            <button className="btn-secondary" onClick={() => setModal(false)}>Anulo</button>
            <button className="btn-secondary mr-2" onClick={() => setPhotoScan(true)}>PhotoScan</button>
          <button className="btn-primary" form="inv-form" type="submit" disabled={saving}>
              {saving ? "Duke ruajtur..." : editItem ? "Ruaj Ndryshimet" : "Shto Artikullin"}
            </button>
          </>}>
          <form id="inv-form" onSubmit={submit}>
            <FormGroup label="Ingredienti">
              <Select value={form.ingredient_id} onChange={(e) => setForm({...form, ingredient_id: e.target.value})} required disabled={!!editItem}>
                <option value="">Zgjidh ingredientin...</option>
                {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
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
