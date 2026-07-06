import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/auth.context.jsx";

const Loading = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--bg)" }}>
    <div style={{ width:32, height:32, border:"3px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin .65s linear infinite" }} />
  </div>
);

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  // Pa login → Login page
  if (!user) return <Navigate to="/login" replace />;

  // Ka role restriction dhe nuk e plotëson → 403
  if (roles && !roles.some((r) => user.roles?.includes(r)))
    return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}
