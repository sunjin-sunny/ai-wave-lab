const entries = [
  { date: 'Aug 2026', text: 'Started AI Wave Lab.' },
  { date: 'Aug 2026', text: 'Built my first interactive D2C prototype with AI.' },
  { date: 'Next', text: 'Ship something people can actually use.' },
]

function Logbook() {
  return (
    <section id="logbook" className="logbook">
      <div className="container">
        <h2 className="section-heading">Logbook</h2>
        <p className="section-subtitle">
          Notes from building, learning, and experimenting.
        </p>
        <ul className="log-list">
          {entries.map((entry, index) => (
            <li key={index} className="log-list__row">
              <span className="log-list__date">{entry.date}</span>
              <span className="log-list__text">{entry.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Logbook
