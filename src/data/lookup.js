import { PLAYERS, TEAMS, COLLEGE_ALIASES } from "./database.js";

// ============================================================
//  BUILD INDEXES (runs once on load)
// ============================================================

// Normalize strings for matching
const norm = (s) => s.toLowerCase().trim();

// Team lookup: alias → canonical team name
const teamAliasMap = new Map();
const teamSet = new Set();

TEAMS.forEach((t) => {
  teamSet.add(norm(t.name));
  teamAliasMap.set(norm(t.name), t.name);
  t.aliases.forEach((a) => teamAliasMap.set(norm(a), t.name));
});

// Player lookup: normalized name → player object
// Also index by last name for partial matching
const playerByFullName = new Map();
const playersByLastName = new Map();
const playersByFirstName = new Map();

PLAYERS.forEach((p) => {
  const key = norm(p.name);
  playerByFullName.set(key, p);

  const parts = p.name.split(" ");
  if (parts.length >= 2) {
    const last = norm(parts[parts.length - 1]);
    const first = norm(parts[0]);
    if (!playersByLastName.has(last)) playersByLastName.set(last, []);
    playersByLastName.get(last).push(p);
    if (!playersByFirstName.has(first)) playersByFirstName.set(first, []);
    playersByFirstName.get(first).push(p);
  }
});

// Team → players index
const teamToPlayers = new Map();
PLAYERS.forEach((p) => {
  p.teams.forEach((t) => {
    const key = norm(t);
    if (!teamToPlayers.has(key)) teamToPlayers.set(key, []);
    teamToPlayers.get(key).push(p);
  });
});

// College → players index
const collegeToPlayers = new Map();
PLAYERS.forEach((p) => {
  if (p.college) {
    const key = norm(p.college);
    if (!collegeToPlayers.has(key)) collegeToPlayers.set(key, []);
    collegeToPlayers.get(key).push(p);
  }
});

// Number → players index
const numberToPlayers = new Map();
PLAYERS.forEach((p) => {
  p.numbers.forEach((n) => {
    const key = String(n);
    if (!numberToPlayers.has(key)) numberToPlayers.set(key, []);
    numberToPlayers.get(key).push(p);
  });
});

// ============================================================
//  PUBLIC API
// ============================================================

/**
 * Find a team by input string. Returns { name } or null.
 */
export function findTeam(input) {
  const key = norm(input);

  // Direct alias match
  if (teamAliasMap.has(key)) {
    return { name: teamAliasMap.get(key) };
  }

  // Check if input is contained in any team name
  for (const [teamNorm, teamName] of teamAliasMap) {
    if (teamNorm.includes(key) || key.includes(teamNorm)) {
      return { name: teamName };
    }
  }

  return null;
}

/**
 * Find a player by input string. Returns player object or null.
 */
export function findPlayer(input) {
  const key = norm(input);

  // Exact full name match
  if (playerByFullName.has(key)) {
    return playerByFullName.get(key);
  }

  // Try matching with flexible spacing/punctuation
  for (const [pKey, p] of playerByFullName) {
    if (pKey.replace(/[.\-']/g, "") === key.replace(/[.\-']/g, "")) {
      return p;
    }
  }

  // Last name match (if unique)
  if (playersByLastName.has(key)) {
    const matches = playersByLastName.get(key);
    if (matches.length === 1) return matches[0];
  }

  // Partial match: check if input contains enough of a player name
  const candidates = [];
  for (const [pKey, p] of playerByFullName) {
    if (pKey.includes(key) || key.includes(pKey)) {
      candidates.push(p);
    }
  }
  if (candidates.length === 1) return candidates[0];

  return null;
}

/**
 * Resolve a college input to canonical name. Returns string or null.
 */
export function findCollege(input) {
  const key = norm(input);

  // Direct alias match
  if (COLLEGE_ALIASES[key]) return COLLEGE_ALIASES[key];

  // Check if any college in the database matches
  for (const p of PLAYERS) {
    if (p.college && norm(p.college) === key) return p.college;
  }

  return null;
}

/**
 * Check if a string looks like a jersey number
 */
function isNumber(input) {
  return /^\d{1,2}$/.test(input.trim());
}

/**
 * Validate the starting team.
 * Returns { valid, corrected_name, explanation }
 */
