import { PLAYERS, TEAMS, COLLEGE_ALIASES } from "./database.js";

const norm = (s) => s.toLowerCase().trim();

function getColleges(player) {
  if (!player.college) return [];
  if (Array.isArray(player.college)) return player.college;
  return [player.college];
}

// ============================================================
//  BUILD INDEXES
// ============================================================
const teamAliasMap = new Map();
TEAMS.forEach((t) => {
  teamAliasMap.set(norm(t.name), t.name);
  t.aliases.forEach((a) => { if (a) teamAliasMap.set(norm(a), t.name); });
});

const playerByFullName = new Map();
const playersByLastName = new Map();
PLAYERS.forEach((p) => {
  const key = norm(p.name);
  playerByFullName.set(key, p);
  const parts = p.name.split(" ");
  if (parts.length >= 2) {
    const last = norm(parts[parts.length - 1]);
    if (!playersByLastName.has(last)) playersByLastName.set(last, []);
    playersByLastName.get(last).push(p);
  }
});

const teamToPlayers = new Map();
PLAYERS.forEach((p) => {
  p.teams.forEach((t) => {
    const key = norm(t);
    if (!teamToPlayers.has(key)) teamToPlayers.set(key, []);
    teamToPlayers.get(key).push(p);
  });
});

const collegeToPlayers = new Map();
PLAYERS.forEach((p) => {
  getColleges(p).forEach((c) => {
    const key = norm(c);
    if (!collegeToPlayers.has(key)) collegeToPlayers.set(key, []);
    collegeToPlayers.get(key).push(p);
  });
});

const numberToPlayers = new Map();
PLAYERS.forEach((p) => {
  p.numbers.forEach((n) => {
    const key = String(n);
    if (!numberToPlayers.has(key)) numberToPlayers.set(key, []);
    numberToPlayers.get(key).push(p);
  });
});

// ============================================================
//  FIND FUNCTIONS
// ============================================================
export function findTeam(input) {
  const key = norm(input);
  if (teamAliasMap.has(key)) return { name: teamAliasMap.get(key) };
  return null;
}

