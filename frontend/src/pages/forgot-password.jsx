import { useState } from "react";
import api from "../services/api.js";

export default function ForgotPassword({ onBack }) {
  const [email,   setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent] = useState(false);
  const [error,   setError] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (e) {
      setError(e.response?.data?.message || "Gabim — provo sërish");
    } finally { setLoading(false); }
  };

  if (sent) return (
    <div style={{ textAlign:"center", padding:"8px 0" }}>
      <svg viewBox="0 0 20 20" width="40" height="40" fill="var(--accent,#e8602c)" style={{margin:"0 auto 10px"}}><path d="M2.5 4.5h15v11h-15v-11Zm1.9 1.6L10 10.4l5.6-4.3H4.4ZM16 7.3l-6 4.6-6-4.6v6.7h12V7.3Z"/></svg>
      <p style={{ fontSize:14, fontWeight:600, color:"var(--text-1)", marginBottom:6 }}>Email u dërgua!</p>
      <p style={{ fontSize:12.5, color:"var(--text-3)", lineHeight:1.6, marginBottom:16 }}>
        Kontrollo inbox-in (dhe spam). Linku skadon pas 1 ore.
      </p>
      <button onClick={onBack} style={{ background:"none", border:"none", color:"var(--accent)", cursor:"pointer", fontSize:13, fontWeight:500 }}>
        ← Kthehu te Login
      </button>
    </div>
  );

  return (
    <div style={{ padding:"4px 0" }}>
      <p style={{ fontSize:14, fontWeight:700, color:"var(--text-1)", marginBottom:4 }}>Rivendos Fjalëkalimin</p>
      <p style={{ fontSize:12, color:"var(--text-3)", marginBottom:16, lineHeight:1.5 }}>
        Shkruaj email-in — do të marrësh link rivendosjeje.
      </p>
      {error && (
        <div style={{ padding:"8px 12px", background:"rgba(204,53,53,0.08)", border:"0.5px solid rgba(204,53,53,0.2)", borderRadius:7, fontSize:12.5, color:"var(--red)", marginBottom:12 }}>
          {error}
        </div>
      )}
      <form onSubmit={submit}>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:600, color:"var(--text-2)", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.04em" }}>Email</label>
          <input className="sk-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@shembull.com" autoFocus />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:"100%", height:40 }}>
          {loading ? "Duke dërguar..." : "Dërgo Linkun"}
        </button>
      </form>
      <button onClick={onBack} style={{ marginTop:10, background:"none", border:"none", color:"var(--text-3)", cursor:"pointer", fontSize:12, width:"100%", textAlign:"center" }}>
        ← Kthehu te Login
      </button>
    </div>
  );
}
