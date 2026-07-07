import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../context/auth.context.jsx";
import { initials } from "../utils/helpers.js";
import { disconnectSocket } from "../services/socket.js";
import api from "../services/api.js";
import { ROLE_NAV, primaryRole } from "../config/roles.js";

// Titujt e faqeve (topbar)
const TITLES = {
  "dashboard": "Paneli",
  "inventory": "Inventari",
  "photoscan": "PhotoScan",
  "recipes": "Recetat",
  "meal-plans": "Planet Javore",
  "shopping": "Listat e Blerjes",
  "marketplace": "Marketplace",
  "activities": "Aktivitetet",
  "deliveries": "Dorëzimet",
  "notifications": "Njoftimet",
  "reports": "Raportet",
  "settings": "Cilësimet",
  "ml": "Rekomandime AI",
  "users": "Përdoruesit",
};

function IcoScan() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/></svg>; }
function IcoDash() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8-8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm0 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" clipRule="evenodd"/></svg>; }
function IcoInv() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm3 4h6v2H7V7zm0 4h6v2H7v-2z"/></svg>; }
function IcoRec() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>; }
function IcoPlan() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>; }
function IcoShop() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C4.57 11.036 5.051 12 6 12h12a1 1 0 100-2H6.477l.61-.61A.997.997 0 007 9h10l1-4H5.28L4.97 3.758A1 1 0 004 3H3zm10 13a1 1 0 100 2 1 1 0 000-2zM7 16a1 1 0 100 2 1 1 0 000-2z"/></svg>; }
function IcoBell() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>; }
function IcoRep() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>; }
function IcoML() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>; }
function IcoUser() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>; }
function IcoStore() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4 3h12l1 4a2 2 0 01-4 .3A2 2 0 0110 7a2 2 0 01-3 .3A2 2 0 013 7l1-4zm0 6.7V16a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1V9.7a3.3 3.3 0 01-3.5-.5 3.3 3.3 0 01-4 0 3.3 3.3 0 01-3.5.5z"/></svg>; }
function IcoTruck() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 5a1 1 0 011-1h8a1 1 0 011 1v2h2.5a1 1 0 01.8.4l2.5 3.3a1 1 0 01.2.6V14a1 1 0 01-1 1h-1a2 2 0 11-4 0H8a2 2 0 11-4 0H3a1 1 0 01-1-1V5zm10 4h4l-1.8-2H12v2z"/></svg>; }
function IcoGear() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.5 2.1l.4 1.9a6 6 0 011.5.9l1.9-.7 1.5 2.6-1.5 1.3a6 6 0 010 1.8l1.5 1.3-1.5 2.6-1.9-.7a6 6 0 01-1.5.9l-.4 1.9h-3l-.4-1.9a6 6 0 01-1.5-.9l-1.9.7L2.6 12l1.5-1.3a6 6 0 010-1.8L2.6 7.6l1.5-2.6 1.9.7a6 6 0 011.5-.9l.4-1.9h3zM10 7.5A2.5 2.5 0 1010 12.5 2.5 2.5 0 0010 7.5z" clipRule="evenodd"/></svg>; }
function IcoActivity() { return <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3 10h3l2-5 4 10 2-5h3v1.7h-1.9L12 17 8 7l-1 4.7H3V10Z"/></svg>; }

// Map route key -> ikonë (sidebar-i ndërtohet nga roles.js)
const ICONS = {
  dashboard: <IcoDash />,
  inventory: <IcoInv />,
  photoscan: <IcoScan />,
  recipes: <IcoRec />,
  "meal-plans": <IcoPlan />,
  shopping: <IcoShop />,
  marketplace: <IcoStore />,
  activities: <IcoActivity />,
  deliveries: <IcoTruck />,
  notifications: <IcoBell />,
  reports: <IcoRep />,
  settings: <IcoGear />,
  ml: <IcoML />,
  users: <IcoUser />,
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const unread = useSelector((s) => s.notif?.unread ?? 0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setThemeMode] = useState(() => {
    const saved = localStorage.getItem("sk-theme") || "light";
    // Apliko menjëherë
    if (saved === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    return saved;
  });

  // Aktiva path-i
  const currentKey = location.pathname.replace("/", "");

  const handleLogout = async () => {
    await api.post("/auth/logout").catch(() => {});
    disconnectSocket();
    logout();
    navigate("/login", { replace: true });
  };

  const handleNav = (key) => {
    navigate(`/${key}`);
    setSidebarOpen(false);
  };

  const toggleTheme = () => {
    const t = theme === "light" ? "dark" : "light";
    setThemeMode(t);
    localStorage.setItem("sk-theme", t);
    // Tailwind darkMode: "class" - duhet class "dark" te <html>
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Sidebar sipas rolit (nga roles.js)
  const navSections = ROLE_NAV[primaryRole(user)] || [];

  const isActive = (key) => location.pathname === `/${key}`;

  const pageTitle = TITLES[currentKey] ?? "Smart Kitchen";

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-[#0f1117]">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <button
          aria-label="Mbyll menune"
          className="fixed inset-0 z-30 bg-stone-950/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-shrink-0 flex-col border-r border-stone-200 bg-white shadow-2xl shadow-stone-950/10 transition-transform duration-200 dark:border-white/[0.06] dark:bg-[#13151c] md:static md:w-56 md:translate-x-0 md:shadow-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-stone-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">SK</div>
            <div>
              <p className="text-[13px] font-semibold text-stone-900 dark:text-stone-100 leading-none">Smart Kitchen</p>
              <p className="text-[10px] text-stone-400 dark:text-stone-600 mt-0.5">Marketplace System</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-stone-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials(user)}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-stone-800 dark:text-stone-200 truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] text-orange-500 dark:text-orange-400 font-medium">{user?.roles?.[0]}</p>
            </div>
          </div>
        </div>

        {/* Nav — sipas rolit */}
        <nav className="flex-1 overflow-y-auto py-3 px-1">
          {navSections.map((sec) => (
            <div key={sec.section} className="mb-1">
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-300 dark:text-stone-700">
                {sec.section}
              </p>
              {sec.items.map((n) => (
                <button
                  key={n.key}
                  onClick={() => handleNav(n.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all mb-0.5 ${
                    isActive(n.key)
                      ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
                      : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="flex-shrink-0 opacity-80">{ICONS[n.key]}</span>
                  <span className="flex-1 text-left">{n.label}</span>
                  {n.badge && unread > 0 && (
                    <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 space-y-1.5 border-t border-stone-100 dark:border-white/[0.06] pt-3">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-500 dark:hover:bg-white/[0.06] transition-all"
          >
            {theme === "dark"
              ? <><svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM9.2 1h1.6v2.5H9.2V1Zm0 15.5h1.6V19H9.2v-2.5ZM1 9.2h2.5v1.6H1V9.2Zm15.5 0H19v1.6h-2.5V9.2ZM3.9 3.9l1.1-1.1 1.8 1.7-1.2 1.2-1.7-1.8Zm9.3 9.4 1.2-1.2 1.7 1.8-1.1 1.1-1.8-1.7Zm1.8-11.1 1.1 1.1-1.7 1.8-1.2-1.2 1.8-1.7ZM4.9 13.3l1.2 1.2-1.8 1.7-1.1-1.1 1.7-1.8Z"/></svg> Light Mode</>
              : <><svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M17 12.6A7.5 7.5 0 0 1 7.4 3 7.5 7.5 0 1 0 17 12.6Z"/></svg> Dark Mode</>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium text-stone-500 hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-950 dark:hover:text-red-400 transition-all"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/></svg>
            Çkyçu
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-14 flex items-center gap-3 px-4 sm:px-6 bg-white/90 backdrop-blur border-b border-stone-200 dark:bg-[#13151c]/90 dark:border-white/[0.06] flex-shrink-0">
          <button
            aria-label="Hap menune"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-stone-400 md:hidden"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z"/></svg>
          </button>
          <h1 className="text-[18px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {pageTitle}
          </h1>
        </header>

        {/* Faqja aktuale renderohet këtu */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:p-6 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
