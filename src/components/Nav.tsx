import Link from './Link'

function Nav() {
  return (
    <header className="site-nav">
      <div className="container site-nav__inner">
        <Link className="brand" href="/">
          <span className="brand__name">AI WAVE LAB</span>
          <span className="brand__by">by Sunny</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="nav-links">
            <li>
              <a href="#projects">Projects</a>
            </li>
            <li>
              <a href="#logbook">Logging</a>
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
