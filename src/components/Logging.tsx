const entries = [
  { date: 'Aug 2026', text: 'Started AI Wave Lab.' },
  { date: 'Aug 2026', text: 'Built my first interactive D2C prototype with AI.' },
  { date: 'Next', text: 'Ship something people can actually use.' },
]

function Logging() {
  return (
    <section id="logbook" className="logbook">
      <div className="container">
        <h2 className="section-heading">Logging</h2>
        <p className="section-subtitle">Notes from the ride.</p>
        <ul className="log-list">
          {entries.map((entry, index) => (
            <li
              key={index}
              className={`log-list__row ${
                entry.date === 'Next' ? 'log-list__row--next' : ''
              }`}
            >
              <span className="log-list__date">{entry.date}</span>
              <span className="log-list__text">{entry.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Logging
