import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { AuthProvider, useAuth } from "./context/auth.context.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import Layout from "./components/layout.jsx";
import Toaster from "./components/toast.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Loading from "./components/Loading.jsx";

const Login = lazy(() => import("./pages/login.jsx"));
const Home = lazy(() => import("./pages/home.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const Unauthorized = lazy(() => import("./pages/unauthorized.jsx"));
const Dashboard = lazy(() => import("./pages/dashboard.jsx"));
const Inventory = lazy(() => import("./pages/inventory.jsx"));
const Recipes = lazy(() => import("./pages/recipes.jsx"));
const MealPlans = lazy(() => import("./pages/MealPlans.jsx"));
const Shopping = lazy(() => import("./pages/shopping.jsx"));
const Notifications = lazy(() => import("./pages/notifications.jsx"));
const Reports = lazy(() => import("./pages/reports.jsx"));
const ML = lazy(() => import("./pages/ml.jsx"));
const Users = lazy(() => import("./pages/users.jsx"));
const PhotoScan = lazy(() => import("./pages/PhotoScan.jsx"));
const Marketplace = lazy(() => import("./pages/Marketplace.jsx"));
const Deliveries = lazy(() => import("./pages/Deliveries.jsx"));
const Settings = lazy(() => import("./pages/settings.jsx"));
const Activities = lazy(() => import("./pages/Activities.jsx"));

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/404" element={<NotFound />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="photoscan" element={<PhotoScan />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="meal-plans" element={<MealPlans />} />
            <Route path="shopping" element={<Shopping />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="activities" element={<Activities />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="ml" element={<ML />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<Users />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
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
