import React, { useState, useEffect } from "react";
import "./WorldCupDraw.css";
import { FLAG_CODE } from "./flags";

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

const POTS = [POT1, POT2, POT3, POT4];

const GROUP_COUNT = 12;
const GROUP_NAMES = Array.from(
  { length: GROUP_COUNT },
  (_, i) => `Group ${String.fromCharCode(65 + i)}`
);

const AFC = new Set([
  "Australia","Iran","Japan","Jordan","Qatar","Saudi Arabia","South Korea","Uzbekistan", "Iraq"
]);

const CAF = new Set([
  "Algeria","Cape Verde","Egypt","Ghana","Ivory Coast","Morocco",
  "Senegal","South Africa","Tunisia", "DR Congo"
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

function teamConfed(team) {
  if (UEFA.has(team)) return "UEFA";
  if (AFC.has(team)) return "AFC";
  if (CAF.has(team)) return "CAF";
  if (CONCACAF.has(team)) return "NA";
  if (CONMEBOL.has(team)) return "SA";
  if (team === "New Zealand") return "OFC";
  return "UNKNOWN";
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deepCopyGroups() {
  return GROUP_NAMES.map(name => ({
    name,
    teams: [],
    confeds: new Set(),
    uefaCount: 0
  }));
}

function Flag({ team }) {
  const code = FLAG_CODE[team];
  if (!code)
    return <span className="flagPlaceholder">🏳️</span>;

  const flagUrl = new URL(`./assets/flags/${code}.svg`, import.meta.url).href;

  return (
    <img
      src={flagUrl}
      alt={team}
      className="flag"
    />
  );
}

function canPlace(team, group) {
  const conf = teamConfed(team);
  
  if (group.teams.length >= 4) return false;
  
  if (POT1.includes(team) && group.teams.length !== 0) return false;
  if (POT2.includes(team) && group.teams.length !== 1) return false;
  if (POT3.includes(team) && group.teams.length !== 2) return false;
  if (POT4.includes(team) && group.teams.length !== 3) return false;

  if (conf === "UEFA") {
    if (group.uefaCount >= 2) return false;
    return true;
  }

  if (group.confeds.has(conf)) return false;

  return true;
}

function place(team, group) {
  const conf = teamConfed(team);
  group.teams.push(team);
  if (conf === "UEFA") group.uefaCount++;
  if (conf !== "UEFA" && conf !== "UNKNOWN") {
    group.confeds.add(conf);
  }
}

function unplace(team, group) {
  const conf = teamConfed(team);
  const idx = group.teams.lastIndexOf(team);
  if (idx >= 0) group.teams.splice(idx, 1);
  if (conf === "UEFA") group.uefaCount--;

  if (conf !== "UEFA" && conf !== "UNKNOWN") {
    const still = group.teams.some(t => teamConfed(t) === conf);
    if (!still) group.confeds.delete(conf);
  }
}

function solveDraw(pots) {
  const g = deepCopyGroups();
  const potsCopy = pots.map(p => p.slice());
  
  const hostLocks = [
    { team: "Mexico", groupIndex: 0 }, 
    { team: "Canada", groupIndex: 1 }, 
    { team: "United States", groupIndex: 3 } 
  ];

  for (const { team, groupIndex } of hostLocks) {
    let teamPlaced = false;
    for (let pi = 0; pi < potsCopy.length; pi++) {
      const idx = potsCopy[pi].indexOf(team);
      if (idx !== -1) {
        potsCopy[pi].splice(idx, 1);
        place(team, g[groupIndex]);
        teamPlaced = true;
        break;
      }
    }
    if (!teamPlaced) return null;
  }

  function assignPotTeams(potIndex) {
    if (potIndex >= potsCopy.length) return true; 

    const pot = potsCopy[potIndex];
    
    if (pot.length === 0) {
      return assignPotTeams(potIndex + 1);
    }

    const team = pot.shift(); 
    const groupOrder = shuffle([...Array(GROUP_COUNT).keys()]);

    for (const gi of groupOrder) {
      const group = g[gi];
      
      if (group.teams.length !== potIndex) continue;
      
      if (!canPlace(team, group)) continue;

      place(team, group);

      if (assignPotTeams(potIndex)) return true; 

      unplace(team, group);
    }
    
    pot.unshift(team); 

    return false;
  }

  if (!assignPotTeams(0)) return null;

  for (const gr of g) if (gr.teams.length !== 4) return null;

  return g;
}

function simulateGroupStandings(groups) {
  const allThirdPlaceTeams = [];
  const results = [];

  for (const group of groups) {
    // Teams are ranked solely by a random tieBreaker value
    const groupStandings = group.teams.map(team => ({
      team,
      groupName: group.name,
      tieBreaker: Math.random(), 
    }));
    
    // Sort based only on the random tieBreaker value
    groupStandings.sort((a, b) => {
        return b.tieBreaker - a.tieBreaker; 
    });

    results.push({
      name: group.name,
      teams: groupStandings,
    });
    
    allThirdPlaceTeams.push(groupStandings[2]);
  }

  // Sort third place teams based only on the random tieBreaker value
  allThirdPlaceTeams.sort((a, b) => {
      return b.tieBreaker - a.tieBreaker;
  });
  
  const thirdPlaceQualifiers = allThirdPlaceTeams.slice(0, 8).map(t => t.team);
  
  return { results, thirdPlaceQualifiers };
}

function generateRoundOf32(groupResults, thirdPlaceQualifiers) {
    if (groupResults.length === 0) return [];
    
    const qualifiers = {};
    for (const group of groupResults) {
        const groupLetter = group.name.slice(-1);
        qualifiers[groupLetter] = group.teams[0].team;       
        qualifiers[groupLetter.toLowerCase()] = group.teams[1].team; 
    }
    
    const T = thirdPlaceQualifiers; 

    const R32_SEEDING_PAIRS = [
        ['a', 'b'], ['E', 'T1'], ['F', 'c'], ['C', 'f'],
        ['I', 'T2'], ['e', 'i'], ['A', 'T3'], ['L', 'T4'],
        ['D', 'T5'], ['G', 'T6'], ['k', 'l'], ['H', 'j'],
        ['B', 'T7'], ['J', 'h'], ['K', 'T8'], ['d', 'g'],
    ];

    const R32_MATCHES = R32_SEEDING_PAIRS.map((pair, index) => {
        const [seedA, seedB] = pair;
        
        const teamA = seedA.startsWith('T') 
            ? T[parseInt(seedA.slice(1)) - 1] || 'TBD'
            : qualifiers[seedA];
            
        const teamB = seedB.startsWith('T') 
            ? T[parseInt(seedB.slice(1)) - 1] || 'TBD'
            : qualifiers[seedB];

        return {
            match: `M${73 + index}`, 
            teamA: teamA, 
            teamB: teamB 
        };
    });
    
    return R32_MATCHES;
}

function getTeamSeed(team, thirdPlaceQualifiers) {
    if (thirdPlaceQualifiers.includes(team)) return '(Best 3rd)';
    
   
    if (team.length === 1) {
        if (team === team.toUpperCase()) return `(${team} 1st)`;
        if (team === team.toLowerCase()) return `(${team.toUpperCase()} 2nd)`;
    }
    return '';
}

export default function WorldCupDraw() {

  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(true);
  const [groupStandings, setGroupStandings] = useState(null);
  const [roundOf32, setRoundOf32] = useState([]);
  const [thirdPlaceQualifiers, setThirdPlaceQualifiers] = useState([]);


  useEffect(() => {
    document.body.classList.toggle("light", !dark);
  
  }, [dark]);

  const drawGroups = () => {
    setError(null);
    setGroupStandings(null);
    setRoundOf32([]);
    setThirdPlaceQualifiers([]);
    
    const pots = POTS.map(p => shuffle(p));
    
    const result = solveDraw(pots);
    
    if (!result) {
      setError("Could not generate a valid draw with current constraints. Try clicking Draw again.");
      setGroups([]);
      return;
    }
    setGroups(result.map(gr => ({ name: gr.name, teams: gr.teams })));
  };
  
  const predictStandings = () => {
      if (groups.length === 0) {
          setError("Please run the draw first.");
          return;
      }
      setError(null);
      const { results, thirdPlaceQualifiers: qualifiers } = simulateGroupStandings(groups);
      
      const r32Matches = generateRoundOf32(results, qualifiers);
      
      setGroupStandings(results);
      setThirdPlaceQualifiers(qualifiers);
      setRoundOf32(r32Matches);
  };

  const reset = () => {
    setGroups([]);
    setError(null);
    setGroupStandings(null);
    setRoundOf32([]);
    setThirdPlaceQualifiers([]);
  };

  const getTeamClassName = (team, groupName) => {
      if (!groupStandings) return '';
      
      const groupResult = groupStandings.find(g => g.name === groupName);
      if (!groupResult) return '';
      
      const rank = groupResult.teams.findIndex(t => t.team === team) + 1;
      
      if (rank === 1 || rank === 2) return 'qualifier-1-2';
      
      if (rank === 3 && thirdPlaceQualifiers.includes(team)) {
          return 'qualifier-3';
      }
      return '';
  }
 
  return (
    <div className="container">
      
      <div className="header">
        <div className="logo">DrawEm26</div>
        <div className="modeToggle" onClick={() => setDark(!dark)}>
          {dark ? "🌙 Dark" : "☀️ Light"}
        </div>
      </div>

      <div className="potsWrapper">
        {POTS.map((pot, idx) => (
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
  
      <div className="buttonRow"> 
        <button className="btn" onClick={drawGroups}>Draw Groups</button>
        {groups.length > 0 && (
            <button className="btn predict-btn" onClick={predictStandings}>Predict Standings & R32</button>
        )}
        <button className="btn" onClick={reset}>Reset</button>
      </div>


      {error && <div className="error">{error}</div>}

      <div className="groupsGrid">
        {groups.map((g, groupIndex) => (
          <div key={g.name} className="groupCard">
            <h2>{g.name}</h2>
            {g.teams.map((team) => {
                const teamData = groupStandings?.find(gs => gs.name === g.name).teams.find(t => t.team === team);
                return (
                    <div 
                      key={team} 
                      className={`team ${getTeamClassName(team, g.name)}`}
                    >
                      <Flag team={team} /> {team}
                      {}
                    </div>
                );
            })}
          </div>
        ))}
      </div>
      
      {roundOf32.length > 0 && (
          <> 
            
            <div className="round-of-32-wrapper">
                <h2>Round of 32 Matchups</h2>
                <div className="r32-grid">
                    {roundOf32.map(match => (
                        <div key={match.match} className="r32-match-card">
                            <div className="match-title">{match.match}</div>
                            <div className="match-team">
                                <Flag team={match.teamA} /> {match.teamA}
                                <span className="qualifier-label"> 
                                    {getTeamSeed(match.teamA, thirdPlaceQualifiers)}
                                </span>
                            </div>
                            <div className="match-team">
                                <Flag team={match.teamB} /> {match.teamB}
                                <span className="qualifier-label">
                                    {getTeamSeed(match.teamB, thirdPlaceQualifiers)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </>
      )}
    </div>
  );
}