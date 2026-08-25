// A living, welcoming backdrop: three big soft accent/graphite blobs that drift
// slowly behind the content. Pure CSS transforms, sits at z-0, ignores pointer
// events, and freezes under prefers-reduced-motion.
export default function Ambient() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="blob"
        style={{
          width: "46vw",
          height: "46vw",
          top: "-12vh",
          left: "-8vw",
          background: "radial-gradient(circle, var(--accent-glow), transparent 70%)",
          animation: "drift-a 22s ease-in-out infinite",
        }}
      />
      <div
        className="blob"
        style={{
          width: "40vw",
          height: "40vw",
          bottom: "-14vh",
          right: "-6vw",
          background: "radial-gradient(circle, rgba(120,110,255,0.14), transparent 70%)",
          animation: "drift-b 28s ease-in-out infinite",
        }}
      />
      <div
        className="blob"
        style={{
          width: "34vw",
          height: "34vw",
          top: "38%",
          left: "42%",
          background: "radial-gradient(circle, var(--accent-glow), transparent 72%)",
          animation: "drift-c 25s ease-in-out infinite",
          opacity: 0.7,
        }}
      />
    </div>
  );
}
