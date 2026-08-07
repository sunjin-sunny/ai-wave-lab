import './App.css'
import Nav from './components/Nav'
import Hero from './components/Hero'
import CurrentWave from './components/CurrentWave'
import Projects from './components/Projects'
import Logbook from './components/Logbook'
import About from './components/About'
import Footer from './components/Footer'

function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CurrentWave />
        <Projects />
        <Logbook />
        <About />
      </main>
      <Footer />
    </>
  )
}

export default App
