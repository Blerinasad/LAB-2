import { useNavigate } from "react-router-dom";

const hsvp = { viewBox:"0 0 20 20", fill:"currentColor", width:22, height:22 };
const HBox = () => <svg {...hsvp}><path d="M2 5.5 10 2l8 3.5v9L10 18l-8-3.5v-9Zm8 1.6L4.6 4.9 10 3l5.4 1.9L10 7.1Zm-6 1 5 2.2v6.3l-5-2.2V8.1Zm12 0v6.3l-5 2.2v-6.3l5-2.2Z"/></svg>;
const HDish = () => <svg {...hsvp}><path d="M10 4a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Zm-8 8.5h16V14H2v-1.5ZM9.2 2h1.6v1.5H9.2V2Z"/></svg>;
const HCart = () => <svg {...hsvp}><path d="M2 3h2.3l.6 2H18l-2 7H6.4L5 5.6 4.6 4H2V3Zm5 9.6h8.4l1.3-4.6H6.1l.9 4.6ZM7.5 16a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm7 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z"/></svg>;
const HChart = () => <svg {...hsvp}><path d="M3 17h14v1.6H3V17Zm1.2-6.2h2.4V15H4.2v-4.2Zm4.4-4h2.4V15H8.6V6.8Zm4.4-3.4h2.4V15H13V3.4Z"/></svg>;
const HBrain = () => <svg {...hsvp}><path d="M7.2 2.5A2.7 2.7 0 0 0 4.5 5.2v.4A3.1 3.1 0 0 0 2.6 8.5c0 .7.2 1.3.6 1.8a3.3 3.3 0 0 0 .8 4.9 2.9 2.9 0 0 0 5 2V4.6a2.7 2.7 0 0 0-1.8-2.1Zm5.6 0a2.7 2.7 0 0 1 2.7 2.7v.4a3.1 3.1 0 0 1 1.9 2.9c0 .7-.2 1.3-.6 1.8a3.3 3.3 0 0 1-.8 4.9 2.9 2.9 0 0 1-5 2V4.6a2.7 2.7 0 0 1 1.8-2.1Z"/></svg>;
const HBolt = () => <svg {...hsvp}><path d="M11.5 1 3 11.5h5L8.5 19 17 8.5h-5L11.5 1Z"/></svg>;
const HUser = () => <svg {...hsvp}><path d="M10 2.5a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4ZM3.5 17.5c0-3 2.9-5.2 6.5-5.2s6.5 2.2 6.5 5.2H3.5Z"/></svg>;
const HStore = () => <svg {...hsvp}><path d="M3 3h14l1 4a2.5 2.5 0 0 1-2.4 2 2.5 2.5 0 0 1-2.3-1.5A2.5 2.5 0 0 1 11 9a2.5 2.5 0 0 1-2.3-1.5A2.5 2.5 0 0 1 6.4 9 2.5 2.5 0 0 1 4 7l-1-4Zm1 7.8V17h12v-6.2a4 4 0 0 1-2.4-.6 4.1 4.1 0 0 1-4.6 0 4.1 4.1 0 0 1-4.6 0 4 4 0 0 1-.4.6ZM8 12.5h4V17H8v-4.5Z"/></svg>;
const HTruck = () => <svg {...hsvp}><path d="M2 4.5h10v3H15l3 3.4v3.6h-1.7a2.1 2.1 0 0 1-4.2 0H8.2a2.1 2.1 0 0 1-4.2 0H2v-10Zm10 4.6v3h4.4l.1-.1-2.2-2.9H12ZM6.1 15.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm8.1 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"/></svg>;
const HWrench= () => <svg {...hsvp}><path d="M16.7 5.6a4.4 4.4 0 0 1-5.8 5.5L6 16l-2-2 4.9-4.9a4.4 4.4 0 0 1 5.5-5.8L11.9 5.8 14.2 8l2.5-2.4Z"/></svg>;
const FEATURES = [
  { icon:<HBox/>, title:"Inventar Inteligjent",  desc:"Gjurmo çdo ingredient, data skadimi dhe sasi. Alerte automatike kur diçka po skadon." },
  { icon:<HDish/>,  title:"Recetat e Rekomanduara", desc:"ML sugjeron receta bazuar në çfarë ke në frigorifer — zero humbje ushqimore." },
  { icon:<HCart/>,  title:"Lista Blerjeve",         desc:"Gjenero lista automatikisht nga planet e vakteve. Porosit direkt nga marketi." },
  { icon:<HChart/>,  title:"Raporte & Analitikë",    desc:"Shiko trendet e konsumimit, humbjen dhe kostot me grafiqe interaktive." },
  { icon:<HBrain/>,  title:"Machine Learning",       desc:"5 algoritme klasifikimi + regresion + clustering për parashikim rreziku." },
  { icon:<HBolt/>,  title:"Real-Time",              desc:"Notifikime live, status porosie dhe përditësime inventari pa refresh." },
];

