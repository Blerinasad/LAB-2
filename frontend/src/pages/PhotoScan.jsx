/**
 * PhotoScan — Ngarko foto → Backend AI identifikon produktin → Shto në inventar
 * Frontend NUK e thërret kurrë OpenAI direkt. Rrjedha është:
 * Frontend → POST /api/ml/detect-food-image (backend) → OpenAI / mode demo
 */
import { useRef, useState } from "react";
import api from "../services/api.js";
import { useToast } from "../hooks/useToast.js";
import { normalizeApiList } from "../utils/apiData.js";
import { getDefaultUnitForIngredient, normalizeUnit } from "../utils/units.js";

async function identify(file) {
  const form = new FormData();
  form.append("image", file);
  const { data } = await api.post("/ml/detect-food-image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}

export default function PhotoScan({ onClose, onAdded }) {
  const toast = useToast();
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [ingredients, setIngredients] = useState([]);

  const handleFile = (file) => {
    if (!file?.type.startsWith("image/")) return toast.warn("Zgjidh imazh");
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setImgFile(file);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const scan = async () => {
    if (!imgFile) return;
    setScanning(true); setResult(null); setError(null);
    try {
      const product = await identify(imgFile);
      if (product.error) { setError(product.error); return; }
      setResult(product);
      setEditedName(product.detected_product || "");
      if (!ingredients.length) {
        const { data } = await api.get("/ingredients?limit=200").catch(() => ({ data:{ data:{ items:[] } } }));
        setIngredients(normalizeApiList(data, ["items", "ingredients"]));
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Identifikimi dështoi. Provo sërish.");
    } finally { setScanning(false); }
  };

  const addToInventory = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const name = (editedName || result.detected_product || "").toLowerCase().trim();
      const match = ingredients.find(i =>
        i.name?.toLowerCase().includes(name) || name.includes(i.name?.toLowerCase())
      );
      if (!match) {
        toast.warn("Ingredient nuk u gjet", `"${editedName}" nuk ekziston në sistem. Korrigjo emrin ose shto manualisht te Inventari.`);
        return;
      }
      const expiry = result.suggested_expiry || (() => {
        const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0,10);
      })();

      await api.post("/inventory", {
        ingredient_id: match.id,
        quantity: result.quantity_estimate ?? 0.5,
        unit: normalizeUnit(result.unit || getDefaultUnitForIngredient(match)),
        purchase_date: new Date().toISOString().slice(0,10),
        expiry_date: expiry,
        location: "Frigorifer",
        notes: `PhotoScan AI · ${result.confidence}% besueshmëri`,
      });

      toast.success("U shtua!", `${match.name} · ${result.quantity_estimate ?? "?"} ${result.unit || ""}`);
      setResult(null); setPreview(null); setImgFile(null);
      onAdded?.();
      onClose?.();
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Nuk u shtua");
    } finally { setSaving(false); }
  };

  const isModal = typeof onClose === "function";

  const card = (
      <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-stone-200 dark:border-white/[0.08] w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div>
            <p className="text-[15px] font-bold text-stone-900 dark:text-stone-100">PhotoScan AI</p>
            <p className="text-[12px] text-stone-400 mt-0.5">Foto · Identifikim AI · Shto në inventar</p>
          </div>
          {isModal && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-stone-100 dark:bg-white/[0.06] text-stone-500 hover:bg-stone-200 dark:hover:bg-white/[0.1] transition-colors text-sm"
            >✕</button>
          )}
        </div>

        <div className="p-5 space-y-4">

          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            className="relative border-2 border-dashed border-stone-200 dark:border-white/[0.1] rounded-xl cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors overflow-hidden"
            style={{ minHeight: preview ? "auto" : 120 }}
          >
            {preview ? (
              <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded-xl" />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <svg viewBox="0 0 20 20" fill="currentColor" width="34" height="34" className="text-stone-300 dark:text-stone-600 mb-2"><path d="M7 3.5h6l1 1.7h2.5A1.5 1.5 0 0 1 18 6.7v8.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 15V6.7a1.5 1.5 0 0 1 1.5-1.5H6l1-1.7Zm3 4.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Z"/></svg>
                <p className="text-[13px] font-medium text-stone-700 dark:text-stone-300">Kliko ose tërhiq foton</p>
                <p className="text-[11px] text-stone-400 mt-1">Foto e produktit nga frigoriferi</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {/* Error state */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3 flex items-start justify-between gap-3">
              <p className="text-[12px] text-red-700 dark:text-red-300">Kujdes: {error}</p>
              <button onClick={() => setError(null)} className="text-[11px] text-red-500 hover:text-red-700 shrink-0">✕</button>
            </div>
          )}

          {/* Scan button */}
          {imgFile && !result && (
            <button
              disabled={scanning}
              onClick={scan}
              className="btn-primary w-full h-11 text-[13px] font-semibold"
            >
              {scanning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Duke identifikuar...
                </span>
              ) : "Identifiko me AI"}
            </button>
          )}

          {/* Rezultati */}
          {result && (
            <div className="rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200 dark:border-white/[0.08] p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-stone-400 uppercase tracking-[0.05em] font-semibold">Produkti i identifikuar</p>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    {result.confidence}% besueshmëri
                  </span>
                </div>
                <input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full text-[15px] font-bold text-stone-900 dark:text-stone-100 bg-white dark:bg-white/[0.06] border border-stone-200 dark:border-white/[0.1] rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400"
                  placeholder="Emri i produktit"
                />
                {!!result.alternatives?.length && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-stone-400 self-center">Mos ishte:</span>
                    {result.alternatives.map((alt) => (
                      <button
                        key={alt}
                        onClick={() => setEditedName(alt)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          editedName === alt
                            ? "bg-orange-500 border-orange-500 text-white"
                            : "bg-white dark:bg-white/[0.04] border-stone-200 dark:border-white/[0.1] text-stone-600 dark:text-stone-300 hover:border-orange-400"
                        }`}
                      >{alt}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l:"Kategoria", v: result.category },
                  { l:"Sasia", v: result.quantity_estimate != null ? `${result.quantity_estimate} ${result.unit || ""}` : "E pasigurt" },
                  { l:"Shelf life", v: result.shelf_life_estimate },
                  { l:"Lokacioni", v: result.storage_recommendation || "Frigorifer" },
                ].map(({ l, v }) => (
                  <div key={l} className="bg-white dark:bg-white/[0.04] rounded-lg px-3 py-2">
                    <p className="text-[10px] text-stone-400 uppercase tracking-[0.05em]">{l}</p>
                    <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {result.note && (
                <p className="text-[11px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/[0.04] rounded-lg px-3 py-2">
                  {result.note}
                </p>
              )}
              {!!result.suggested_recipes?.length && (
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  <span className="font-semibold">Receta të mundshme: </span>
                  {result.suggested_recipes.join(", ")}
                </div>
              )}
              {result.demo_mode && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 font-medium">
                  Demo AI Mode: identifikimi bazohet në analizë lokale/fallback sepse AI vision nuk ishte i disponueshëm. Korrigjo emrin më sipër nëse nuk përputhet.
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  disabled={saving}
                  onClick={addToInventory}
                  className="btn-primary flex-1 h-10 text-[13px]"
                >
                  {saving ? "Duke shtuar..." : "Shto në Inventar"}
                </button>
                <button
                  onClick={() => { setResult(null); setPreview(null); setImgFile(null); }}
                  className="btn-secondary flex-1 h-10 text-[13px]"
                >
                  Provo sërish
                </button>
              </div>
            </div>
          )}

          {/* Instruksione */}
          {!imgFile && (
            <div className="text-[12px] text-stone-400 space-y-1 pt-1">
              <p className="font-medium text-stone-500 dark:text-stone-400">Si funksionon:</p>
              <p>1. Ngarko foto produktit (domate, qumësht, pule...)</p>
              <p>2. AI identifikon automatikisht emrin dhe kategorinë</p>
              <p>3. Shtohet direkt në inventar me datën e skadimit</p>
            </div>
          )}
        </div>
      </div>
  );

  // Modal mode (kur hapet me onClose prop, p.sh. nga Inventory)
  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      >
        {card}
      </div>
    );
  }

  // Page mode (route /photoscan nga sidebar)
  return <div className="flex justify-center py-2">{card}</div>;
}
