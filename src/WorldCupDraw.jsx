import React, { useState, useEffect } from "react";
import "./WorldCupDraw.css";
import { FLAG_CODE } from "./flags";

/*
 Pots:
*/
const POT1 = [
  "Mexico","Canada","United States","Spain","Argentina","France","England",
  "Brazil","Portugal","Netherlands","Belgium","Germany"
];

const POT2 = [
  "Croatia","Morocco","Colombia","Uruguay","Switzerland","Japan",
  "Senegal","Iran","South Korea","Ecuador","Austria","Australia"
];

const POT3 = [
  "Norway","Panama","Egypt","Algeria","Scotland","Paraguay",
  "Tunisia","Ivory Coast","Uzbekistan","Qatar","Saudi Arabia","South Africa"
];

const POT4 = [
  "Jordan","Cape Verde","Ghana","Curaçao","Haiti","New Zealand",
  "Iraq","DR Congo","Italy","Poland","Turkey","Denmark"
];

const GROUP_COUNT = 12;
const GROUP_NAMES = Array.from(
  { length: GROUP_COUNT },
  (_, i) => `Group ${String.fromCharCode(65 + i)}`
);

/*
 Confederation groups
*/
const AFC = new Set([
  "Australia","Iran","Japan","Jordan","Qatar","Saudi Arabia","South Korea","Uzbekistan"
]);

const CAF = new Set([
  "Algeria","Cape Verde","Egypt","Ghana","Ivory Coast","Morocco",
  "Senegal","South Africa","Tunisia","DR Congo"
]);

const CONCACAF = new Set([
  "Canada","Curaçao","Haiti","Mexico","Panama","United States"
]);

const CONMEBOL = new Set([
  "Argentina","Brazil","Colombia","Ecuador","Paraguay","Uruguay"
]);

const UEFA = new Set([
  "Austria","Belgium","Croatia","England","France","Germany",
  "Netherlands","Norway","Portugal","Scotland","Spain","Switzerland",
  "Italy","Poland","Turkey","Denmark"
]);

const IC_PLAYOFF = new Set(["Iraq","DR Congo"]);

/* Confederation resolver */
function teamConfed(team) {
  if (IC_PLAYOFF.has(team)) return "IC";
  if (UEFA.has(team)) return "UEFA";
  if (AFC.has(team)) return "AFC";
  if (CAF.has(team)) return "CAF";
  if (CONCACAF.has(team)) return "NA";
  if (CONMEBOL.has(team)) return "SA";
  if (team === "New Zealand") return "OFC";
  return "UNKNOWN";
}

/* Shuffle */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* New empty groups */
function deepCopyGroups() {
  return GROUP_NAMES.map(name => ({
    name,
    teams: [],
    confeds: new Set(),
    uefaCount: 0
  }));
}

/* ----------------------------------------------------------
   FLAG COMPONENT
-----------------------------------------------------------*/
function Flag({ team }) {
  const code = FLAG_CODE[team];

  if (!code)
    return <span className="flagPlaceholder">🏳️</span>;

  return (
    <img
      src={`/src/assets/flags/${code}.svg`}
      alt={team}
      className="flag"
    />
  );
}

