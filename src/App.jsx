import { useState, useRef, useEffect } from "react";
import { validateStartTeam, validateChainLink, getStats } from "./data/lookup.js";

const TYPE_LABELS = { team: "TEAM", player: "PLAYER", college: "COLLEGE", number: "NUMBER" };
const TYPE_COLORS = { team: "#ff4444", player: "#44aaff", college: "#ffaa00", number: "#44dd66" };
const TYPE_BG = { team: "rgba(255,68,68,0.08)", player: "rgba(68,170,255,0.08)", college: "rgba(255,170,0,0.08)", number: "rgba(68,221,102,0.08)" };
const TYPE_HINTS = {
  team: "Name a player who played on this team",
  player: "Name one of their teams, their college, or a jersey number",
  college: "Name a player who went to this school",
  number: "Name a player who wore this number",
};

function History({ history }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [history]);

  return (
    <div ref={ref} className="history-box">
      {history.map((item, i) => (
        <div key={i} className="history-item">
          <div className="history-link" style={{ borderLeft: `3px solid ${TYPE_COLORS[item.type]}` }}>
            <span className="history-badge" style={{ background: TYPE_COLORS[item.type] }}>
              {TYPE_LABELS[item.type]}
            </span>
            <span className="history-name" style={{ color: TYPE_COLORS[item.type] }}>{item.name}</span>
          </div>
          {i < history.length - 1 && <div className="chain-connector">
            <div className="chain-dot" />
            <div className="chain-line" />
            <div className="chain-dot" />
          </div>}
        </div>
      ))}
    </div>
  );
}

function Landing({ onStart }) {
  const stats = getStats();
  return (
    <div className="landing">
      <div className="logo-area">
        <div className="logo-icon">🔗</div>
        <h1 className="title">SPORTS<br/>LINK</h1>
      </div>
      <p className="tagline">Chain teams, players, colleges & numbers.<br/>How deep does your knowledge go?</p>

      <button className="start-btn" onClick={onStart}>
        <span className="start-btn-text">PLAY THE CHAIN GAME</span>
        <span className="start-btn-arrow">→</span>
      </button>

      <div className="example-box">
        <div className="example-label">EXAMPLE CHAIN</div>
        <div className="example-chain">
          <span className="ex" style={{background: TYPE_COLORS.team}}>Pittsburgh Steelers</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.player}}>Troy Polamalu</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.college}}>USC</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.player}}>Carson Palmer</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.team}}>Cincinnati Bengals</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.player}}>Joe Burrow</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.number}}>9</span>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat"><span className="stat-num">{stats.players}</span><span className="stat-label">PLAYERS</span></div>
        <div className="stat-divider" />
        <div className="stat"><span className="stat-num">{stats.teams}</span><span className="stat-label">TEAMS</span></div>
        <div className="stat-divider" />
        <div className="stat"><span className="stat-num">{stats.colleges}</span><span className="stat-label">COLLEGES</span></div>
      </div>

      <p className="league-tags">
        <span className="league-tag">NFL</span>
        <span className="league-tag">NBA</span>
        <span className="league-tag">MLB</span>
      </p>
    </div>
  );
}

function Game({ onBack }) {
  const [phase, setPhase] = useState("start");
  const [history, setHistory] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [currentType, setCurrentType] = useState(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [phase, error, history]);

  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
  };

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
      triggerFlash();
    } else {
      setError(result.explanation);
    }
  };

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
      triggerFlash();
    } else {
      setWrongAnswer({ answer: input.trim(), explanation: result.explanation });
      setGameOver(true);
    }
  };

  const giveUp = () => setGameOver(true);
  const reset = () => {
    setPhase("start"); setHistory([]); setCurrentItem(null);
    setCurrentType(null); setInput(""); setError(""); setGameOver(false); setWrongAnswer(null);
  };

  const activeColor = currentType ? TYPE_COLORS[currentType] : "#ff4444";
  const activeBg = currentType ? TYPE_BG[currentType] : "transparent";

  if (gameOver) {
    return (
      <div className="container">
        <div className="game-over-box">
          <div className="game-over-icon">{wrongAnswer ? "❌" : "🏁"}</div>
          <div className="game-over-title">GAME OVER</div>
          {wrongAnswer && (
            <div className="wrong-answer-box">
              <div className="wrong-answer-text">"{wrongAnswer.answer}"</div>
              <div className="wrong-answer-reason">{wrongAnswer.explanation}</div>
            </div>
          )}
          <div className="final-score-row">
            <span className="final-score">{history.length}</span>
            <span className="final-score-label">LINKS</span>
          </div>
          <History history={history} />
          <div className="btn-row">
            <button className="btn-primary" onClick={reset}>PLAY AGAIN</button>
            <button className="btn-secondary" onClick={onBack}>MENU</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <button className="back-btn" onClick={onBack}>← MENU</button>
        <div className="score-pill">
          <span className="score-pill-label">CHAIN</span>
          <span className="score-pill-num">{history.length}</span>
        </div>
      </div>

      {phase === "start" && (
        <div className="start-box">
          <div className="mode-title">START YOUR CHAIN</div>
          <p className="mode-desc">Pick any NFL, NBA, or MLB team to begin.</p>
          <div className="input-row">
            <input
              ref={inputRef}
              className="game-input"
              style={{ borderColor: "#ff4444", color: "#ff4444" }}
              placeholder="Enter a team..."
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && startGame()}
            />
            <button className="btn-submit" style={{ background: "#ff4444" }} onClick={startGame}>GO</button>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      )}

      {phase === "playing" && (
        <div className="play-box">
          <div className={`current-section ${flash ? "flash" : ""}`} style={{ borderColor: activeColor, background: activeBg }}>
            <div className="current-top-row">
              <span className="type-badge" style={{ background: activeColor }}>{TYPE_LABELS[currentType]}</span>
              <span className="current-label">CURRENT</span>
            </div>
            <div className="current-value" style={{ color: activeColor }}>{currentItem}</div>
            <div className="hint">{TYPE_HINTS[currentType]}</div>
          </div>

          {history.length > 0 && <History history={history} />}

          <div className="input-row">
            <input
              ref={inputRef}
              className="game-input"
              style={{ borderColor: activeColor, color: activeColor, background: activeBg }}
              placeholder="Your answer..."
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
            />
            <button className="btn-submit" style={{ background: activeColor }} onClick={submitAnswer}>→</button>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="give-up-btn" onClick={giveUp}>I'M STUCK — END GAME</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [playing, setPlaying] = useState(false);
  if (playing) return <Game onBack={() => setPlaying(false)} />;
  return <div className="container"><Landing onStart={() => setPlaying(true)} /></div>;
}
