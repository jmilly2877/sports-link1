import { PLAYERS, TEAMS, COLLEGE_ALIASES } from "./database.js";
import { TEAM_POPULARITY, PLAYER_FAME } from "./scoring.js";

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
    for (const c of getColleges(p)) { if (norm(c) === key) return c; }
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
  return { players: PLAYERS.length, teams: 92, colleges: colleges.size, numbers: numbers.size };
}

// ============================================================
//  DAILY CHALLENGE
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
  return DAILY_TEAMS[Math.abs(hash) % DAILY_TEAMS.length];
}

// ============================================================
//  RARITY SCORING
// ============================================================

function getTeamPop(teamName) {
  return TEAM_POPULARITY[teamName] || 3;
}

function getPlayerFame(playerName) {
  return PLAYER_FAME[playerName] || 3;
}

/**
 * Smart rarity scoring:
 *
 * TEAM → PLAYER:  player fame × team obscurity
 *   Tom Brady from Patriots = tier 1 × pop 1 = 4 pts
 *   Danny Amendola from Patriots = tier 3 × pop 1 = 12 pts  
 *   Deep cut from Kings = tier 5 × pop 4 = 80 pts
 *
 * PLAYER → TEAM:  team obscurity × 8
 *   Going to Yankees = pop 1 × 8 = 8 pts
 *   Going to Kings = pop 4 × 8 = 32 pts
 *
 * PLAYER → COLLEGE:  fewer players from that college = more points
 *   Alabama (many players) = ~5 pts
 *   Savannah State (1 player) = 100 pts
 *
 * PLAYER → NUMBER:  fewer players wearing it = more points
 *   #12 (many players) = ~8 pts
 *   #75 (rare) = 50+ pts
 *
 * COLLEGE → PLAYER:  player fame × college rarity
 * NUMBER → PLAYER:  player fame × number rarity
 */
export function getRarityScore(fromItem, fromType, toName, toType) {
  let points = 10; // default

  if (fromType === "team" && toType === "player") {
    // Player fame (1=icon, 5=deep cut) × team popularity (1=mega, 5=small)
    const fame = getPlayerFame(toName);
    const pop = getTeamPop(fromItem);
    points = fame * pop * 4;
  }

  else if (fromType === "player" && toType === "team") {
    // More obscure teams = more points
    const pop = getTeamPop(toName);
    points = pop * 8;
  }

  else if (fromType === "player" && toType === "college") {
    // Fewer players from this college = more points
    const collegePlayers = collegeToPlayers.get(norm(toName));
    const count = collegePlayers ? collegePlayers.length : 1;
    points = Math.round(100 / count);
    // Bonus: using college is a creative move
    points = Math.round(points * 1.3);
  }

  else if (fromType === "player" && toType === "number") {
    // Fewer players wearing this number = more points
    const numPlayers = numberToPlayers.get(toName);
    const count = numPlayers ? numPlayers.length : 1;
    points = Math.round(100 / count);
    // Bonus: using numbers is creative
    points = Math.round(points * 1.5);
  }

  else if (fromType === "college" && toType === "player") {
    // Player fame × college rarity
    const fame = getPlayerFame(toName);
    const collegePlayers = collegeToPlayers.get(norm(fromItem));
    const count = collegePlayers ? collegePlayers.length : 1;
    const collegeRarity = Math.round(50 / count);
    points = fame * 3 + collegeRarity;
  }

  else if (fromType === "number" && toType === "player") {
    // Player fame × number rarity
    const fame = getPlayerFame(toName);
    const numPlayers = numberToPlayers.get(fromItem);
    const count = numPlayers ? numPlayers.length : 1;
    const numRarity = Math.round(50 / count);
    points = fame * 3 + numRarity;
  }

  return Math.max(1, Math.min(100, points));
}
