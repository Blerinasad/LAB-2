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
import { useToast } from "../hooks/useToast.js";

const ROLE_BADGE = {
  Admin: "orange",
  Manager: "amber",
  User: "stone",
  Courier: "blue",
};
const EMPTY = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  is_active: 1,
  roles: ["User"],
};

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const response = await api
      .get("/users")
      .catch(() => ({ data: { data: [] } }));
    const payload = response.data?.data ?? response.data;
    const usersList = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(payload?.rows)
          ? payload.rows
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
    setUsers(usersList);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", form);
      toast.success("Useri u krijua!", form.email);
      setModal(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.danger("Gabim", err.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  const [busy, setBusy] = useState({});
  const toggleActive = async (u) => {
    setBusy((b) => ({ ...b, [u.id]: true }));
    try {
      const { data } = await api.patch(`/users/${u.id}/toggle`);
      const active = data.data?.is_active;
      toast.success(
        active ? "Aktivizuar" : "Çaktivizuar",
        `${u.first_name} ${u.last_name}`,
      );
      setUsers((list) =>
        (Array.isArray(list) ? list : []).map((x) =>
          x.id === u.id ? { ...x, is_active: active } : x,
        ),
      );
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Nuk u përditësua");
    } finally {
      setBusy((b) => ({ ...b, [u.id]: false }));
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          className="btn-primary w-full sm:w-auto"
          onClick={() => setModal(true)}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          User i Ri
        </button>
      </div>

      {(() => {
        const safeUsers = Array.isArray(users) ? users : [];
        return loading ? (
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {safeUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials(u)}
                        </div>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {u.first_name} {u.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="text-stone-500 dark:text-stone-500">
                      {u.email}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(u.roles) ? u.roles : []).map((r) => (
                          <Badge key={r} variant={ROLE_BADGE[r] || "stone"}>
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge variant={u.is_active ? "green" : "red"}>
                        {u.is_active ? "Aktiv" : "Joaktiv"}
                      </Badge>
                    </td>
                    <td>
                      {u.is_active ? (
                        <button
                          className="btn-danger btn-xs"
                          disabled={busy[u.id]}
                          onClick={() => toggleActive(u)}
                        >
                          Deaktivizo
                        </button>
                      ) : (
                        <button
                          className="btn-secondary btn-xs"
                          disabled={busy[u.id]}
                          onClick={() => toggleActive(u)}
                        >
                          Aktivizo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {modal && (
        <Modal
          title="User i Ri"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModal(false)}>
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
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                  required
                />
              </FormGroup>
              <FormGroup label="Mbiemri">
                <Input
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                  required
                />
              </FormGroup>
            </FormRow>
            <FormGroup label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </FormGroup>
            <FormGroup label="Fjalëkalimi">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </FormGroup>
            <FormGroup label="Roli">
              <Select
                value={form.roles[0]}
                onChange={(e) => setForm({ ...form, roles: [e.target.value] })}
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
    </div>
  );
}
