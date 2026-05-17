import { useState, useRef, useEffect } from "react";
import { validateStartTeam, validateChainLink, getStats, getRarityScore, getDailyTeam } from "./data/lookup.js";

const TYPE_LABELS = { team: "TEAM", player: "PLAYER", college: "COLLEGE", number: "NUMBER" };
const TYPE_COLORS = { team: "#ff4444", player: "#44aaff", college: "#ffaa00", number: "#44dd66" };
const TYPE_BG = { team: "rgba(255,68,68,0.08)", player: "rgba(68,170,255,0.08)", college: "rgba(255,170,0,0.08)", number: "rgba(68,221,102,0.08)" };
const TYPE_HINTS = {
  team: "Name a player who played on this team",
  player: "Name one of their teams, their college, or a jersey number",
  college: "Name a player who went to this school",
  number: "Name a player who wore this number",
};
const TYPE_EMOJI = { team: "🔴", player: "🔵", college: "🟡", number: "🟢" };

function History({ history, showPoints }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [history]);
  return (
    <div ref={ref} className="history-box">
      {history.map((item, i) => (
        <div key={i} className="history-item">
          <div className="history-link" style={{ borderLeft: `3px solid ${TYPE_COLORS[item.type]}` }}>
            <span className="history-badge" style={{ background: TYPE_COLORS[item.type] }}>{TYPE_LABELS[item.type]}</span>
            <span className="history-name" style={{ color: TYPE_COLORS[item.type] }}>{item.name}</span>
            {showPoints && item.points > 0 && <span className="history-pts">+{item.points}</span>}
          </div>
          {i < history.length - 1 && <div className="chain-connector"><div className="chain-dot" /><div className="chain-line" /><div className="chain-dot" /></div>}
        </div>
      ))}
    </div>
  );
}

function Landing({ onFreePlay, onDaily }) {
  const stats = getStats();
  const dailyTeam = getDailyTeam();
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div className="landing">
      <div className="logo-area">
        <div className="logo-icon">🔗</div>
        <h1 className="title">SPORTS<br/>LINK</h1>
      </div>
      <p className="tagline">Chain teams, players, colleges & numbers.<br/>How deep does your knowledge go?</p>

      <div className="mode-buttons">
        <button className="mode-btn daily-btn" onClick={onDaily}>
          <div className="mode-btn-top">
            <span className="mode-btn-icon">📅</span>
            <span className="mode-btn-title">DAILY CHALLENGE</span>
          </div>
          <div className="mode-btn-desc">
            Today's team: <strong style={{color: TYPE_COLORS.team}}>{dailyTeam}</strong><br/>
            10 links max · Rarity scoring · Share your score
          </div>
          <div className="mode-btn-date">{today}</div>
        </button>
        <button className="mode-btn free-btn" onClick={onFreePlay}>
          <div className="mode-btn-top">
            <span className="mode-btn-icon">♾️</span>
            <span className="mode-btn-title">FREE PLAY</span>
          </div>
          <div className="mode-btn-desc">Pick any team. No limits. Go until you're stuck.</div>
        </button>
      </div>

      <div className="example-box">
        <div className="example-label">HOW IT WORKS</div>
        <div className="example-chain">
          <span className="ex" style={{background: TYPE_COLORS.team}}>Steelers</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.player}}>Polamalu</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.college}}>USC</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.player}}>Palmer</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.team}}>Bengals</span>
          <span className="ex-arrow">→</span>
          <span className="ex" style={{background: TYPE_COLORS.player}}>Burrow</span>
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

