import { PLAYERS, TEAMS, COLLEGE_ALIASES } from "./database.js";

// ============================================================
//  HELPERS
// ============================================================
const norm = (s) => s.toLowerCase().trim();

// Support college as string, array, or null → always returns array
function getColleges(player) {
  if (!player.college) return [];
  if (Array.isArray(player.college)) return player.college;
  return [player.college];
}

// ============================================================
//  BUILD INDEXES
// ============================================================

// Team alias → canonical name (exact matches only)
const teamAliasMap = new Map();
TEAMS.forEach((t) => {
  teamAliasMap.set(norm(t.name), t.name);
  t.aliases.forEach((a) => {
    if (a) teamAliasMap.set(norm(a), t.name);
  });
});

// Player indexes
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

// Team → players
const teamToPlayers = new Map();
PLAYERS.forEach((p) => {
  p.teams.forEach((t) => {
    const key = norm(t);
    if (!teamToPlayers.has(key)) teamToPlayers.set(key, []);
    teamToPlayers.get(key).push(p);
  });
});

// College → players
const collegeToPlayers = new Map();
PLAYERS.forEach((p) => {
  getColleges(p).forEach((c) => {
    const key = norm(c);
    if (!collegeToPlayers.has(key)) collegeToPlayers.set(key, []);
    collegeToPlayers.get(key).push(p);
  });
});

// Number → players
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

/**
 * Find a team by input. Uses STRICT matching — must match an alias exactly.
 * No loose substring matching (prevents "Oklahoma" → "Oklahoma City Thunder").
 */
export function findTeam(input) {
  const key = norm(input);
  if (teamAliasMap.has(key)) {
    return { name: teamAliasMap.get(key) };
  }
  return null;
}

/**
 * Find a player by input.
 */
