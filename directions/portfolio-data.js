// Shared portfolio content, extracted from Abhinav's résumé.
window.PORTFOLIO_DATA = {
  name: "Abhinav Gupta",
  firstName: "Abhinav",
  lastName: "Gupta",
  role: "Software · ML Engineer",
  tagline: "M.Tech Computer Science @ IIT Delhi",
  positioning:
    "Software engineer across systems, backend, and machine learning — 3+ years shipping distributed, performance-critical software at American Express and Fractal.ai. Strong foundations in systems programming, algorithms, and ML.",
  shortBio:
    "I build systems that are fast, correct, and measured — from a bytecode VM in C to pipelines moving 10M+ records.",
  email: "abhinavrgupta98@gmail.com",
  github: "github.com/rgabhi",
  linkedin: "linkedin.com/in/abhinav-gupta01",
  location: "New Delhi, India",
  status: "Open to SDE / ML internships — Summer 2026",

  education: [
    {
      school: "IIT Delhi",
      degree: "M.Tech, Computer Science",
      period: "2025 — 2027",
      detail: "Graduate coursework in systems, algorithms & machine learning.",
    },
    {
      school: "IIT Guwahati",
      degree: "B.Tech",
      period: "2017 — 2021",
      detail: "CGPA 8.48 / 10 · Samsung Fellowship (top 10% of batch)",
    },
  ],

  experience: [
    {
      company: "American Express",
      role: "Software Engineer",
      period: "Dec 2024 — Jun 2025",
      location: "Gurgaon",
      stack: ["Python", "SQL", "PySpark", "Hadoop", "GCP"],
      points: [
        "Designed backend entity-resolution services unifying global prospect data — fuzzy-matching algorithms (Monge-Elkan, Jaro-Winkler) resolving identities with high accuracy across millions of records.",
        "Built end-to-end automation for campaign generation and suppression with risk & compliance checks baked in, replacing manual, error-prone handoffs.",
      ],
    },
    {
      company: "Fractal.ai",
      role: "Software Engineer — Distributed Systems",
      period: "Aug 2021 — Dec 2024",
      location: "Bengaluru",
      stack: ["Python", "PySpark", "Azure", "Databricks"],
      points: [
        "Engineered a high-throughput distributed processing system over 10M+ records — 75% runtime reduction through concurrency, caching, and partition-aware execution.",
        "Took dashboard queries from minutes to sub-seconds via query-plan redesign, optimized indexing, and storage-schema restructuring for a portfolio-optimization platform.",
        "Designed a global product-ranking algorithm evaluating SKU performance at scale; recognised with the Star Award in 2022 & 2023.",
      ],
    },
  ],

  projects: [
    {
      id: "shell-vm",
      title: "Mini UNIX Shell & Bytecode VM",
      domain: "Systems",
      stack: ["C", "Linux API"],
      summary:
        "A UNIX command-line interpreter with a custom tokenizer, pipes & I/O redirection via dup2 — plus a stack-based bytecode VM with its own assembler and garbage collector.",
      highlight: "Custom GC in pure C",
      link: "github.com/rgabhi",
    },
    {
      id: "debugger",
      title: "Linux Process Debugger",
      domain: "Systems",
      stack: ["C++", "ptrace"],
      summary:
        "A native Linux debugger built on the ptrace syscall — breakpoint management, register inspection, and single-step execution flow.",
      highlight: "Built on raw ptrace",
      link: "github.com/rgabhi",
    },
    {
      id: "protein-ann",
      title: "Protein Toxicity Predictor",
      domain: "ML / AI",
      stack: ["Python", "TensorFlow", "Keras"],
      summary:
        "End-to-end ingestion and feature-engineering pipeline over ~42K UniProtKB proteins for drug design; multi-layer ANN reaching ~93% validation accuracy.",
      highlight: "93% val. accuracy",
      link: "github.com/rgabhi",
    },
    {
      id: "ar-tags",
      title: "AR Tag Detection",
      domain: "Computer Vision",
      stack: ["Python", "NumPy"],
      summary:
        "Detects and overlays 3D objects on AR tags — contour detection, homography, and perspective warping implemented entirely from scratch, no OpenCV core calls.",
      highlight: "CV math from scratch",
      link: "github.com/rgabhi",
    },
  ],

  moreProjects: [
    {
      title: "AI Game Agent — Stones & Rivers",
      stack: "C++ · Minimax, α-β pruning, transposition tables",
    },
    {
      title: "Contactless Fingerprint Recognition",
      stack: "Python · minutiae matching pipeline",
    },
  ],

  achievements: [
    { stat: "800+", label: "DSA problems solved", detail: "LeetCode & Scaler — arrays, graphs, DP, trees" },
    { stat: "×2", label: "Star Award, Fractal.ai", detail: "Best performance & client appreciation, '22 & '23" },
    { stat: "Top 3%", label: "JEE Advanced 2017", detail: "All-India rank among 2.2 lakh candidates" },
    { stat: "2021", label: "Samsung Fellowship", detail: "Merit scholarship, top 10% of batch at IITG" },
    { stat: "1st", label: "CodeAsylums Hackathon", detail: "Web-dev hackathon, first place" },
  ],

  skills: [
    { group: "Languages", items: ["Python", "C", "C++", "SQL", "Java"] },
    { group: "Core CS", items: ["DSA", "System Design", "OS", "DBMS", "OOP"] },
    { group: "ML & Data", items: ["TensorFlow", "Keras", "OpenCV", "PySpark", "Hadoop"] },
    { group: "Tools", items: ["Git", "Linux", "Vim", "Azure", "Databricks"] },
  ],
};
