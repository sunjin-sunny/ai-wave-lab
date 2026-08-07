function Hero() {
  return (
    <section id="top" className="hero">
      <div className="container hero__content">
        <h1 className="hero__headline">
          Ride the
          <br />
          Next Wave.
        </h1>
        <p className="hero__lede">
          Ideas, experiments,
          <br />
          and products built with AI.
        </p>
        <p className="hero__intro">
          A Product Manager exploring what happens
          <br />
          when curiosity meets AI.
        </p>
      </div>
      <div className="wave-visual" aria-hidden="true">
        <div className="wave-layer wave-layer--back" />
        <div className="wave-layer wave-layer--mid" />
        <div className="wave-layer wave-layer--front" />
      </div>
    </section>
  )
}

export default Hero
