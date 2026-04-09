import buyPhaseImage from "../assets/BuyPhase.png";
import inGamesImage from "../assets/inGames.png";
import "./overlay.css";

export default function Overlay() {
  return (
    <main className="overlay-page">
      <div className="overlay-page__header">
        <p className="overlay-page__eyebrow">Overlay Demo</p>
        <h1>Valorant Overlay Views</h1>
        <p className="overlay-page__intro">
          Preview the two overlay states below.
        </p>
      </div>

      <section className="overlay-gallery">
        <article className="overlay-card">
          <h2>In Game Phase</h2>
          <img src={inGamesImage} alt="In Game Phase overlay" />
        </article>

        <article className="overlay-card">
          <h2>Buy Phase</h2>
          <img src={buyPhaseImage} alt="Buy Phase overlay" />
        </article>
      </section>
    </main>
  );
}
