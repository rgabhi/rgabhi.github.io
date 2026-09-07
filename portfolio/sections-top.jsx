// Nav, Hero, Experience (+ education) — Abhinav Gupta portfolio
function SiteNav() {
  return (
    <nav className="nav">
      <div className="nav-in">
        <span className="nm" style={{ fontFamily: "Newsreader" }}>Abhinav Gupta</span>
        <div className="tabs">
          <a href="#work">[1] work</a>
          <a href="#projects">[2] projects</a>
          <a href="#proof">[3] proof</a>
          <a href="#notes">[4] notes</a>
          <a href="#contact">[5] contact</a>
          <a className="cv" href="Abhinav_Gupta_Resume.pdf" target="_blank">résumé ↓</a>
        </div>
      </div>
    </nav>);

}

function Hero({ headline }) {
  const D = window.PORTFOLIO_DATA;
  return (
    <header className="hero wrap" data-screen-label="Hero">
      <p className="prompt rv"><span className="green">abhinav@iitd</span><span className="dim">:~$</span> whoami</p>
      {headline === "night" ?
      <h1 className="rv">Systems by day,<br /><em>models</em> by night.</h1> :

      <h1 className="rv">Engineer of <em>systems</em><br />&amp; learned <em>models</em>.</h1>
      }
      <p className="out rv">
        <strong>Abhinav Gupta — software / ML engineer.</strong> M.Tech CS at <strong>IIT Delhi</strong>,
        previously engineering large-scale backend &amp; ML systems at <strong>American Express</strong> and{" "}
        <strong>Fractal.ai</strong>. Bytecode VMs in C, debuggers on ptrace, distributed systems over 10M+ records.
      </p>
      <div className="kv rv">
        <div><p className="k">status</p><span className="green"><span className="pulse"></span>open to internships</span></div>
        <div><p className="k">focus</p>systems · ml · vision</div>
        <div><p className="k">github</p><a href="https://github.com/rgabhi" target="_blank" className="paper">rgabhi ↗</a></div>
        <div><p className="k">location</p>new delhi, in</div>
      </div>
    </header>);

}

function Experience() {
  const D = window.PORTFOLIO_DATA;
  return (
    <section className="sec" id="work" data-screen-label="Experience">
      <div className="wrap">
        <div className="sec-head rv">
          <h2>Experience</h2>
          <span className="cmd"><b>$</b> cat experience.log</span>
        </div>
        {D.experience.map((xp) =>
        <div className="xp rv" key={xp.company}>
            <div>
              <p className="co">{xp.company}</p>
              <p className="role">{xp.role}</p>
              <p className="per">{xp.period} · {xp.location}</p>
              <div className="stack">
                {xp.stack.map((s) => <span className="chip" key={s}>{s}</span>)}
              </div>
            </div>
            <ul>{xp.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        )}
        <div className="edu-row rv">
          {D.education.map((e) =>
          <div key={e.school}>
              <p className="sch">{e.school}</p>
              <p>{e.degree} · {e.period}</p>
              <p className="dim" style={{ fontSize: 11.5 }}>{e.detail}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}

Object.assign(window, { SiteNav, Hero, Experience });