// ── Spinner ────────────────────────────────────────────────
export function Spinner({ center, size = "md" }) {
  const s = size === "sm" ? "w-4 h-4 border" : size === "lg" ? "w-10 h-10 border-2" : "w-7 h-7 border-2";
  const el = <div className={`${s} border-orange-500 border-t-transparent rounded-full animate-spin`} />;
  if (center) return <div className="flex items-center justify-center py-14">{el}</div>;
  return el;
}

export function Empty({ icon = "○", title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
      <div className="text-5xl mb-4 opacity-20 select-none">{icon}</div>
      <p className="text-[15px] font-semibold text-stone-500 dark:text-stone-500 mb-1">{title}</p>
      {sub && <p className="text-[13px] text-stone-400 dark:text-stone-600 mt-1">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Card({ title, sub, action, children, className = "" }) {
  return (
    <div className={`sk-card ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            {title && <p className="font-display text-[15px] font-semibold tracking-tight text-stone-900 dark:text-stone-100">{title}</p>}
            {sub && <p className="text-[12px] text-stone-400 dark:text-stone-600 mt-0.5">{sub}</p>}
          </div>
          {action && <div className="flex-shrink-0 ml-3">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, actions, wide }) {
  const modalFooter = footer || actions;
  return (
    <div className="sk-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sk-modal ${wide ? "max-w-2xl" : ""}`} style={{ animation: "slideUp .2s ease" }}>
        <div className="sk-modal-header">
          <p className="sk-modal-title">{title}</p>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-white/10 transition-all text-sm">✕</button>
        </div>
        <div className="sk-modal-body">{children}</div>
        {modalFooter && <div className="sk-modal-footer">{modalFooter}</div>}
      </div>
    </div>
  );
}

export function Badge({ variant = "stone", children, className = "" }) {
  const map = {
    orange:"badge-orange", green:"badge-green", amber:"badge-amber",
    red:"badge-red", stone:"badge-stone", blue:"badge-blue",
    copper:"badge-orange", sage:"badge-green", gold:"badge-amber",
    danger:"badge-red", ash:"badge-stone", olive:"badge-green",
  };
  return <span className={`badge ${map[variant] || "badge-stone"} ${className}`}>{children}</span>;
}

export function Progress({ value, max = 100, color = "#f97316" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="sk-progress">
      <div className="sk-progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="sk-tabs">
      {tabs.map((t) => (
        <button key={t.key} className={`sk-tab ${active === t.key ? "active" : ""}`} onClick={() => onChange(t.key)}>
          {t.icon && <span>{t.icon} </span>}{t.label}
        </button>
      ))}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Kërko...", style }) {
  return (
    <div className="sk-search" style={style}>
      <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button onClick={() => onChange("")} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 text-xs">✕</button>}
    </div>
  );
}

export function FormGroup({ label, children }) {
  return <div className="sk-form-group"><label className="sk-label">{label}</label>{children}</div>;
}
export function Input(props) { return <input className="sk-input" {...props} />; }
export function Select({ children, ...props }) { return <select className="sk-input" {...props}>{children}</select>; }
export function Textarea(props) { return <textarea className="sk-input" rows={4} {...props} />; }
export function FormRow({ children }) { return <div className="sk-form-row">{children}</div>; }
// ── Confirm Dialog ───────────────────────────────────────────
export function ConfirmModal({ title = "A je i sigurt?", message, confirmText = "Fshi", onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={{ background:"var(--surface)", border:"0.5px solid var(--border-2)", borderRadius:14, padding:"24px 28px", maxWidth:380, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.16)" }}>
        <p style={{ fontSize:15, fontWeight:700, color:"var(--text-1)", marginBottom:8 }}>{title}</p>
        {message && <p style={{ fontSize:13, color:"var(--text-3)", marginBottom:20, lineHeight:1.6 }}>{message}</p>}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button className="btn btn-secondary" onClick={onCancel}>Anulo</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