export function findPlayer(input) {
  const key = norm(input);

  // Exact full name
  if (playerByFullName.has(key)) return playerByFullName.get(key);

  // Flexible punctuation
  const stripped = key.replace(/[.\-']/g, "");
  for (const [pKey, p] of playerByFullName) {
    if (pKey.replace(/[.\-']/g, "") === stripped) return p;
  }

  // Unique last name match
  if (playersByLastName.has(key)) {
    const matches = playersByLastName.get(key);
    if (matches.length === 1) return matches[0];
  }

  // Partial match (must be unique)
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
 * Resolve a college input to canonical name.
 */
export function findCollege(input) {
  const key = norm(input);

  // Direct alias match
  if (COLLEGE_ALIASES[key]) return COLLEGE_ALIASES[key];

  // Check if any college in the database matches directly
  for (const p of PLAYERS) {
    for (const c of getColleges(p)) {
      if (norm(c) === key) return c;
    }
  }

  return null;
}

function isNumber(input) {
  return /^\d{1,2}$/.test(input.trim());
}

// ============================================================
//  VALIDATION
// ============================================================

export function validateStartTeam(input) {
  const team = findTeam(input);
  if (team) {
    const players = teamToPlayers.get(norm(team.name));
    if (players && players.length > 0) {
      return { valid: true, corrected_name: team.name };
    }
    return { valid: false, explanation: `${team.name} is in the database but has no players yet.` };
  }
  return { valid: false, explanation: "Not recognized as an NFL, NBA, or MLB team." };
}

/**
 * Validate a chain link. Key fix: when coming from a PLAYER,
 * check college FIRST to avoid "Oklahoma" matching OKC Thunder.
 */
export function validateChainLink(currentItem, currentType, answer) {
  const input = answer.trim();

  // ---- FROM TEAM: must name a player on that team ----
  if (currentType === "team") {
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };

    const resolvedCurrent = teamAliasMap.get(norm(currentItem)) || currentItem;
    const played = player.teams.some((t) => t === resolvedCurrent || teamAliasMap.get(norm(t)) === resolvedCurrent);

    if (played) return { valid: true, type: "player", corrected_name: player.name };
    return { valid: false, explanation: `${player.name} didn't play for the ${currentItem}.` };
  }

  // ---- FROM PLAYER: can name team, college, or number ----
  if (currentType === "player") {
    const currentPlayer = findPlayer(currentItem);
    if (!currentPlayer) return { valid: false, explanation: "Current player not found." };

    // Check NUMBER first (unambiguous — it's just digits)
    if (isNumber(input)) {
      const num = parseInt(input);
      if (currentPlayer.numbers.includes(num)) {
        return { valid: true, type: "number", corrected_name: String(num) };
      }
      return { valid: false, explanation: `${currentPlayer.name} didn't wear #${num} (known: ${currentPlayer.numbers.map(n => '#' + n).join(', ')}).` };
    }

    // Check COLLEGE before team (fixes "Oklahoma" → OKC Thunder bug)
    const playerColleges = getColleges(currentPlayer);

    // Direct match against player's colleges
    for (const c of playerColleges) {
      if (norm(c) === norm(input)) {
        return { valid: true, type: "college", corrected_name: c };
      }
    }

    // Alias match against player's colleges
    const resolvedCollege = findCollege(input);
    if (resolvedCollege) {
      const matchesPlayer = playerColleges.some((c) => norm(c) === norm(resolvedCollege));
      if (matchesPlayer) {
        return { valid: true, type: "college", corrected_name: resolvedCollege };
      }
    }

    // Check TEAM
    const team = findTeam(input);
    if (team) {
      const playedFor = currentPlayer.teams.some((t) => t === team.name);
      if (playedFor) {
        return { valid: true, type: "team", corrected_name: team.name };
      }
      // They named a real team but the player didn't play there
      return { valid: false, explanation: `${currentPlayer.name} didn't play for the ${team.name}.` };
    }

    // If college was found but doesn't match this player
    if (resolvedCollege) {
      const collegeList = playerColleges.length > 0
        ? playerColleges.join(" and ")
        : "no college (or not in database)";
      return { valid: false, explanation: `${currentPlayer.name} went to ${collegeList}, not ${resolvedCollege}.` };
    }

    // Last resort: check if input directly matches a college name even without alias
    if (playerColleges.length > 0) {
      for (const c of playerColleges) {
        if (norm(c).includes(norm(input)) || norm(input).includes(norm(c))) {
          return { valid: true, type: "college", corrected_name: c };
        }
      }
    }

    return { valid: false, explanation: `"${input}" — not recognized as a team, number, or college for ${currentPlayer.name}.` };
  }

  // ---- FROM COLLEGE: must name a player who went there ----
  if (currentType === "college") {
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };

    const collegeName = findCollege(currentItem) || currentItem;
    const playerColleges = getColleges(player);
    const attended = playerColleges.some((c) => norm(c) === norm(collegeName));

    if (attended) return { valid: true, type: "player", corrected_name: player.name };
    if (playerColleges.length > 0) {
      return { valid: false, explanation: `${player.name} went to ${playerColleges.join(" and ")}, not ${collegeName}.` };
    }
    return { valid: false, explanation: `${player.name} didn't attend college (or it's not in our database).` };
  }

  // ---- FROM NUMBER: must name a player who wore it ----
  if (currentType === "number") {
    const player = findPlayer(input);
    if (!player) return { valid: false, explanation: `"${input}" — player not found in the database.` };

    const num = parseInt(currentItem);
    if (player.numbers.includes(num)) {
      return { valid: true, type: "player", corrected_name: player.name };
    }
    return { valid: false, explanation: `${player.name} didn't wear #${currentItem} (known: ${player.numbers.map(n => '#' + n).join(', ')}).` };
  }

  return { valid: false, explanation: "Something went wrong." };
}

export function getStats() {
  const colleges = new Set();
  PLAYERS.forEach(p => getColleges(p).forEach(c => colleges.add(c)));
  const numbers = new Set(PLAYERS.flatMap(p => p.numbers));
  return { players: PLAYERS.length, teams: TEAMS.length, colleges: colleges.size, numbers: numbers.size };
}
