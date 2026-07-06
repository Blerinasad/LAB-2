import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/auth.context.jsx";
import { Card, Empty, Input, Spinner } from "../components/ui.jsx";
import { getSettings, updateSetting } from "../services/settings.service.js";

function unwrap(payload) {
  return payload?.data ?? payload ?? [];
}

function settingDescription(setting) {
  return setting.description || setting.type || "Konfigurim i sistemit";
}

export default function Settings() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const canEdit = roles.includes("Admin") || roles.includes("Manager");
  const [settings, setSettings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState("");

  const grouped = useMemo(() => {
    return settings.reduce((acc, item) => {
      const group = item.group_name || item.category || "Të përgjithshme";
      acc[group] = acc[group] || [];
      acc[group].push(item);
      return acc;
    }, {});
  }, [settings]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getSettings();
      const rows = Array.isArray(unwrap(response)) ? unwrap(response) : [];
      setSettings(rows);
      setDrafts(Object.fromEntries(rows.map((item) => [item.key, item.value ?? ""])));
    } catch (e) {
      setError(e?.response?.data?.message || "Settings nuk u ngarkuan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (key) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    setError("");
    try {
      await updateSetting(key, drafts[key]);
      setSettings((prev) =>
        prev.map((item) => (item.key === key ? { ...item, value: drafts[key] } : item))
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Setting nuk u ruajt.");
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) return <Spinner center />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-widest text-orange-500">
            Settings
          </p>
          <h1 className="mt-1 text-[24px] font-bold tracking-tight text-stone-950 dark:text-stone-50 sm:text-[30px]">
            Konfigurimet e sistemit
          </h1>
          <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-500">
            Parametra realë nga backend-i për SmartKitchen.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[12px] font-medium text-stone-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-stone-400">
          {canEdit ? "Editim: Admin/Manager" : "Read-only"}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {settings.length === 0 ? (
        <Card>
          <Empty icon="" title="Nuk ka settings për t'u shfaqur." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {Object.entries(grouped).map(([group, items]) => (
            <Card key={group} title={group} sub={`${items.length} konfigurime`}>
              <div className="space-y-3">
                {items.map((item) => {
                  const changed = String(drafts[item.key] ?? "") !== String(item.value ?? "");
                  return (
                    <div
                      key={item.key}
                      className="rounded-xl border border-stone-100 p-3 dark:border-white/[0.06]"
                    >
                      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-stone-800 dark:text-stone-200">
                            {item.key}
                          </p>
                          <p className="text-[12px] text-stone-500 dark:text-stone-500">
                            {settingDescription(item)}
                          </p>
                        </div>
                        {item.updated_at && (
                          <span className="text-[11px] text-stone-400 dark:text-stone-600">
                            {String(item.updated_at).slice(0, 10)}
                          </span>
                        )}
                      </div>

                      {canEdit ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={drafts[item.key] ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))
                            }
                          />
                          <button
                            className="btn-primary sm:w-auto"
                            disabled={!changed || saving[item.key]}
                            onClick={() => save(item.key)}
                          >
                            {saving[item.key] ? "Duke ruajtur" : "Ruaj"}
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-stone-50 px-3 py-2 text-[13px] font-medium text-stone-700 dark:bg-white/[0.04] dark:text-stone-300">
                          {item.value || "N/A"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
