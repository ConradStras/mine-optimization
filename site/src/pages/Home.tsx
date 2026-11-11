import { Arrow, Bolt, Book, Drop, Spark } from '../components/Icons';
import { Term } from '../learn/Term';
import { useStore } from '../state/store';

/** The animated cross-section on the landing page. */
function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 560 460"
      role="img"
      aria-label="Cross-section of a mine shaft used as pumped storage"
    >
      <defs>
        <linearGradient id="h-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--hero-sky-top)" />
          <stop offset="1" stopColor="var(--hero-sky-bottom)" />
        </linearGradient>
        <linearGradient id="h-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--stratum-top)" />
          <stop offset="1" stopColor="var(--stratum-deep)" />
        </linearGradient>
        <linearGradient id="h-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--water-hi)" />
          <stop offset="1" stopColor="var(--water-deep)" />
        </linearGradient>
        <pattern
          id="h-hatch"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <path d="M0 0 V12" stroke="var(--rock-line)" strokeWidth="1" />
        </pattern>
        <clipPath id="h-clip">
          <rect width="560" height="460" rx="22" />
        </clipPath>
      </defs>
      <g clipPath="url(#h-clip)">
        <rect width="560" height="120" fill="url(#h-sky)" />
        <rect y="120" width="560" height="340" fill="url(#h-rock)" />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            y={120 + i * 85}
            width="560"
            height="85"
            fill="url(#h-hatch)"
            opacity={i % 2 ? 0.5 : 0.25}
          />
        ))}
        <rect y="117" width="560" height="5" fill="var(--grass)" />
        {/* Upper dam */}
        <path d="M30 120 L54 120 L76 150 L176 150 L198 120 L222 120 L222 160 L30 160 Z" fill="var(--earth)" />
        <path d="M54 120 L76 150 L176 150 L198 120 Z" fill="var(--void)" />
        <path className="hero-upper" d="M58 125 L194 125 L176 150 L76 150 Z" fill="url(#h-water)" />
        {/* Shaft */}
        <rect x="272" y="120" width="56" height="300" fill="var(--shaft)" />
        <g stroke="var(--headframe)" strokeWidth="4" fill="none" strokeLinejoin="round">
          <path d="M262 120 L288 30 L312 30 L338 120" />
          <path d="M270 90 L330 90 M278 60 L322 60 M262 120 L322 60 M338 120 L278 60" strokeWidth="2" />
          <path d="M312 30 L384 120" strokeWidth="3" />
          <circle cx="300" cy="26" r="9" strokeWidth="3" />
        </g>
        {/* Penstock */}
        <path
          d="M198 136 H292 V392 H352"
          stroke="var(--pipe-casing)"
          strokeWidth="14"
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M198 136 H292 V392 H352"
          stroke="var(--pipe)"
          strokeWidth="9"
          fill="none"
          strokeLinejoin="round"
        />
        <path
          className="hero-flow"
          d="M198 136 H292 V392 H352"
          stroke="var(--water-hi)"
          strokeWidth="4"
          fill="none"
          strokeLinejoin="round"
        />
        {/* Turbine */}
        <g transform="translate(372 392)">
          <circle r="24" fill="var(--machine)" stroke="var(--machine-edge)" strokeWidth="2" />
          <g className="hero-runner">
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path
                key={a}
                d="M0 0 C 4 -8, 9 -12, 16 -14"
                stroke="var(--accent)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                transform={`rotate(${a})`}
              />
            ))}
            <circle r="5" fill="var(--accent)" />
          </g>
        </g>
        <path d="M396 392 H430" stroke="var(--pipe-casing)" strokeWidth="14" />
        <path d="M396 392 H430" stroke="var(--pipe)" strokeWidth="9" />
        {/* Lower chamber */}
        <rect
          x="424"
          y="356"
          width="120"
          height="74"
          rx="22"
          fill="var(--void)"
          stroke="var(--liner)"
          strokeWidth="2.5"
        />
        <clipPath id="h-lower">
          <rect x="424" y="356" width="120" height="74" rx="22" />
        </clipPath>
        <rect
          className="hero-lower"
          x="424"
          y="400"
          width="120"
          height="40"
          fill="url(#h-water)"
          clipPath="url(#h-lower)"
        />
        {/* Power line */}
        <path
          className="hero-power"
          d="M372 368 V200 H470 V100"
          stroke="var(--accent)"
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="4 8"
        />
        <g transform="translate(470 92)">
          <circle r="16" fill="var(--panel)" stroke="var(--accent)" strokeWidth="2" />
          <path d="M2 -9 L-5 2 H1 L-2 9 L6 -2 H0 Z" fill="var(--accent)" />
        </g>
        {/* Dimension */}
        <g className="hero-dim">
          <line x1="20" x2="20" y1="140" y2="410" />
          <path d="M14 152 L20 140 L26 152 M14 398 L20 410 L26 398" fill="none" />
          <text x="30" y="282">
            head
          </text>
        </g>
      </g>
    </svg>
  );
}

