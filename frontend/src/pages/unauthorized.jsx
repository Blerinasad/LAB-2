import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", padding:16 }}>
      <div style={{ textAlign:"center", maxWidth:400 }}>
        <p style={{ fontSize:80, fontWeight:800, color:"var(--amber)", letterSpacing:"-0.05em", lineHeight:1, marginBottom:8 }}>403</p>
        <p style={{ fontSize:20, fontWeight:700, color:"var(--text-1)", marginBottom:8 }}>Qasje e ndaluar</p>
        <p style={{ fontSize:14, color:"var(--text-3)", marginBottom:28, lineHeight:1.6 }}>
          Nuk ke leje të aksesosh këtë faqe. Kontakto administratorin nëse mendon se kjo është gabim.
        </p>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Kthehu</button>
          <button className="btn btn-primary" onClick={() => navigate("/")}>Dashboard</button>
        </div>
      </div>
    </div>
  );
}
