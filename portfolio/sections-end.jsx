// Notes (writing), interactive Terminal, Footer — Abhinav Gupta portfolio
function Notes() {
  return (
    <section className="sec" id="notes" data-screen-label="Notes / Writing">
      <div className="wrap">
        <div className="sec-head rv">
          <h2>Notes</h2>
          <span className="cmd"><b>$</b> ls ~/writing</span>
        </div>
        <div className="rv">
          <div className="note-row">
            <span className="t">Consistent hashing, caches &amp; queues — notes on system design</span>
            <span className="d">coming soon</span>
          </div>
          <div className="note-row">
            <span className="t">What actually happens on a context switch</span>
            <span className="d">coming soon</span>
          </div>
          <div className="note-row">
            <span className="t">C++ OOP under the hood: vtables, RAII &amp; the rule of five</span>
            <span className="d">coming soon</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- interactive terminal ----------
const TERM_COMMANDS = {
  help: () =>
    "available commands:\n  whoami      — who is this guy\n  projects    — list featured projects\n  experience  — work history\n  education   — degrees\n  contact     — how to reach me\n  resume      — grab the pdf\n  clear       — clear the screen",
  whoami: () =>
    "Abhinav Gupta — software / ML engineer.\nM.Tech CS @ IIT Delhi ('27). 3+ yrs at American Express & Fractal.ai.",
  projects: () =>
    window.PORTFOLIO_DATA.projects.map((p) => `  ${p.id.padEnd(14)} ${p.title}`).join("\n"),
  experience: () =>
    window.PORTFOLIO_DATA.experience
      .map((x) => `  ${x.period.padEnd(22)} ${x.role}, ${x.company}`)
      .join("\n"),
  education: () =>
    window.PORTFOLIO_DATA.education.map((e) => `  ${e.period.padEnd(14)} ${e.degree}, ${e.school}`).join("\n"),
  contact: () =>
    "  email     abhinavrgupta98@gmail.com\n  github    github.com/rgabhi\n  linkedin  linkedin.com/in/abhinav-gupta01",
  resume: () => {
    window.open("Abhinav_Gupta_Resume.pdf", "_blank");
    return "opening Abhinav_Gupta_Resume.pdf ...";
  },
  ls: () => "experience.log  projects/  achievements.log  writing/  resume.pdf",
  sudo: () => "nice try.",
  hi: () => "hello! type `help` to look around.",
  hello: () => "hello! type `help` to look around.",
};

function Terminal() {
  const [history, setHistory] = React.useState([
    { cmd: "help", out: TERM_COMMANDS.help() },
  ]);
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef(null);
  const bodyRef = React.useRef(null);

  const run = (raw) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    if (cmd === "clear") { setHistory([]); return; }
    const fn = TERM_COMMANDS[cmd];
    setHistory((h) => [
      ...h,
      fn
        ? { cmd: raw, out: fn() }
        : { cmd: raw, out: `command not found: ${cmd} — try \`help\``, err: true },
    ]);
  };

  React.useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  return (
    <div className="term rv" onClick={() => inputRef.current && inputRef.current.focus()}>
      <div className="term-bar"><i></i><i></i><i></i><span className="t">abhinav@iitd — zsh — try `projects`</span></div>
      <div className="term-body" ref={bodyRef} style={{ maxHeight: 320, overflowY: "auto" }}>
        {history.map((h, i) => (
          <div key={i}>
            <p><span className="p">$</span> <span className="paper">{h.cmd}</span></p>
            <p className={h.err ? "e" : "o"}>{h.out}</p>
          </div>
        ))}
        <div className="term-in">
          <span className="p">$</span>
          <input
            ref={inputRef}
            value={value}
            placeholder="type a command…"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { run(value); setValue(""); }
            }}
            aria-label="terminal input"
          />
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const D = window.PORTFOLIO_DATA;
  return (
    <footer className="foot" id="contact" data-screen-label="Contact">
      <div className="wrap grid">
        <div>
          <p className="prompt dim rv" style={{ fontSize: 13, marginBottom: 22 }}>
            <span className="green">abhinav@iitd</span>:~$ ping me
          </p>
          <h2 className="rv"><a href={"mailto:" + D.email}>{D.email}</a></h2>
          <div className="links rv">
            <a className="g" href="https://github.com/rgabhi" target="_blank">github/rgabhi ↗</a>
            <a href="https://www.linkedin.com/in/abhinav-gupta01/" target="_blank">linkedin ↗</a>
            <a href="Abhinav_Gupta_Resume.pdf" target="_blank">résumé.pdf ↓</a>
          </div>
        </div>
        <Terminal />
      </div>
    </footer>
  );
}

function Colophon() {
  return (
    <div className="colo">
      <span>© 2026 Abhinav Gupta</span>
      <span>set in Newsreader & JetBrains Mono</span>
    </div>
  );
}

Object.assign(window, { Notes, Terminal, Footer, Colophon });