const TOOLS = [
  {
    title: 'Pumped storage in a mine shaft',
    status: 'Live · Phase 1',
    live: true,
    body: 'Place reservoirs, pipes and pump-turbines in a cross-section of the mine. See power, energy, losses and capital cost update as you build.',
    icon: <Drop size={20} />,
  },
  {
    title: 'Cash flow & business case',
    status: 'Phase 2',
    body: 'A discounted cash flow model built from your layout: NPV, IRR, levelised cost of storage and sensitivity to tariffs and WACC.',
    icon: <Spark size={20} />,
  },
  {
    title: 'Solar, battery and hybrid storage',
    status: 'Phase 3',
    body: 'Model solar + battery, solar + pumped storage, and all three together, and find where each technology earns its keep.',
    icon: <Bolt size={20} />,
  },
  {
    title: 'Water hammer and heavy fluids',
    status: 'Phases 4–5',
    body: 'Pressure surges when valves shut, pipe ratings, and dense mineral fluids that store more energy in a smaller shaft.',
    icon: <Book size={20} />,
  },
];

export function Home() {
  const setGuideMode = useStore((s) => s.setGuideMode);
  const loadTemplate = useStore((s) => s.loadTemplate);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Engineering tools for mining</p>
          <h1>
            Turn a disused shaft into a <span className="grad">water battery</span>.
          </h1>
          <p className="lede">
            Build a pumped storage system in a cross-section of your mine. Watch water fall through the
            turbine, and weigh the engineering against the cost, live, with every number explained.
          </p>
          <div className="hero__cta">
            <a
              className="btn btn--primary btn--lg"
              href="#/pump-storage"
              onClick={() => setGuideMode('guided')}
              data-testid="start-guided"
            >
              Start the guided build <Arrow size={16} />
            </a>
            <a
              className="btn btn--ghost btn--lg"
              href="#/pump-storage"
              onClick={() => {
                setGuideMode('expert');
                loadTemplate('reversible');
              }}
            >
              Open a 26 MW example
            </a>
          </div>
          <p className="hero__note">
            New to the terms? Words like <Term id="grossHead">head</Term>,{' '}
            <Term id="headLoss">friction loss</Term> and{' '}
            <Term id="roundTripEfficiency">round-trip efficiency</Term> open a plain-language card wherever
            they appear.
          </p>
        </div>
        <div className="hero__art">
          <HeroArt />
        </div>
      </section>

      <section className="home__band">
        <div className="steps3">
          <div>
            <span className="steps3__n mono">01</span>
            <h3>Build</h3>
            <p>
              Drag reservoirs, pipes, valves and machines onto the mine. Depth on the canvas is real depth:
              head comes from where you put things.
            </p>
          </div>
          <div>
            <span className="steps3__n mono">02</span>
            <h3>Run</h3>
            <p>
              Press play to generate or pump. Reservoirs drain and fill, runners spin, and power, energy and
              duration update with every change.
            </p>
          </div>
          <div>
            <span className="steps3__n mono">03</span>
            <h3>Weigh up</h3>
            <p>
              Follow every kWh through the cycle, trace what drives each result, and see each component’s cost
              card add up to the capital cost.
            </p>
          </div>
        </div>
      </section>

      <section className="home__tools">
        <h2>The roadmap</h2>
        <div className="tool-cards">
          {TOOLS.map((t) => (
            <article key={t.title} className={`tool-card${t.live ? ' is-live' : ''}`}>
              <div className="tool-card__icon">{t.icon}</div>
              <span className={`badge${t.live ? ' badge--live' : ''}`}>{t.status}</span>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
              {t.live && (
                <a className="link" href="#/pump-storage">
                  Open the builder →
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>
          Physics and scope follow the technical note <em>Small Scale Pumped Storage Systems</em> (J A vB
          Strasheim, October 2026). Results are for early-stage evaluation, not design.
        </p>
      </footer>
    </div>
  );
}
