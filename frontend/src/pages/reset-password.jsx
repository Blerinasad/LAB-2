import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password,  setPassword] = useState("");
  const [confirm,   setConfirm] = useState("");
  const [loading,   setLoading] = useState(false);
  const [done,      setDone] = useState(false);
  const [error,     setError] = useState("");
  const [token,     setToken] = useState("");
  const [uid,       setUid] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setToken(p.get("token") || "");
    setUid(p.get("uid")   || "");
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (password !== confirm) return setError("Fjalëkalimet nuk përputhen");
    if (password.length < 8) return setError("Të paktën 8 karaktere");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, uid, password });
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.message || "Linku ka skaduar ose është i pavlefshëm");
    } finally { setLoading(false); }
  };

  if (!token || !uid) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
      <div style={{ background:"var(--surface)", border:"0.5px solid var(--border-2)", borderRadius:14, padding:32, maxWidth:380, width:"100%", textAlign:"center" }}>
        <svg viewBox="0 0 20 20" width="44" height="44" fill="var(--red,#dc2626)" style={{margin:"0 auto 12px"}}><path d="M10 1.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4Zm3 10-1.2 1.2L10 11.2 8.2 13 7 11.8 8.8 10 7 8.2 8.2 7 10 8.8 11.8 7 13 8.2 11.2 10 13 11.8Z"/></svg>
        <p style={{ fontSize:14, fontWeight:600, color:"var(--red)", marginBottom:16 }}>Link i pavlefshëm</p>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>← Kthehu te Login</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)" }}>
      <div style={{ background:"var(--surface)", border:"0.5px solid var(--border-2)", borderRadius:14, padding:32, maxWidth:380, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.12)" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,var(--accent),#f5a060)", borderRadius:"14px 14px 0 0", margin:"-32px -32px 24px" }} />

        {done ? (
          <div style={{ textAlign:"center" }}>
            <svg viewBox="0 0 20 20" width="44" height="44" fill="var(--green,#16a34a)" style={{margin:"0 auto 12px"}}><path d="M10 1.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4Zm4 5.9-4.9 5.6-3-2.7 1.1-1.2 1.8 1.6 3.8-4.4 1.2 1.1Z"/></svg>
            <p style={{ fontSize:15, fontWeight:700, color:"var(--text-1)", marginBottom:6 }}>Fjalëkalimi u ndryshua!</p>
            <p style={{ fontSize:12.5, color:"var(--text-3)", marginBottom:20 }}>Kyçu me fjalëkalimin e ri.</p>
            <button className="btn btn-primary" onClick={() => navigate("/login")}>Shko te Login →</button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,var(--accent),#f5a060)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:13 }}>SK</div>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:"var(--text-1)" }}>Smart Kitchen</p>
                <p style={{ fontSize:11, color:"var(--text-3)" }}>Rivendos fjalëkalimin</p>
              </div>
            </div>
            {error && (
              <div style={{ padding:"9px 12px", background:"rgba(204,53,53,0.08)", border:"0.5px solid rgba(204,53,53,0.2)", borderRadius:7, fontSize:12.5, color:"var(--red)", marginBottom:14 }}>
                {error}
              </div>
            )}
            <form onSubmit={submit}>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"var(--text-2)", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.04em" }}>Fjalëkalimi i ri</label>
                <input className="sk-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Të paktën 8 karaktere" autoFocus />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"var(--text-2)", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.04em" }}>Konfirmo fjalëkalimin</label>
                <input className="sk-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Ripërsërit fjalëkalimin" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width:"100%", height:42 }}>
                {loading ? "Duke ndryshuar..." : "Ndrysho Fjalëkalimin"}
              </button>
            </form>
            <button onClick={() => navigate("/login")} style={{ marginTop:12, background:"none", border:"none", color:"var(--text-3)", cursor:"pointer", fontSize:12, width:"100%", textAlign:"center" }}>
              ← Kthehu te Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
