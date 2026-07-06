import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth.context.jsx";
import ForgotPassword from "./forgot-password.jsx";

const DEMO_ACCOUNTS = [
  { label:"Admin",   email:"admin@smartkitchen.com",   password:"Password123!", color:"bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
  { label:"User 1",  email:"artan@smartkitchen.com",   password:"Password123!", color:"bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  { label:"User 2",  email:"blerta@smartkitchen.com",  password:"Password123!", color:"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { label:"Courier", email:"courier@smartkitchen.com", password:"Password123!", color:"bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form,       setForm] = useState({ email: "", password: "" });
  const [error,      setError] = useState("");
  const [loading,    setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const fillDemo = (acc) => setForm({ email: acc.email, password: acc.password });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Email ose fjalëkalimi i gabuar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] dark:bg-[#0f1117] px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
            SK
          </div>
          <div>
            <p className="text-[15px] font-bold text-stone-900 dark:text-stone-100 leading-none">Smart Kitchen</p>
            <p className="text-[11px] text-stone-400 mt-0.5">Marketplace System</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-stone-200 dark:border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">

          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />

          <div className="p-7">
            <h1 className="text-[18px] font-bold text-stone-900 dark:text-stone-100 mb-1">Mirë se vjen</h1>
            <p className="text-[12.5px] text-stone-400 mb-6">Kyçu për të vazhduar</p>

            {/* Error */}
            {error && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-[12.5px] text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-[0.06em] mb-1.5">
                  Email
                </label>
                <input
                  className="sk-input"
                  type="email" name="email" value={form.email}
                  onChange={onChange} required
                  placeholder="email@shembull.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-[0.06em]">
                    Fjalëkalimi
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-[11px] text-orange-500 hover:text-orange-600 font-medium transition-colors"
                  >
                    Harrova fjalëkalimin?
                  </button>
                </div>
                <input
                  className="sk-input"
                  type="password" name="password" value={form.password}
                  onChange={onChange} required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-11 text-[13.5px] font-semibold mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Duke u kyçur...
                  </span>
                ) : "Kyçu →"}
              </button>
            </form>

            {/* Demo accounts - kliko për të mbushur */}
            <div className="mt-5 pt-5 border-t border-stone-100 dark:border-white/[0.06]">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.06em] mb-2.5">
                Demo — kliko për të mbushur kredencialet
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className={`text-left px-3 py-2 rounded-xl text-[11.5px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${acc.color}`}
                  >
                    {acc.label}
                    <span className="block text-[10px] font-normal opacity-70 truncate mt-0.5">
                      {acc.email.split("@")[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-stone-400 mt-5">
          Smart Kitchen & Marketplace — UBT 2025–2026
        </p>
      </div>

      {/* Forgot Password Modal */}
      {forgotMode && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setForgotMode(false)}
        >
          <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-stone-200 dark:border-white/[0.06] p-7 w-full max-w-sm shadow-xl">
            <ForgotPassword onBack={() => setForgotMode(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