const ROLES = [
  { icon:<HUser/>, role:"User",    color:"var(--accent)", desc:"Menaxho inventarin, recetat dhe porositë tua." },
  { icon:<HStore/>, role:"Manager", color:"var(--green)",  desc:"Prano ose refuzo porositë e marketit." },
  { icon:<HTruck/>, role:"Courier", color:"var(--amber)",  desc:"Merr dhe dorëzo porositë te klientët." },
  { icon:<HWrench/>, role:"Admin",   color:"var(--blue,#2563eb)", desc:"Kontroll i plotë i sistemit dhe përdoruesve." },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", fontFamily:"inherit" }}>

      {/* Navbar */}
      <nav style={{ position:"sticky", top:0, zIndex:50, background:"var(--surface)", borderBottom:"0.5px solid var(--border)", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,var(--accent),#f5a060)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:13 }}>SK</div>
          <span style={{ fontSize:15, fontWeight:700, color:"var(--text-1)" }}>Smart Kitchen</span>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>
          Kyçu →
        </button>
      </nav>

      {/* Hero */}
      <div style={{ padding:"64px 24px 48px", textAlign:"center", maxWidth:640, margin:"0 auto" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", background:"rgba(232,96,44,0.1)", border:"0.5px solid rgba(232,96,44,0.2)", borderRadius:100, fontSize:12, color:"var(--accent)", fontWeight:600, marginBottom:20 }}>
          Powered by Machine Learning
        </div>
        <h1 style={{ fontSize:42, fontWeight:800, letterSpacing:"-0.04em", color:"var(--text-1)", lineHeight:1.15, marginBottom:16 }}>
          Menaxho kuzhinën tënde<br />
          <span style={{ color:"var(--accent)" }}>me inteligjencë artificiale</span>
        </h1>
        <p style={{ fontSize:16, color:"var(--text-3)", lineHeight:1.7, marginBottom:28 }}>
          Smart Kitchen të ndihmon të zvogëlosh humbjen ushqimore, të planifikosh vaktet dhe të porositësh direkt nga marketi — gjithçka në një platformë.
        </p>
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
          <button className="btn btn-primary" style={{ fontSize:15, padding:"11px 28px" }} onClick={() => navigate("/login")}>
            Fillo tani →
          </button>
          <button className="btn btn-secondary" style={{ fontSize:15, padding:"11px 28px" }} onClick={() => document.getElementById("features")?.scrollIntoView({ behavior:"smooth" })}>
            Mëso më shumë ↓
          </button>
        </div>
      </div>

      {/* Features */}
      <div id="features" style={{ padding:"48px 24px", maxWidth:900, margin:"0 auto" }}>
        <p style={{ fontSize:11, fontWeight:600, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"center", marginBottom:8 }}>Funksionalitetet</p>
        <p style={{ fontSize:24, fontWeight:700, color:"var(--text-1)", textAlign:"center", letterSpacing:"-0.025em", marginBottom:32 }}>Çfarë ofron Smart Kitchen</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, padding:"18px 20px" }}>
              <p style={{ fontSize:28, marginBottom:10 }}>{f.icon}</p>
              <p style={{ fontSize:14, fontWeight:600, color:"var(--text-1)", marginBottom:6 }}>{f.title}</p>
              <p style={{ fontSize:12.5, color:"var(--text-3)", lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Roles */}
      <div style={{ padding:"0 24px 48px", maxWidth:900, margin:"0 auto" }}>
        <p style={{ fontSize:11, fontWeight:600, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"center", marginBottom:8 }}>Rolet</p>
        <p style={{ fontSize:24, fontWeight:700, color:"var(--text-1)", textAlign:"center", letterSpacing:"-0.025em", marginBottom:32 }}>Për çdo rol, eksperiencë e personalizuar</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
          {ROLES.map((r) => (
            <div key={r.role} style={{ background:"var(--surface)", border:`0.5px solid var(--border)`, borderTop:`2px solid ${r.color}`, borderRadius:12, padding:"18px 20px", textAlign:"center" }}>
              <p style={{ fontSize:32, marginBottom:8 }}>{r.icon}</p>
              <p style={{ fontSize:14, fontWeight:700, color:r.color, marginBottom:6 }}>{r.role}</p>
              <p style={{ fontSize:12, color:"var(--text-3)", lineHeight:1.5 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding:"32px 24px 64px", textAlign:"center" }}>
        <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:16, padding:"32px 24px", maxWidth:480, margin:"0 auto" }}>
          <p style={{ fontSize:20, fontWeight:700, color:"var(--text-1)", marginBottom:8 }}>Gati për të filluar?</p>
          <p style={{ fontSize:13, color:"var(--text-3)", marginBottom:20 }}>Kyçu me llogarinë tënde dhe fillo të menaxhosh kuzhinën tënde sot.</p>
          <button className="btn btn-primary" style={{ fontSize:14, padding:"11px 32px" }} onClick={() => navigate("/login")}>
            Kyçu tani →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:"0.5px solid var(--border)", padding:"16px 24px", textAlign:"center" }}>
        <p style={{ fontSize:12, color:"var(--text-3)" }}>Smart Kitchen & Marketplace — UBT Lab Course 2 · 2025–2026</p>
      </div>
    </div>
  );
}
