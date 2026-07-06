import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { AuthProvider, useAuth } from "./context/auth.context.jsx";
import ProtectedRoute from "./components/auth/protected-route.jsx";
import Layout from "./components/layout.jsx";
import Toaster from "./components/toast.jsx";
import ErrorBoundary from "./components/error-boundary.jsx";

const Login = lazy(() => import("./pages/login.jsx"));
const Home = lazy(() => import("./pages/home.jsx"));
const ResetPassword = lazy(() => import("./pages/reset-password.jsx"));
const NotFound = lazy(() => import("./pages/not-found.jsx"));
const Unauthorized = lazy(() => import("./pages/unauthorized.jsx"));
const Dashboard = lazy(() => import("./pages/dashboard.jsx"));
const Inventory = lazy(() => import("./pages/inventory.jsx"));
const Recipes = lazy(() => import("./pages/recipes.jsx"));
const MealPlans = lazy(() => import("./pages/meal-plans.jsx"));
const Shopping = lazy(() => import("./pages/shopping.jsx"));
const Notifications = lazy(() => import("./pages/notifications.jsx"));
const Reports = lazy(() => import("./pages/reports.jsx"));
const Settings = lazy(() => import("./pages/settings.jsx"));
const ML = lazy(() => import("./pages/ml.jsx"));
const Users = lazy(() => import("./pages/users.jsx"));
const PhotoScan = lazy(() => import("./pages/photo-scan.jsx"));

const Loading = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg)" }}>
    <div style={{ width:32, height:32, border:"3px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin .65s linear infinite" }} />
  </div>
);

// PublicRoute — nëse user është i kyçur, dërgo te dashboard
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>

        {/* Root → login ose dashboard */}
        <Route path="/" element={<RootRedirect />} />

        {/* Landing page — pa login */}
        <Route path="/home" element={<Home />} />

        {/* Auth pages */}
        <Route path="/login"          element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Error pages */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/404"          element={<NotFound />} />

        {/* App (Protected) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="dashboard"     element={<Dashboard />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="marketplace"   element={<Shopping />} />

            <Route element={<ProtectedRoute roles={["Admin", "Manager", "User"]} />}>
              <Route path="inventory"  element={<Inventory />} />
              <Route path="photoscan"  element={<PhotoScan />} />
              <Route path="recipes"    element={<Recipes />} />
              <Route path="meal-plans" element={<MealPlans />} />
              <Route path="shopping"   element={<Shopping />} />
              <Route path="reports"    element={<Reports />} />
              <Route path="ml"         element={<ML />} />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute roles={["Admin"]} />}>
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Suspense>
  );
}

// Root redirect: i kyçur → dashboard, jo i kyçur → login
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
    </ErrorBoundary>
  );
}
