import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/auth.context.jsx";
import { canAccess } from "../../config/roles.js";
import Loading from "../Loading.jsx";

export default function ProtectedRoute({ pageKey }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;

  const key = pageKey || location.pathname.replace(/^\//, "").split("/")[0];
  if (key && !canAccess(user, key)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
