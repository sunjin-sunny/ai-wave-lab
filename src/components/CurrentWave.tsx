const items = [
  { label: 'Building', value: "Sunny's AI Wave Lab" },
  { label: 'Exploring', value: 'Vibe Coding' },
  { label: 'Learning', value: 'React + AI-assisted development' },
]

function CurrentWave() {
  return (
    <section id="current-wave" className="current-wave">
      <div className="container">
        <h2 className="section-heading">Current Wave</h2>
        <ul className="wave-list">
          {items.map((item) => (
            <li key={item.label} className="wave-list__row">
              <span className="wave-list__label">{item.label}</span>
              <span className="wave-list__value">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default CurrentWave
