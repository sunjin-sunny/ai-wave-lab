import './App.css'
import Nav from './components/Nav'
import Hero from './components/Hero'
import CurrentWave from './components/CurrentWave'
import Projects from './components/Projects'
import Logging from './components/Logging'
import About from './components/About'
import Footer from './components/Footer'

// Future easter-egg hook (not implemented yet): a quiet trigger — a key
// sequence, a hidden click target — could later reveal a small playful
// moment (pixel-art surf reference, a wave sweeping the screen). Any such
// addition should stay transform/CSS-driven and respect prefers-reduced-motion,
// same as the rest of the site's motion.

function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CurrentWave />
        <Projects />
        <Logging />
        <About />
      </main>
      <Footer />
    </>
  )
}

export default App
