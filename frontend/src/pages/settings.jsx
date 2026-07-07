import { useState, useEffect } from "react";
import api from "../services/api.js";
import { Spinner, Empty, Input } from "../components/ui.jsx";
import { useToast } from "../hooks/useToast.js";

export default function Settings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/settings");
      setRows(data.data || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (key) => {
    const value = edits[key];
    if (value === undefined) return;
    setSaving(s => ({ ...s, [key]:true }));
    try {
      await api.put(`/settings/${key}`, { value });
      toast.success("Ruajtur", key);
      setEdits(e => { const n = { ...e }; delete n[key]; return n; });
      setRows(rs => rs.map(r => r.setting_key === key || r.key === key ? { ...r, value } : r));
    } catch (e) { toast.danger("Gabim", e.response?.data?.message || "Nuk u ruajt"); }
    finally { setSaving(s => ({ ...s, [key]:false })); }
  };

  if (loading) return <Spinner center />;
  if (!rows.length) return <Empty title="Nuk ka cilësime" sub="Sistemi nuk ka cilësime të konfiguruara." />;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[15px] font-semibold text-stone-800 dark:text-stone-200">Cilësimet e Sistemit</p>
        <p className="text-[12.5px] text-stone-500 dark:text-stone-400">Vlerat globale që ndikojnë sjelljen e aplikacionit.</p>
      </div>

      <div className="sk-card p-0 overflow-hidden divide-y divide-stone-100 dark:divide-white/[0.05]">
        {rows.map(r => {
          const key = r.setting_key || r.key;
          const current = edits[key] ?? r.value;
          const dirty = edits[key] !== undefined && edits[key] !== r.value;
          return (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
              <div className="min-w-0 sm:w-64">
                <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-200">{key}</p>
                {r.description && <p className="text-[11.5px] text-stone-500 dark:text-stone-400">{r.description}</p>}
              </div>
              <div className="flex-1">
                <Input value={current} onChange={e => setEdits(x => ({ ...x, [key]:e.target.value }))} />
              </div>
              <button className="btn-primary btn-sm shrink-0" disabled={!dirty || saving[key]} onClick={() => save(key)}>
                {saving[key] ? "…" : "Ruaj"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
