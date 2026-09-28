import { Helmet } from "react-helmet-async";

export default function Seo({
  title,
  description,
  noindex = false,
  ogTitle,
  ogDescription,
}) {
  const finalTitle = title ? `${title} · HireTire` : "HireTire — Resume Evaluation & Candidate Ranking";
  const finalDescription =
    description ||
    "AI-powered platform for placement-readiness scores, skill-gap analysis, personalized roadmaps, and automated recruiter candidate ranking.";

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta property="og:title" content={ogTitle || finalTitle} />
      <meta property="og:description" content={ogDescription || finalDescription} />
      <meta name="twitter:title" content={ogTitle || finalTitle} />
      <meta name="twitter:description" content={ogDescription || finalDescription} />
      {noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}