export function findPlayer(input) {
  const key = norm(input);
  if (playerByFullName.has(key)) return playerByFullName.get(key);
  const stripped = key.replace(/[.\-']/g, "");
  for (const [pKey, p] of playerByFullName) {
    if (pKey.replace(/[.\-']/g, "") === stripped) return p;
  }
  if (playersByLastName.has(key)) {
    const matches = playersByLastName.get(key);
    if (matches.length === 1) return matches[0];
  }
  const candidates = [];
  for (const [pKey, p] of playerByFullName) {
    if (pKey.includes(key) || key.includes(pKey)) candidates.push(p);
  }
  if (candidates.length === 1) return candidates[0];
  return null;
}

export function findCollege(input) {
  const key = norm(input);
  if (COLLEGE_ALIASES[key]) return COLLEGE_ALIASES[key];
  for (const p of PLAYERS) {
    for (const c of getColleges(p)) {
      if (norm(c) === key) return c;
    }
  }
  return null;
}

function isNumber(input) { return /^\d{1,2}$/.test(input.trim()); }

// ============================================================
//  VALIDATION
// ============================================================
export function validateStartTeam(input) {
  const team = findTeam(input);
  if (team) {
    const players = teamToPlayers.get(norm(team.name));
    if (players && players.length > 0) return { valid: true, corrected_name: team.name };
    return { valid: false, explanation: `${team.name} is in the database but has no players yet.` };
  }
  return { valid: false, explanation: "Not recognized as an NFL, NBA, or MLB team." };
}

export function validateChainLink(currentItem, currentType, answer) {
  const input = answer.trim();

  if (currentType === "team") {
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };
    const resolvedCurrent = teamAliasMap.get(norm(currentItem)) || currentItem;
    const played = player.teams.some((t) => t === resolvedCurrent || teamAliasMap.get(norm(t)) === resolvedCurrent);
    if (played) return { valid: true, type: "player", corrected_name: player.name };
    return { valid: false, explanation: `${player.name} didn't play for the ${currentItem}.` };
  }

  if (currentType === "player") {
    const currentPlayer = findPlayer(currentItem);
    if (!currentPlayer) return { valid: false, explanation: "Current player not found." };

    if (isNumber(input)) {
      const num = parseInt(input);
      if (currentPlayer.numbers.includes(num)) return { valid: true, type: "number", corrected_name: String(num) };
      return { valid: false, explanation: `${currentPlayer.name} didn't wear #${num} (known: ${currentPlayer.numbers.map(n => '#' + n).join(', ')}).` };
    }

    const playerColleges = getColleges(currentPlayer);
    for (const c of playerColleges) {
      if (norm(c) === norm(input)) return { valid: true, type: "college", corrected_name: c };
    }
    const resolvedCollege = findCollege(input);
    if (resolvedCollege) {
      const matchesPlayer = playerColleges.some((c) => norm(c) === norm(resolvedCollege));
      if (matchesPlayer) return { valid: true, type: "college", corrected_name: resolvedCollege };
    }

    const team = findTeam(input);
    if (team) {
      const playedFor = currentPlayer.teams.some((t) => t === team.name);
      if (playedFor) return { valid: true, type: "team", corrected_name: team.name };
      return { valid: false, explanation: `${currentPlayer.name} didn't play for the ${team.name}.` };
    }

    if (resolvedCollege) {
      const collegeList = playerColleges.length > 0 ? playerColleges.join(" and ") : "no college (or not in database)";
      return { valid: false, explanation: `${currentPlayer.name} went to ${collegeList}, not ${resolvedCollege}.` };
    }

    if (playerColleges.length > 0) {
      for (const c of playerColleges) {
        if (norm(c).includes(norm(input)) || norm(input).includes(norm(c))) {
          return { valid: true, type: "college", corrected_name: c };
        }
      }
    }

    return { valid: false, explanation: `"${input}" — not recognized as a team, number, or college for ${currentPlayer.name}.` };
  }

  if (currentType === "college") {
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };
    const collegeName = findCollege(currentItem) || currentItem;
    const attended = getColleges(player).some((c) => norm(c) === norm(collegeName));
    if (attended) return { valid: true, type: "player", corrected_name: player.name };
    const pc = getColleges(player);
    if (pc.length > 0) return { valid: false, explanation: `${player.name} went to ${pc.join(" and ")}, not ${collegeName}.` };
    return { valid: false, explanation: `${player.name} didn't attend college (or it's not in our database).` };
  }

  if (currentType === "number") {
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };
    const num = parseInt(currentItem);
    if (player.numbers.includes(num)) return { valid: true, type: "player", corrected_name: player.name };
    return { valid: false, explanation: `${player.name} didn't wear #${currentItem} (known: ${player.numbers.map(n => '#' + n).join(', ')}).` };
  }

  return { valid: false, explanation: "Something went wrong." };
}

// ============================================================
//  STATS
// ============================================================
export function getStats() {
  const colleges = new Set();
  PLAYERS.forEach(p => getColleges(p).forEach(c => colleges.add(c)));
  const numbers = new Set(PLAYERS.flatMap(p => p.numbers));
  return { players: PLAYERS.length, teams: TEAMS.length, colleges: colleges.size, numbers: numbers.size };
}

// ============================================================
//  DAILY CHALLENGE — deterministic team from date
// ============================================================
const DAILY_TEAMS = TEAMS.filter(t => {
  const players = teamToPlayers.get(norm(t.name));
  return players && players.length >= 5;
}).map(t => t.name);

export function getDailyTeam() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DAILY_TEAMS.length;
  return DAILY_TEAMS[idx];
}

// ============================================================
//  RARITY SCORING
// ============================================================
/**
 * Score how "rare" a chain link is.
 * Fewer alternatives = more points.
 *
 * From TEAM → PLAYER: fewer players on that team = more points
 * From PLAYER → TEAM: fewer teams they played on = more points
 * From PLAYER → COLLEGE: fewer players from that college = more points
 * From PLAYER → NUMBER: fewer players who wore that number = more points
 * From COLLEGE → PLAYER: fewer players from that college = more points
 * From NUMBER → PLAYER: fewer players who wore that number = more points
 */
export function getRarityScore(fromItem, fromType, toName, toType) {
  let alternatives = 1;

  if (fromType === "team" && toType === "player") {
    const players = teamToPlayers.get(norm(fromItem));
    alternatives = players ? players.length : 1;
  }
  else if (fromType === "player" && toType === "team") {
    const player = findPlayer(fromItem);
    alternatives = player ? player.teams.length : 1;
  }
  else if (fromType === "player" && toType === "college") {
    const collegePlayers = collegeToPlayers.get(norm(toName));
    alternatives = collegePlayers ? collegePlayers.length : 1;
    // Bonus: choosing college over team is creative
    alternatives = Math.max(1, alternatives - 1);
  }
  else if (fromType === "player" && toType === "number") {
    const numPlayers = numberToPlayers.get(toName);
    alternatives = numPlayers ? numPlayers.length : 1;
    // Bonus: numbers are creative plays
    alternatives = Math.max(1, alternatives - 2);
  }
  else if (fromType === "college" && toType === "player") {
    const players = collegeToPlayers.get(norm(fromItem));
    alternatives = players ? players.length : 1;
  }
  else if (fromType === "number" && toType === "player") {
    const players = numberToPlayers.get(fromItem);
    alternatives = players ? players.length : 1;
  }

  // Score: fewer alternatives = more points
  // 1 alternative (only option) = 100 pts
  // 2 = 50, 3 = 33, 5 = 20, 10 = 10, 20 = 5, 50+ = 2
  if (alternatives <= 0) alternatives = 1;
  const raw = Math.round(100 / alternatives);
  return Math.max(1, Math.min(100, raw));
}
