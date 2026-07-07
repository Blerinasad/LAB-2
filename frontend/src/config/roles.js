// roles.js — Konfigurimi qendror i roleve (single source of truth)
// Përcakton çfarë sheh dhe çfarë mund të bëjë secili rol.
// Përdoret nga: Layout (sidebar), ProtectedRoute (akses faqesh), RootRedirect.

// Rendi i prioritetit kur një user ka disa role
export const ROLE_PRIORITY = ["Admin", "Manager", "Courier", "User"];

export function primaryRole(user) {
  const roles = user?.roles || [];
  return ROLE_PRIORITY.find((r) => roles.includes(r)) || "User";
}

// Faqja fillestare pas login-it, sipas rolit
export const ROLE_HOME = {
  Admin: "/dashboard",
  Manager: "/dashboard",
  Courier: "/dashboard",
  User: "/dashboard",
};

// Cilat rrugë (route keys) lejohen për secilin rol.
// Dashboard & notifications i ka çdo rol. Pjesa tjetër ndryshon.
export const ROLE_PAGES = {
  Admin: ["dashboard", "users", "reports", "activities", "notifications", "settings"],
  Manager: ["dashboard", "marketplace", "reports", "notifications"],
  Courier: ["dashboard", "deliveries", "notifications"],
  User: ["dashboard", "inventory", "photoscan", "recipes", "meal-plans", "shopping", "marketplace", "ml", "notifications"],
};

// A lejohet një rol të hyjë në një faqe (route key)?
export function canAccess(user, pageKey) {
  const role = primaryRole(user);
  return (ROLE_PAGES[role] || []).includes(pageKey);
}

// Struktura e sidebar-it për secilin rol.
// section: grupim vizual. key: përputhet me route.
export const ROLE_NAV = {
  Admin: [
    { section: "Administrim", items: [
      { key: "dashboard", label: "Paneli" },
      { key: "users", label: "Përdoruesit" },
      { key: "reports", label: "Raportet" },
      { key: "settings", label: "Cilësimet" },
    ]},
    { section: "Sistemi", items: [
      { key: "activities", label: "Aktivitetet" },
      { key: "notifications", label: "Njoftimet", badge: true },
    ]},
  ],
  Manager: [
    { section: "Marketplace", items: [
      { key: "dashboard", label: "Paneli" },
      { key: "marketplace", label: "Porositë" },
      { key: "reports", label: "Raportet" },
    ]},
    { section: "Sistemi", items: [
      { key: "notifications", label: "Njoftimet", badge: true },
    ]},
  ],
  Courier: [
    { section: "Dorëzime", items: [
      { key: "dashboard", label: "Paneli" },
      { key: "deliveries", label: "Dorëzimet e mia" },
    ]},
    { section: "Sistemi", items: [
      { key: "notifications", label: "Njoftimet", badge: true },
    ]},
  ],
  User: [
    { section: "Kuzhina ime", items: [
      { key: "dashboard", label: "Paneli" },
      { key: "inventory", label: "Inventari" },
      { key: "photoscan", label: "PhotoScan" },
      { key: "recipes", label: "Recetat" },
      { key: "meal-plans", label: "Planet Javore" },
    ]},
    { section: "Blerje", items: [
      { key: "shopping", label: "Listat e Blerjes" },
      { key: "marketplace", label: "Porosit & Dyqane" },
    ]},
    { section: "Asistenca", items: [
      { key: "ml", label: "Rekomandime AI" },
      { key: "notifications", label: "Njoftimet", badge: true },
    ]},
  ],
};
