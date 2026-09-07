// Projects (filterable), Achievements + Skills — Abhinav Gupta portfolio
const ALL_PROJECTS = () => {
  const D = window.PORTFOLIO_DATA;
  return [
    ...D.projects,
    {
      id: "game-agent",
      title: "AI Game Agent — Stones & Rivers",
      domain: "Algorithms",
      stack: ["C++"],
      summary:
        "A high-performance Minimax agent with alpha-beta pruning and transposition tables — maximizing search depth under real-time constraints via Manhattan-distance territory control.",
      highlight: "Real-time α-β search",
      link: "github.com/rgabhi",
    },
    {
      id: "fingerprint",
      title: "Contactless Fingerprint Recognition",
      domain: "Computer Vision",
      stack: ["Python"],
      summary:
        "A contactless fingerprint recognition system — robust feature extraction, image enhancement, and a minutiae-matching pipeline.",
      highlight: "Minutiae matching",
      link: "github.com/rgabhi",
    },
  ];
};

const FILTERS = ["all", "systems", "ml / ai", "computer vision", "algorithms"];

function Projects() {
  const [filter, setFilter] = React.useState("all");
  const projects = React.useMemo(ALL_PROJECTS, []);
  const visible = projects.filter((p) => filter === "all" || p.domain.toLowerCase() === filter);
  return (
    <section className="sec" id="projects" data-screen-label="Projects">
      <div className="wrap">
        <div className="sec-head rv">
          <h2>Selected work</h2>
          <span className="cmd"><b>$</b> ls ~/projects --filter={filter.replace(/[ /]+/g, "-")}</span>
        </div>
        <div className="ftabs rv">
          {FILTERS.map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        {visible.map((p, i) => (
          <article className="case rv in" key={p.id}>
            <span className="idx">{String(i + 1).padStart(2, "0")} /</span>
            <div>
              <h3><a href={"https://" + p.link} target="_blank">{p.title}</a></h3>
              <p className="meta"><span className="d">{p.domain}</span> — {p.stack.join(" · ")}</p>
            </div>
            <div className="case-side">
              <p>{p.summary}</p>
              <span className="hl">★ {p.highlight} — <a href={"https://" + p.link} target="_blank">source ↗</a></span>
            </div>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="dim" style={{ padding: "32px 0" }}>// nothing here yet</p>
        )}
      </div>
    </section>
  );
}

function Proof() {
  const D = window.PORTFOLIO_DATA;
  return (
    <section className="sec" id="proof" data-screen-label="Achievements & Skills">
      <div className="wrap">
        <div className="sec-head rv">
          <h2>Proof of work</h2>
          <span className="cmd"><b>$</b> cat achievements.log</span>
        </div>
        <div className="rv">
          {D.achievements.map((a) => (
            <div className="ach-line" key={a.label}>
              <span className="stat">{a.stat}</span>
              <span className="l">{a.label}</span>
              <span className="d">{a.detail}</span>
            </div>
          ))}
        </div>
        <div className="skills rv">
          {D.skills.map((s) => (
            <div className="srow" key={s.group}>
              <span className="g">{s.group.toUpperCase().replace(/[ &]+/g, "_")}=</span>
              <span className="i">{s.items.join("  ")}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Projects, Proof });
