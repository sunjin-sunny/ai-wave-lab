function Nav() {
  return (
    <header className="site-nav">
      <div className="container site-nav__inner">
        <a className="brand" href="#top">
          <span className="brand__name">AI WAVE LAB</span>
          <span className="brand__by">by Sunny</span>
        </a>
        <nav aria-label="Primary">
          <ul className="nav-links">
            <li>
              <a href="#projects">Projects</a>
            </li>
            <li>
              <a href="#logbook">Logbook</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Nav
