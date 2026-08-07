import { useEffect } from 'react'
import './App.css'
import Nav from './components/Nav'
import Hero from './components/Hero'
import CurrentWave from './components/CurrentWave'
import Projects from './components/Projects'
import Logging from './components/Logging'
import About from './components/About'
import Footer from './components/Footer'
import ProjectDetail from './components/ProjectDetail'
import WavesArchive from './components/WavesArchive'
import { usePathname } from './lib/router'

// Future easter-egg hook (not implemented yet): a quiet trigger — a key
// sequence, a hidden click target — could later reveal a small playful
// moment (pixel-art surf reference, a wave sweeping the screen). Any such
// addition should stay transform/CSS-driven and respect prefers-reduced-motion,
// same as the rest of the site's motion.

// Only one dynamic route exists so far: a project's slug after /projects/.
const PROJECT_ROUTE = /^\/projects\/([^/]+)\/?$/

function App() {
  const pathname = usePathname()
  const projectSlug = pathname.match(PROJECT_ROUTE)?.[1]
  const isWavesArchive = pathname === '/projects' || pathname === '/projects/'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Nav />
      <main>
        {projectSlug ? (
          <ProjectDetail slug={projectSlug} />
        ) : isWavesArchive ? (
          <WavesArchive />
        ) : (
          <>
            <Hero />
            <CurrentWave />
            <Projects />
            <Logging />
            <About />
          </>
        )}
      </main>
      <Footer />
    </>
  )
}

export default App
