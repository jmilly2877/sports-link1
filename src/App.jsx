import { useState, useRef, useEffect } from "react";
import { validateStartTeam, validateChainLink, getStats } from "./data/lookup.js";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */
const TYPE_LABELS = { team: "TEAM", player: "PLAYER", college: "COLLEGE", number: "NUMBER" };
const TYPE_COLORS = { team: "#ff4444", player: "#44aaff", college: "#ffaa00", number: "#44dd66" };
const TYPE_HINTS = {
  team: "Name a player from this team",
  player: "Name a team, college, or jersey number",
  college: "Name a player from this school",
  number: "Name a player who wore this number",
};

/* ------------------------------------------------------------------ */
/*  History trail                                                     */
/* ------------------------------------------------------------------ */
function History({ history }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [history]);

  return (
    <div ref={ref} className="history-box">
      {history.map((item, i) => (
        <div key={i} className="history-item">
          <span className="history-badge" style={{ background: TYPE_COLORS[item.type] }}>
            {TYPE_LABELS[item.type]}
          </span>
          <span className="history-name">{item.name}</span>
          {i < history.length - 1 && <span className="arrow">→</span>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing screen                                                    */
/* ------------------------------------------------------------------ */
function Landing({ onStart }) {
  const stats = getStats();

  return (
    <div className="landing">
      <div className="logo-mark">⚡</div>
      <h1 className="title">SPORTS LINK</h1>
      <p className="subtitle">How deep is your sports knowledge?</p>

      <button className="mode-card" onClick={onStart}>
        <div className="mode-card-icon">🔗</div>
        <div className="mode-card-title">THE CHAIN GAME</div>
        <div className="mode-card-desc">
          Start with any NFL, NBA, or MLB team. Chain players → teams → colleges → jersey numbers.
          How long can you keep the chain going?
        </div>
      </button>

      <div className="example-box">
        <div className="example-label">EXAMPLE CHAIN</div>
        <div className="example-chain">
          <span className="ex team">Pittsburgh Steelers</span>
          <span className="arrow">→</span>
          <span className="ex player">Antonio Brown</span>
          <span className="arrow">→</span>
          <span className="ex team">Oakland Raiders</span>
          <span className="arrow">→</span>
          <span className="ex player">Randy Moss</span>
          <span className="arrow">→</span>
          <span className="ex college">Marshall</span>
          <span className="arrow">→</span>
          <span className="ex player">Barry Zito</span>
          <span className="arrow">→</span>
          <span className="ex number">75</span>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat">{stats.players} <span>PLAYERS</span></div>
        <div className="stat">{stats.teams} <span>TEAMS</span></div>
        <div className="stat">{stats.colleges} <span>COLLEGES</span></div>
      </div>

      <p className="footer">NFL · NBA · MLB — All eras welcome</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main game                                                         */
/* ------------------------------------------------------------------ */
function Game({ onBack }) {
  const [phase, setPhase] = useState("start"); // start | playing
  const [history, setHistory] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [currentType, setCurrentType] = useState(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [phase, error]);

  /* Start: validate the opening team */
  const startGame = () => {
    if (!input.trim()) return;
    setError("");

    const result = validateStartTeam(input.trim());
    if (result.valid) {
      const name = result.corrected_name;
      setCurrentItem(name);
      setCurrentType("team");
      setHistory([{ name, type: "team" }]);
      setPhase("playing");
      setInput("");
    } else {
      setError(result.explanation);
    }
  };

  /* Play: validate the next link */
  const submitAnswer = () => {
    if (!input.trim()) return;
    setError("");

    const result = validateChainLink(currentItem, currentType, input.trim());
    if (result.valid) {
      const name = result.corrected_name;
      const type = result.type;
      setHistory((h) => [...h, { name, type }]);
      setCurrentItem(name);
      setCurrentType(type);
      setInput("");
    } else {
      setError(result.explanation);
    }
  };

  const giveUp = () => setGameOver(true);

  const reset = () => {
    setPhase("start");
    setHistory([]);
    setCurrentItem(null);
    setCurrentType(null);
    setInput("");
    setError("");
    setGameOver(false);
  };

  /* ----- Game over screen ----- */
  if (gameOver) {
    return (
      <div className="container">
        <div className="game-over-box">
          <div className="game-over-title">GAME OVER</div>
          <div className="final-score">{history.length} LINKS</div>
          <History history={history} />
          <div className="btn-row">
            <button className="btn-primary" onClick={reset}>PLAY AGAIN</button>
            <button className="btn-secondary" onClick={onBack}>MENU</button>
          </div>
        </div>
      </div>
    );
  }

  /* ----- Active game ----- */
  return (
    <div className="container">
      <div className="header">
        <button className="back-btn" onClick={onBack}>← BACK</button>
        <div className="score-board">
          CHAIN: <span className="score-num">{history.length}</span>
        </div>
      </div>

      {phase === "start" && (
        <div className="start-box">
          <div className="mode-title">THE CHAIN GAME</div>
          <p className="mode-desc">
            Start with any NFL, NBA, or MLB team. Then chain players, teams,
            colleges, and jersey numbers together. How long can you go?
          </p>
          <div className="input-row">
            <input
              ref={inputRef}
              className="game-input"
              placeholder="Enter a team to start..."
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && startGame()}
            />
            <button className="btn-primary" onClick={startGame}>GO</button>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      )}

      {phase === "playing" && (
        <div className="play-box">
          <div className="current-section">
            <div className="current-label">CURRENT</div>
            <div className="current-value" style={{ color: TYPE_COLORS[currentType] }}>
              {currentItem}
            </div>
            <span className="type-badge-lg" style={{ background: TYPE_COLORS[currentType] }}>
              {TYPE_LABELS[currentType]}
            </span>
            <div className="hint">{TYPE_HINTS[currentType]}</div>
          </div>

          {history.length > 0 && <History history={history} />}

          <div className="input-row">
            <input
              ref={inputRef}
              className="game-input"
              placeholder="Your answer..."
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
            />
            <button className="btn-primary" onClick={submitAnswer}>→</button>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="give-up-btn" onClick={giveUp}>I'M STUCK — END GAME</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App shell                                                         */
/* ------------------------------------------------------------------ */
export default function App() {
  const [playing, setPlaying] = useState(false);

  if (playing) return <Game onBack={() => setPlaying(false)} />;
  return (
    <div className="container">
      <Landing onStart={() => setPlaying(true)} />
    </div>
  );
}
