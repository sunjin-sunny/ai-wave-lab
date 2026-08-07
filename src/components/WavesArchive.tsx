import Link from './Link'

// Placeholder for the future full project archive at /projects. The
// homepage only ever shows a curated slice (see FEATURED_LIMIT in
// Projects.tsx) — this is an honest landing spot for "Explore all waves"
// until there's enough built to justify a real archive UI.
function WavesArchive() {
  return (
    <section className="project-detail">
      <div className="container">
        <Link href="/" className="text-link project-detail__back">
          ← Selected Waves
        </Link>
        <div className="project-detail__header">
          <h1 className="project-detail__title">All Waves</h1>
          <p className="project-detail__description">
            The full archive is still being charted. For now, the current
            selection lives on the homepage.
          </p>
        </div>
      </div>
    </section>
  )
}

export default WavesArchive
