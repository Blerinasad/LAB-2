import { useEffect, useState } from "react";
import api from "../services/api.js";
import {
  Spinner,
  Empty,
  Modal,
  Badge,
  FormGroup,
  Input,
  Select,
  FormRow,
} from "../components/ui.jsx";
import { initials } from "../utils/helpers.js";
import { useToast } from "../hooks/use-toast.js";
import { useAuth } from "../context/auth.context.jsx";

const ROLE_BADGE = {
  Admin: "orange",
  Manager: "amber",
  User: "stone",
  Courier: "blue",
};

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  is_active: 1,
  roles: ["User"],
};

function normalizeUsersResponse(response) {
  const payload = response?.data?.data ?? response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

function normalizeAuditResponse(response) {
  const payload = response?.data?.data ?? response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

export default function Users() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.includes("Admin");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [auditModal, setAuditModal] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const response = await api.get("/users");
      setUsers(normalizeUsersResponse(response));
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsers([]);

      if (error.response?.status !== 401) {
        toast.danger(
          "Gabim",
          error.response?.data?.message || "Nuk u ngarkuan përdoruesit.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await api.post("/users", form);

      toast.success("Përdoruesi u krijua!", form.email);
      setModal(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (error) {
      toast.danger(
        "Gabim",
        error.response?.data?.message || "Përdoruesi nuk u krijua.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (id) => {
    const confirmed = window.confirm(
      "Fshi përdoruesin? Ky veprim nuk kthehet.",
    );

    if (!confirmed) return;

    try {
      await api.delete(`/users/${id}`);
      toast.warn("Përdoruesi u fshi.");
      await load();
    } catch (error) {
      toast.danger(
        "Gabim",
        error.response?.data?.message || "Përdoruesi nuk u fshi.",
      );
    }
  };

  const openAuditLogs = async (selectedUser) => {
    setAuditModal(selectedUser);
    setAuditLogs([]);
    setAuditError("");
    setAuditLoading(true);

    try {
      const response = await api.get("/reports/audit-logs", {
        params: { userId: selectedUser.id, limit: 50 },
      });
      setAuditLogs(normalizeAuditResponse(response));
    } catch (error) {
      setAuditError(
        error.response?.data?.message || "Audit logs nuk u ngarkuan.",
      );
    } finally {
      setAuditLoading(false);
    }
  };

  const safeUsers = Array.isArray(users) ? users : [];

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <button
          className="btn-primary w-full sm:w-auto"
          onClick={() => setModal(true)}
          type="button"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          User i Ri
        </button>
      </div>

      {loading ? (
        <Spinner center />
      ) : safeUsers.length === 0 ? (
        <div className="sk-card">
          <Empty title="Nuk ka përdorues" />
        </div>
      ) : (
        <div className="sk-card overflow-x-auto p-0">
          <table className="sk-table">
            <thead>
              <tr>
                <th>Përdoruesi</th>
                <th>Email</th>
                <th>Rolet</th>
                <th>Statusi</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {safeUsers.map((user) => {
                const roles = Array.isArray(user.roles) ? user.roles : [];

                return (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-xs font-bold text-white">
                          {initials(user)}
                        </div>

                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </td>

                    <td className="text-stone-500 dark:text-stone-400">
                      {user.email}
                    </td>

                    <td>
                      <div className="flex flex-wrap gap-1">
                        {roles.length > 0 ? (
                          roles.map((role) => (
                            <Badge
                              key={role}
                              variant={ROLE_BADGE[role] || "stone"}
                            >
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-stone-400">Pa rol</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <Badge variant={user.is_active ? "green" : "red"}>
                        {user.is_active ? "Aktiv" : "Joaktiv"}
                      </Badge>
                    </td>

                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {isAdmin && (
                          <button
                            className="btn-secondary btn-xs"
                            onClick={() => openAuditLogs(user)}
                            type="button"
                          >
                            View Audit Logs
                          </button>
                        )}
                        <button
                          className="btn-danger btn-xs"
                          onClick={() => removeUser(user.id)}
                          type="button"
                        >
                          Fshi
                        </button>
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
        <Modal
          title="User i Ri"
          onClose={() => setModal(false)}
          footer={
            <>
              <button
                className="btn-secondary"
                onClick={() => setModal(false)}
                type="button"
              >
                Anulo
              </button>

              <button
                className="btn-primary"
                form="user-form"
                type="submit"
                disabled={saving}
              >
                {saving ? "Duke krijuar..." : "Krijo"}
              </button>
            </>
          }
        >
          <form id="user-form" onSubmit={submit}>
            <FormRow>
              <FormGroup label="Emri">
                <Input
                  value={form.first_name}
                  onChange={(event) =>
                    setForm({ ...form, first_name: event.target.value })
                  }
                  required
                />
              </FormGroup>

              <FormGroup label="Mbiemri">
                <Input
                  value={form.last_name}
                  onChange={(event) =>
                    setForm({ ...form, last_name: event.target.value })
                  }
                  required
                />
              </FormGroup>
            </FormRow>

            <FormGroup label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
            </FormGroup>

            <FormGroup label="Fjalëkalimi">
              <Input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                required
              />
            </FormGroup>

            <FormGroup label="Roli">
              <Select
                value={form.roles[0]}
                onChange={(event) =>
                  setForm({ ...form, roles: [event.target.value] })
                }
              >
                <option value="User">User</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
                <option value="Courier">Courier</option>
              </Select>
            </FormGroup>
          </form>
        </Modal>
      )}

      {auditModal && (
        <Modal
          title={`Audit Logs — ${auditModal.email}`}
          onClose={() => setAuditModal(null)}
          wide
          footer={
            <button
              className="btn-secondary"
              onClick={() => setAuditModal(null)}
              type="button"
            >
              Mbyll
            </button>
          }
        >
          {auditLoading ? (
            <Spinner center />
          ) : auditError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
              {auditError}
            </div>
          ) : auditLogs.length === 0 ? (
            <Empty title="Nuk ka audit logs për këtë përdorues." />
          ) : (
            <div className="overflow-x-auto">
              <table className="sk-table min-w-[620px]">
                <thead>
                  <tr>
                    <th>Veprimi</th>
                    <th>Entiteti</th>
                    <th>ID</th>
                    <th>Koha</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <Badge variant="orange">
                          {log.action || "INFO"}
                        </Badge>
                      </td>
                      <td className="font-semibold text-stone-800 dark:text-stone-200">
                        {log.entity || "N/A"}
                      </td>
                      <td>{log.entity_id || "N/A"}</td>
                      <td className="text-stone-500 dark:text-stone-400">
                        {log.created_at
                          ? String(log.created_at).slice(0, 16).replace("T", " ")
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
