// Skeleton loading — zëvendëso Spinner gjatë ngarkimit të listave

export function SkeletonRow({ cols = 4 }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:12, padding:"12px 16px", borderBottom:"0.5px solid var(--border)" }}>
      {Array(cols).fill(0).map((_,i) => (
        <div key={i} style={{ height:14, background:"var(--border)", borderRadius:5, animation:"sk-pulse 1.5s ease-in-out infinite", animationDelay:`${i*0.1}s` }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 2 }) {
  return (
    <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, padding:"16px 18px" }}>
      <div style={{ height:11, width:"35%", background:"var(--border)", borderRadius:4, marginBottom:10, animation:"sk-pulse 1.5s ease-in-out infinite" }} />
      <div style={{ height:26, width:"55%", background:"var(--border)", borderRadius:7, animation:"sk-pulse 1.5s ease-in-out infinite", animationDelay:"0.1s" }} />
      {lines > 1 && <div style={{ height:11, width:"70%", background:"var(--border)", borderRadius:4, marginTop:10, animation:"sk-pulse 1.5s ease-in-out infinite", animationDelay:"0.2s" }} />}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div>
      {/* Header */}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:12, padding:"9px 16px", borderBottom:"0.5px solid var(--border)" }}>
        {Array(cols).fill(0).map((_,i) => (
          <div key={i} style={{ height:10, background:"var(--border)", borderRadius:4, width:"60%", animation:"sk-pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
      {/* Rows */}
      {Array(rows).fill(0).map((_,r) => (
        <SkeletonRow key={r} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${count},1fr)`, gap:12 }}>
      {Array(count).fill(0).map((_,i) => (
        <SkeletonCard key={i} lines={1} />
      ))}
    </div>
  );
}
