// App shell — composition, scroll reveal, tweaks
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "oklch(0.8 0.12 85)",
  "headline": "engineer of…",
  "animations": true,
  "showNotes": true
}/*EDITMODE-END*/;

function useReveal(enabled) {
  React.useEffect(() => {
    if (!enabled) return;
    const els = document.querySelectorAll(".rv");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    document.documentElement.style.setProperty("--accent", t.accent);
    document.body.setAttribute("data-anim", t.animations ? "on" : "off");
    if (!t.animations) {
      document.querySelectorAll(".rv").forEach((el) => el.classList.add("in"));
    }
  }, [t.accent, t.animations]);

  useReveal(t.animations);

  const { SiteNav, Hero, Experience, Projects, Proof, Notes, Footer, Colophon,
    TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakColor } = window;

  return (
    <React.Fragment>
      <SiteNav />
      <Hero headline={t.headline === "systems by day…" ? "night" : "engineer"} />
      <Experience />
      <Projects />
      <Proof />
      {t.showNotes && <Notes />}
      <Footer />
      <Colophon />
      <TweaksPanel>
        <TweakSection label="Voice" />
        <TweakRadio
          label="Headline"
          value={t.headline}
          options={["engineer of…", "systems by day…"]}
          onChange={(v) => setTweak("headline", v)}
        />
        <TweakSection label="Theme" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["oklch(0.8 0.12 85)", "oklch(0.78 0.14 152)", "oklch(0.74 0.12 40)", "oklch(0.78 0.1 230)"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakSection label="Behavior" />
        <TweakToggle label="Scroll animations" value={t.animations} onChange={(v) => setTweak("animations", v)} />
        <TweakToggle label="Notes section" value={t.showNotes} onChange={(v) => setTweak("showNotes", v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
