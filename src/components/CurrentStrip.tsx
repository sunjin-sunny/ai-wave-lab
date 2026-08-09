const items = [
  { label: 'Building', value: "Sunny's AI Wave Lab" },
  { label: 'Exploring', value: 'Vibe Coding' },
  { label: 'Learning', value: 'React + AI-assisted development' },
]

// A compact status band, not a section — this is where a visitor lands
// right after crossing the hero's wave, before anything else "begins."
function CurrentStrip() {
  return (
    <section
      id="current-wave"
      className="current-strip"
      aria-label="Current status"
    >
      <div className="container current-strip__inner">
        <span className="current-strip__now">
          <span className="current-strip__dot" aria-hidden="true" />
          Now
        </span>
        <ul className="current-strip__list">
          {items.map((item) => (
            <li key={item.label} className="current-strip__item">
              <span className="current-strip__label">{item.label}</span>
              <span className="current-strip__value">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default CurrentStrip