function Game({ onBack, isDaily }) {
  const dailyTeam = isDaily ? getDailyTeam() : null;
  const maxLinks = isDaily ? 10 : Infinity;

  const [phase, setPhase] = useState(isDaily ? "playing" : "start");
  const [history, setHistory] = useState(isDaily ? [{ name: dailyTeam, type: "team", points: 0 }] : []);
  const [currentItem, setCurrentItem] = useState(isDaily ? dailyTeam : null);
  const [currentType, setCurrentType] = useState(isDaily ? "team" : null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState(null);
  const [flash, setFlash] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [shared, setShared] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [phase, error, history]);
  const triggerFlash = () => { setFlash(true); setTimeout(() => setFlash(false), 400); };
  const linksUsed = history.length > 0 ? history.length - 1 : 0;
  const atLimit = isDaily && linksUsed >= maxLinks;

  const startGame = () => {
    if (!input.trim()) return;
    setError("");
    const result = validateStartTeam(input.trim());
    if (result.valid) {
      const name = result.corrected_name;
      setCurrentItem(name); setCurrentType("team");
      setHistory([{ name, type: "team", points: 0 }]);
      setPhase("playing"); setInput(""); triggerFlash();
    } else { setError(result.explanation); }
  };

  const submitAnswer = () => {
    if (!input.trim() || atLimit) return;
    setError("");
    const result = validateChainLink(currentItem, currentType, input.trim());
    if (result.valid) {
      const name = result.corrected_name;
      const type = result.type;
      const points = isDaily ? getRarityScore(currentItem, currentType, name, type) : 0;
      const newHistory = [...history, { name, type, points }];
      setHistory(newHistory); setCurrentItem(name); setCurrentType(type);
      setInput(""); setTotalScore(s => s + points); triggerFlash();
      if (isDaily && newHistory.length - 1 >= maxLinks) {
        setTimeout(() => setGameOver(true), 600);
      }
    } else {
      setWrongAnswer({ answer: input.trim(), explanation: result.explanation });
      setGameOver(true);
    }
  };

  const giveUp = () => setGameOver(true);

  const reset = () => {
    if (isDaily) {
      setHistory([{ name: dailyTeam, type: "team", points: 0 }]);
      setCurrentItem(dailyTeam); setCurrentType("team"); setPhase("playing");
    } else {
      setHistory([]); setCurrentItem(null); setCurrentType(null); setPhase("start");
    }
    setInput(""); setError(""); setGameOver(false);
    setWrongAnswer(null); setTotalScore(0); setShared(false);
  };

  const shareResult = async () => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const chain = history.map(h => TYPE_EMOJI[h.type]).join("");
    let text = `🔗 Sports Link ${isDaily ? "Daily" : "Free Play"} — ${today}\n\n`;
    text += `${chain}\n\n`;
    text += `${linksUsed} link${linksUsed !== 1 ? "s" : ""}`;
    if (isDaily) text += ` · ${totalScore} pts`;
    text += wrongAnswer ? ` ❌` : (isDaily && linksUsed >= maxLinks) ? ` ✅` : ` 🏁`;
    text += `\n\nsportslink1.vercel.app`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea"); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setShared(true); setTimeout(() => setShared(false), 2500);
  };

  const activeColor = currentType ? TYPE_COLORS[currentType] : "#ff4444";
  const activeBg = currentType ? TYPE_BG[currentType] : "transparent";

  if (gameOver) {
    const completed = isDaily && !wrongAnswer && linksUsed >= maxLinks;
    return (
      <div className="container">
        <div className="game-over-box">
          <div className="game-over-icon">{wrongAnswer ? "❌" : completed ? "🏆" : "🏁"}</div>
          <div className="game-over-title">{completed ? "COMPLETE!" : "GAME OVER"}</div>
          {wrongAnswer && (
            <div className="wrong-answer-box">
              <div className="wrong-answer-text">"{wrongAnswer.answer}"</div>
              <div className="wrong-answer-reason">{wrongAnswer.explanation}</div>
            </div>
          )}
          <div className="final-score-row">
            <span className="final-score">{linksUsed}</span>
            <span className="final-score-label">LINK{linksUsed !== 1 ? "S" : ""}</span>
            {isDaily && <>
              <span className="score-divider">·</span>
              <span className="final-score">{totalScore}</span>
              <span className="final-score-label">PTS</span>
            </>}
          </div>
          <History history={history} showPoints={isDaily} />
          <div className="btn-row">
            <button className="btn-share" onClick={shareResult}>{shared ? "✓ COPIED!" : "📋 SHARE RESULT"}</button>
          </div>
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
        <div className="score-area">
          {isDaily && (
            <div className="score-pill links-pill">
              <span className="score-pill-label">LINKS</span>
              <span className="score-pill-num" style={{color: linksUsed >= 8 ? "#ff6666" : "#e8e8e8"}}>{linksUsed}/{maxLinks}</span>
            </div>
          )}
          <div className="score-pill">
            <span className="score-pill-label">{isDaily ? "SCORE" : "CHAIN"}</span>
            <span className="score-pill-num">{isDaily ? totalScore : history.length}</span>
          </div>
        </div>
      </div>

      {phase === "start" && (
        <div className="start-box">
          <div className="mode-title">START YOUR CHAIN</div>
          <p className="mode-desc">Pick any NFL, NBA, or MLB team to begin.</p>
          <div className="input-row">
            <input ref={inputRef} className="game-input" style={{ borderColor: "#ff4444", color: "#ff4444" }}
              placeholder="Enter a team..." value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && startGame()} />
            <button className="btn-submit" style={{ background: "#ff4444" }} onClick={startGame}>GO</button>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      )}

      {phase === "playing" && (
        <div className="play-box">
          {isDaily && <div className="daily-banner">📅 DAILY CHALLENGE</div>}
          <div className={`current-section ${flash ? "flash" : ""}`} style={{ borderColor: activeColor, background: activeBg }}>
            <div className="current-top-row">
              <span className="type-badge" style={{ background: activeColor }}>{TYPE_LABELS[currentType]}</span>
              <span className="current-label">CURRENT</span>
            </div>
            <div className="current-value" style={{ color: activeColor }}>{currentItem}</div>
            <div className="hint">{TYPE_HINTS[currentType]}</div>
          </div>

          {history.length > 0 && <History history={history} showPoints={isDaily} />}

          {!atLimit && (
            <>
              <div className="input-row">
                <input ref={inputRef} className="game-input" style={{ borderColor: activeColor, color: activeColor, background: activeBg }}
                  placeholder="Your answer..." value={input}
                  onChange={(e) => { setInput(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submitAnswer()} />
                <button className="btn-submit" style={{ background: activeColor }} onClick={submitAnswer}>→</button>
              </div>
              {error && <div className="error">{error}</div>}
              {!isDaily && <button className="give-up-btn" onClick={giveUp}>I'M STUCK — END GAME</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  if (mode === "free") return <Game onBack={() => setMode(null)} isDaily={false} />;
  if (mode === "daily") return <Game onBack={() => setMode(null)} isDaily={true} />;
  return <div className="container"><Landing onFreePlay={() => setMode("free")} onDaily={() => setMode("daily")} /></div>;
}