/* ----------------------------------------------------------
   MAIN COMPONENT
-----------------------------------------------------------*/
export default function WorldCupDraw() {

  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);

  /* DARK MODE DEFAULT = ON */
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // If dark = true → normal body (dark variables)
    // If dark = false → add .light (light variables)
    document.body.classList.toggle("light", !dark);
  }, [dark]);


  /* RULE CHECKING ------------------------------------------------------ */
  function canPlace(team, group) {
    const conf = teamConfed(team);

    if (conf === "IC") return group.teams.length < 4;

    if (conf === "UEFA") {
      if (group.uefaCount >= 2) return false;
      return group.teams.length < 4;
    }

    if (conf !== "UNKNOWN" && group.confeds.has(conf)) return false;

    return group.teams.length < 4;
  }

  function place(team, group) {
    const conf = teamConfed(team);
    group.teams.push(team);
    if (conf === "UEFA") group.uefaCount++;
    if (conf !== "IC" && conf !== "UEFA" && conf !== "UNKNOWN") {
      group.confeds.add(conf);
    }
  }

  function unplace(team, group) {
    const conf = teamConfed(team);
    const idx = group.teams.lastIndexOf(team);
    if (idx >= 0) group.teams.splice(idx, 1);
    if (conf === "UEFA") group.uefaCount--;
    if (conf !== "IC" && conf !== "UEFA" && conf !== "UNKNOWN") {
      const still = group.teams.some(t => teamConfed(t) === conf);
      if (!still) group.confeds.delete(conf);
    }
  }

  /* BACKTRACKING --------------------------------------------------------- */
  function solveDraw(pots) {
    const g = deepCopyGroups();

    const lockMap = { 0: "Mexico", 1: "Canada", 3: "United States" };

    const potsCopy = pots.map(p => p.slice());
    Object.entries(lockMap).forEach(([groupIndexString, team]) => {
      const groupIndex = Number(groupIndexString);
      for (let pi = 0; pi < potsCopy.length; pi++) {
        const idx = potsCopy[pi].indexOf(team);
        if (idx !== -1) {
          potsCopy[pi].splice(idx, 1);
          place(team, g[groupIndex]);
          break;
        }
      }
    });

    function assignFromPot(potIndex, teamIndex) {
      if (potIndex >= potsCopy.length) return true;
      const pot = potsCopy[potIndex];
      if (teamIndex >= pot.length) return assignFromPot(potIndex + 1, 0);

      const team = pot[teamIndex];
      const groupOrder = shuffle([...Array(GROUP_COUNT).keys()]);

      for (const gi of groupOrder) {
        const group = g[gi];
        if (!canPlace(team, group)) continue;
        place(team, group);
        if (assignFromPot(potIndex, teamIndex + 1)) return true;
        unplace(team, group);
      }
      return false;
    }

    if (!assignFromPot(0, 0)) return null;

    for (const gr of g) if (gr.teams.length !== 4) return null;

    return g;
  }

  /* BUTTONS ------------------------------------------------------------- */
  const drawGroups = () => {
    setError(null);
    const pots = [shuffle(POT1), shuffle(POT2), shuffle(POT3), shuffle(POT4)];
    const result = solveDraw(pots);
    if (!result) {
      setError("Could not generate a valid draw with current constraints.");
      setGroups([]);
      return;
    }
    setGroups(result.map(gr => ({ name: gr.name, teams: gr.teams })));
  };

  const reset = () => {
    setGroups([]);
    setError(null);
  };

  /* UI ----------------------------------------------------------------- */
  return (
    <div className="container">
      
      {/* HEADER */}
      <div className="header">
        <div className="logo">DrawEm26</div>
        <div className="modeToggle" onClick={() => setDark(!dark)}>
          {dark ? "🌙 Dark" : "☀️ Light"}
        </div>
      </div>

      {/* POTS PREVIEW */}
      <div className="potsWrapper">
        {[POT1, POT2, POT3, POT4].map((pot, idx) => (
          <div key={idx} className="potCard">
            <h3>Pot {idx + 1}</h3>
            {pot.map((t) => (
              <div key={t} className="team">
                <Flag team={t} /> {t}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* BUTTONS */}
      <div className="buttonRow">
        <button className="btn" onClick={drawGroups}>Draw</button>
        <button className="btn" onClick={reset}>Reset</button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* GROUP RESULTS */}
      <div className="groupsGrid">
        {groups.map((g) => (
          <div key={g.name} className="groupCard">
            <h2>{g.name}</h2>
            {g.teams.map((team) => (
              <div key={team} className="team">
                <Flag team={team} /> {team}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
