import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth.context.jsx";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", padding:16 }}>
      <div style={{ textAlign:"center", maxWidth:400 }}>
        <p style={{ fontSize:80, fontWeight:800, color:"var(--accent)", letterSpacing:"-0.05em", lineHeight:1, marginBottom:8 }}>404</p>
        <p style={{ fontSize:20, fontWeight:700, color:"var(--text-1)", marginBottom:8 }}>Faqja nuk u gjet</p>
        <p style={{ fontSize:14, color:"var(--text-3)", marginBottom:28, lineHeight:1.6 }}>
          Faqja që po kërkon nuk ekziston ose është lëvizur.
        </p>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Kthehu</button>
          <button className="btn btn-primary" onClick={() => navigate(user ? "/" : "/login")}>
            {user ? "Dashboard" : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
