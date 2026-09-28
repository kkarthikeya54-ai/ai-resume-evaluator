import MultiFileDropzone from "./MultiFileDropzone";
import Icon from "../ui/Icon";
import Magnetic from "../ui/Magnetic";

const ROLE_PRESETS = [
  {
    title: ["bolt", "Full-Stack Engineer"],
    rules: "Looking for a Full-Stack Software Engineer with 2+ years of experience in React, Node.js, and modern REST/GraphQL APIs. Must demonstrate strong understanding of responsive design, database architecture (PostgreSQL/MongoDB), and automated testing. Experience in agile development and CI/CD pipelines is preferred.",
    keywords: "React, Node.js, JavaScript, TypeScript, REST API, GraphQL, PostgreSQL, MongoDB, Git, Docker, CI/CD, Agile",
  },
  {
    title: ["bot", "AI / ML Engineer"],
    rules: "Seeking an AI/ML Engineer with hands-on experience in Python, PyTorch/TensorFlow, and Large Language Model (LLM) workflows. Candidates must show expertise in prompt engineering, RAG architectures, vector databases (Pinecone/Chroma), and model fine-tuning. Strong foundation in data preprocessing and algorithm optimization required.",
    keywords: "Python, PyTorch, TensorFlow, LLM, RAG, Vector DB, LangChain, Transformers, Machine Learning, Deep Learning, NLP",
  },
  {
    title: ["palette", "Frontend Specialist"],
    rules: "Searching for a Senior Frontend Developer specializing in React 19, TypeScript, and modern styling libraries (Tailwind CSS). Must have a strong eye for UI/UX details, web performance optimization, accessible HTML, and component design systems. Experience with WebGL, animations (Framer/AnimeJS), or micro-frontends is a huge plus.",
    keywords: "React, Next.js, TypeScript, Tailwind CSS, JavaScript, HTML5, CSS3, Webpack/Vite, UI/UX, Web Accessibility, Figma",
  },
  {
    title: ["settings", "Backend Architect"],
    rules: "Hiring a Backend Systems Architect with deep knowledge of microservices, distributed caching (Redis), message queues (Kafka/RabbitMQ), and cloud deployment (AWS/GCP). Candidate should be proficient in Go, Node.js, or Java with proven record in designing high-throughput, fault-tolerant database schemas.",
    keywords: "Node.js, Go, Python, Microservices, Redis, Kafka, PostgreSQL, Docker, Kubernetes, AWS, System Design, Distributed Systems",
  },
  {
    title: ["chart", "Data Analyst / Scientist"],
    rules: "Looking for a Data Analyst proficient in SQL, Python/R, and business intelligence dashboards (Tableau/Power BI). Must be able to extract insights from large datasets, perform statistical modeling, write complex queries, and communicate analytical findings effectively to cross-functional stakeholders.",
    keywords: "SQL, Python, Pandas, NumPy, Tableau, Power BI, Data Modeling, Statistical Analysis, ETL, Excel, Data Visualization",
  },
];

export default function HrConfigForm({
  rules,
  keywords,
  onRulesChange,
  onKeywordsChange,
  files,
  onFilesChange,
  onProcess,
  processing,
  expandedKeywords,
  disabled,
}) {
  const handleApplyPreset = (preset) => {
    onRulesChange(preset.rules);
    onKeywordsChange(preset.keywords);
  };

  const handleClear = () => {
    onRulesChange("");
    onKeywordsChange("");
  };

  return (
    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--theme-text)]">Post a Job &amp; Evaluate Resumes</h2>
          <p className="mt-1 text-sm text-[var(--theme-text-muted)] font-medium">
            Choose a quick role preset or write your custom criteria, upload candidate resumes, and let AI rank them.
          </p>
        </div>
        {(rules || keywords) && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-bold text-[var(--theme-text-muted)] hover:text-red-600 transition-colors"
          >
            ✕ Clear Criteria
          </button>
        )}
      </div>

      {/* Role Preset Quick Selectors */}
      <div>
        <span className="block text-xs font-extrabold uppercase tracking-wider text-primary-600 mb-2">
          <Icon name="bolt" className="h-3.5 w-3.5" /> 1-Click Role Presets
        </span>
        <div className="flex flex-wrap gap-2">
          {ROLE_PRESETS.map((preset) => (
            <button
              key={Array.isArray(preset.title) ? preset.title[1] : preset.title}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              disabled={disabled}
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]/7 px-3.5 py-2 text-xs font-bold text-[var(--theme-text-muted)] hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              {Array.isArray(preset.title) ? (<>
                <Icon name={preset.title[0]} className="h-3.5 w-3.5" /> {preset.title[1]}
              </>) : preset.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="hr-rules" className="block text-sm font-bold text-[var(--theme-text)]">
              Job Rules <span className="text-xs font-normal text-[var(--theme-text-muted)]">(evaluation criteria)</span>
            </label>
            <span className="text-xs font-mono font-semibold text-[var(--theme-text-muted)]">
              {rules.length} chars
            </span>
          </div>
          <textarea
            id="hr-rules"
            rows={6}
            disabled={disabled}
            value={rules}
            onChange={(e) => onRulesChange(e.target.value)}
            placeholder="e.g. Looking for a web developer with 2+ years of React experience, responsive design knowledge, and strong problem-solving. Must have worked in agile teams and be comfortable with REST APIs."
            className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/5 p-3.5 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)] font-medium resize-y focus:outline-none focus:border-primary-500 focus:bg-[var(--theme-card)] transition-all shadow-2xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="hr-keywords" className="block text-sm font-bold text-[var(--theme-text)]">
              Target Keywords <span className="text-xs font-normal text-[var(--theme-text-muted)]">(auto-expanded by AI)</span>
            </label>
            <span className="text-xs font-mono font-semibold text-[var(--theme-text-muted)]">
              {keywords.split(",").filter(Boolean).length} tags
            </span>
          </div>
          <textarea
            id="hr-keywords"
            rows={6}
            disabled={disabled}
            value={keywords}
            onChange={(e) => onKeywordsChange(e.target.value)}
            placeholder="e.g. React, HTML, CSS, JavaScript, REST API, Git, responsive design"
            className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/5 p-3.5 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)] font-medium resize-y focus:outline-none focus:border-primary-500 focus:bg-[var(--theme-card)] transition-all shadow-2xs"
          />
          {expandedKeywords?.length > 0 && (
            <p className="mt-2 text-xs text-[var(--theme-text-muted)] font-medium">
              <span className="font-bold text-primary-600">Auto-expanded:</span>{" "}
              {expandedKeywords.slice(0, 12).join(", ")}
              {expandedKeywords.length > 12 ? ` +${expandedKeywords.length - 12} more` : ""}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-[var(--theme-text)]">Candidate Resumes</label>
        <MultiFileDropzone files={files} onFilesChange={onFilesChange} />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Magnetic strength={0.22}>
          <button
          type="button"
          onClick={onProcess}
          disabled={disabled || processing}
          className="group/btn relative overflow-hidden rounded-2xl bg-primary-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-primary-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-600/25 transition-all flex items-center gap-2"
        >
          {processing ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Processing Resumes...
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5"><Icon name="bolt" className="h-4 w-4" />Process &amp; Rank Resumes</span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover/btn:animate-btn-sheen"
              />
            </>
          )}
        </button>
          </Magnetic>
        <span className="text-xs font-semibold text-[var(--theme-text-muted)]">
          Runs in parallel batches directly in browser — 100% private local processing.
        </span>
      </div>
    </section>
  );
}