export function validateStartTeam(input) {
  const team = findTeam(input);
  if (team) {
    // Check if any players exist for this team
    const players = teamToPlayers.get(norm(team.name));
    if (players && players.length > 0) {
      return { valid: true, corrected_name: team.name };
    }
    return { valid: false, explanation: `${team.name} is in the database but has no players yet. Try a more popular team.` };
  }
  return { valid: false, explanation: "Not recognized as an NFL, NBA, or MLB team. Check your spelling." };
}

/**
 * Validate a chain link.
 * Returns { valid, type, corrected_name, explanation }
 */
export function validateChainLink(currentItem, currentType, answer) {
  const input = answer.trim();

  if (currentType === "team") {
    // From a team → must name a player on that team
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };

    // Check if player played on this team
    const teamNorm = norm(currentItem);
    const played = player.teams.some((t) => {
      const tNorm = norm(t);
      return tNorm === teamNorm || teamAliasMap.get(teamNorm) === t || teamAliasMap.get(tNorm) === currentItem;
    });

    // Also check via alias resolution
    const resolvedCurrent = teamAliasMap.get(teamNorm) || currentItem;
    const playedResolved = player.teams.some((t) => t === resolvedCurrent);

    if (played || playedResolved) {
      return { valid: true, type: "player", corrected_name: player.name };
    }
    return { valid: false, explanation: `${player.name} didn't play for the ${currentItem} (at least not in our database).` };
  }

  if (currentType === "player") {
    const currentPlayer = findPlayer(currentItem);
    if (!currentPlayer) return { valid: false, explanation: "Internal error: current player not found." };

    // Option 1: a team they played on
    const team = findTeam(input);
    if (team) {
      const playedFor = currentPlayer.teams.some((t) => t === team.name);
      if (playedFor) {
        return { valid: true, type: "team", corrected_name: team.name };
      }
      return { valid: false, explanation: `${currentPlayer.name} didn't play for the ${team.name}.` };
    }

    // Option 2: a jersey number they wore
    if (isNumber(input)) {
      const num = parseInt(input);
      if (currentPlayer.numbers.includes(num)) {
        return { valid: true, type: "number", corrected_name: String(num) };
      }
      return { valid: false, explanation: `${currentPlayer.name} didn't wear #${num} (known numbers: ${currentPlayer.numbers.map(n => '#' + n).join(', ')}).` };
    }

    // Option 3: their college
    const college = findCollege(input);
    if (college) {
      if (currentPlayer.college && norm(currentPlayer.college) === norm(college)) {
        return { valid: true, type: "college", corrected_name: college };
      }
      if (currentPlayer.college) {
        return { valid: false, explanation: `${currentPlayer.name} went to ${currentPlayer.college}, not ${college}.` };
      }
      return { valid: false, explanation: `${currentPlayer.name} didn't attend college (or it's not in our database).` };
    }

    // Could be an unrecognized college name — check if current player's college matches
    if (currentPlayer.college && norm(currentPlayer.college) === norm(input)) {
      return { valid: true, type: "college", corrected_name: currentPlayer.college };
    }

    return { valid: false, explanation: `"${input}" — not recognized as a team, number, or college for ${currentPlayer.name}.` };
  }

  if (currentType === "college") {
    // From a college → must name a player who went there
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };

    const collegeName = findCollege(currentItem) || currentItem;
    if (player.college && norm(player.college) === norm(collegeName)) {
      return { valid: true, type: "player", corrected_name: player.name };
    }
    if (player.college) {
      return { valid: false, explanation: `${player.name} went to ${player.college}, not ${collegeName}.` };
    }
    return { valid: false, explanation: `${player.name} didn't attend college (or it's not in our database).` };
  }

  if (currentType === "number") {
    // From a number → must name a player who wore it
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };

    const num = parseInt(currentItem);
    if (player.numbers.includes(num)) {
      return { valid: true, type: "player", corrected_name: player.name };
    }
    return { valid: false, explanation: `${player.name} didn't wear #${currentItem} (known numbers: ${player.numbers.map(n => '#' + n).join(', ')}).` };
  }

  return { valid: false, explanation: "Something went wrong." };
}

/**
 * Get stats about the database
 */
export function getStats() {
  const colleges = new Set(PLAYERS.filter(p => p.college).map(p => p.college));
  const numbers = new Set(PLAYERS.flatMap(p => p.numbers));
  return {
    players: PLAYERS.length,
    teams: TEAMS.length,
    colleges: colleges.size,
    numbers: numbers.size,
  };
}
