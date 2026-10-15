// Presentation-only fixtures. This prototype never reads or writes campaign data.
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}" /></svg>`;
const secondsLabel = (value) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
const sum = (values) => values.reduce((total, value) => total + value, 0);
const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
const avatar = (person) =>
  `<span class="avatar ${person.side === "enemy" ? "enemy" : ""}" aria-hidden="true">${initials(person.name)}</span>`;

const baseCombatants = [
  {
    name: "Wrenn",
    side: "party",
    damage: [18, 22, 14, 24],
    healing: [0, 0, 0, 0],
    seconds: [62, 54, 60, 52],
  },
  {
    name: "Aldrich",
    side: "party",
    damage: [16, 12, 18, 16],
    healing: [0, 0, 0, 0],
    seconds: [74, 70, 62, 58],
  },
  {
    name: "Emerald",
    side: "party",
    damage: [8, 0, 20, 20],
    healing: [0, 14, 0, 16],
    seconds: [52, 48, 56, 48],
  },
  {
    name: "Tyraande",
    side: "party",
    damage: [10, 8, 0, 18],
    healing: [0, 0, 16, 0],
    seconds: [68, 60, 66, 58],
  },
  {
    name: "Taires",
    side: "party",
    damage: [4, 6, 6, 8],
    healing: [0, 0, 0, 0],
    seconds: [48, 44, 46, 42],
  },
  {
    name: "Rootbound sentinel",
    side: "enemy",
    damage: [16, 12, 14, 10],
    healing: [0, 0, 0, 0],
    seconds: [36, 36, 36, 36],
  },
  {
    name: "Twig blight 1",
    side: "enemy",
    damage: [10, 8, 6, 8],
    healing: [0, 0, 0, 0],
    seconds: [16, 18, 18, 20],
  },
  {
    name: "Twig blight 2",
    side: "enemy",
    damage: [6, 6, 8, 4],
    healing: [0, 0, 0, 0],
    seconds: [12, 12, 12, 12],
  },
];

function createRun(config) {
  const combatants = baseCombatants.map((person, index) => ({
    ...person,
    name: config.enemyNames && index >= 5 ? config.enemyNames[index - 5] : person.name,
    id: `combatant-${index}`,
    damage: Array.from({ length: config.rounds }, (_, round) =>
      Math.round(person.damage[round % 4] * config.scale),
    ),
    healing: Array.from({ length: config.rounds }, (_, round) =>
      Math.round(person.healing[round % 4] * config.scale),
    ),
    seconds: Array.from({ length: config.rounds }, (_, round) =>
      Math.round(person.seconds[round % 4] * config.pace),
    ),
    taken: 0,
  }));
  const events = [];
  let elapsed = 0;
  for (let round = 0; round < config.rounds; round += 1) {
    combatants.forEach((person, index) => {
      const opponents = combatants.filter((target) => target.side !== person.side);
      const friends = combatants.filter((target) => target.side === person.side);
      elapsed += person.seconds[round];
      if (person.damage[round]) {
        const target = opponents[(index + round) % opponents.length];
        target.taken += person.damage[round];
        events.push({
          round,
          elapsed,
          person,
          target,
          kind: "damage",
          amount: person.damage[round],
          turn: person.seconds[round],
        });
      }
      if (person.healing[round]) {
        const target = friends[(index + round + 1) % friends.length];
        events.push({
          round,
          elapsed,
          person,
          target,
          kind: "healing",
          amount: person.healing[round],
          turn: person.seconds[round],
        });
      }
    });
  }
  // Show how an undo can stay visible without increasing the reported totals.
  events.push({
    round: 0,
    elapsed: 24,
    person: combatants[0],
    target: combatants[5],
    kind: "damage",
    amount: 8,
    turn: 0,
    undone: true,
  });
  events.sort((a, b) => a.elapsed - b.elapsed);
  const party = combatants.filter((person) => person.side === "party");
  return {
    ...config,
    combatants,
    events,
    duration: elapsed,
    damage: sum(party.map((person) => sum(person.damage))),
    healing: sum(party.map((person) => sum(person.healing))),
  };
}

const runs = [
  createRun({
    id: "storehouse",
    name: "Rootbound Storehouse",
    date: "14 Oct 2026",
    startedAt: "2026-10-14T20:14:00+01:00",
    clock: "20:14",
    session: "Session 12",
    rounds: 4,
    scale: 1,
    pace: 1,
    paused: 300,
    outcome: "Completed",
    note: "The party cleared the storehouse and recovered the missing supplies.",
  }),
  createRun({
    id: "gate",
    name: "Cragmaw Cut · Gate sentries",
    date: "7 Oct 2026",
    startedAt: "2026-10-07T19:42:00+01:00",
    clock: "19:42",
    session: "Session 11",
    rounds: 3,
    scale: 0.8,
    pace: 0.9,
    paused: 120,
    outcome: "Completed",
    enemyNames: ["Goblin sentry", "Goblin lookout 1", "Goblin lookout 2"],
    note: "The sentries were defeated before they could raise the alarm.",
  }),
  createRun({
    id: "den",
    name: "Meenlock Den · Fear Nest",
    date: "30 Sep 2026",
    startedAt: "2026-09-30T21:03:00+01:00",
    clock: "21:03",
    session: "Session 10",
    rounds: 5,
    scale: 1.2,
    pace: 1.1,
    paused: 420,
    outcome: "Stopped early",
    enemyNames: ["Root-fed meenlock", "Meenlock 1", "Meenlock 2"],
    note: "The party withdrew with the captive. The remaining creatures escaped.",
  }),
  createRun({
    id: "test",
    name: "Rootbound Storehouse",
    date: "13 Oct 2026",
    startedAt: "2026-10-13T18:06:00+01:00",
    clock: "18:06",
    session: "Test run",
    rounds: 2,
    scale: 0.7,
    pace: 0.5,
    paused: 0,
    outcome: "Test run",
    test: true,
    note: "Practice run. Excluded from the default combat history.",
  }),
];

const state = {
  screen: "history",
  run: "storehouse",
  metric: "damage",
  side: "party",
  round: "all",
  kind: "all",
  search: "",
  outcome: "all",
  tests: false,
};
const screen = document.getElementById("screen");
const currentRun = () => runs.find((run) => run.id === state.run) || runs[0];
const selectedCombatants = () =>
  currentRun().combatants.filter((person) => state.side === "all" || person.side === state.side);
const metricValue = (person) =>
  state.metric === "time" ? sum(person.seconds) : sum(person[state.metric]);
const metricTitle = () =>
  ({ damage: "Damage done", healing: "Healing done", time: "Turn time" })[state.metric];

function outcome(run) {
  return `<span class="run-outcome ${run.test ? "test" : run.outcome === "Completed" ? "completed" : "active"}">${icon(run.test ? "list" : run.outcome === "Completed" ? "check" : "back")}${run.outcome}</span>`;
}

function changeScreen(next) {
  state.screen = next;
  window.location.hash = next;
  render();
}

function render() {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    if (button.dataset.screen === state.screen) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll("[data-workspace]").forEach((button) => {
    const active =
      button.dataset.workspace === (state.screen === "prepared" ? "prepared" : "history");
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  screen.innerHTML =
    state.screen === "prepared"
      ? preparedScreen()
      : state.screen === "empty"
        ? emptyScreen()
        : state.screen === "history"
          ? historyScreen()
          : reportScreen();
  if (state.screen === "history") {
    document.getElementById("history-search").value = state.search;
    renderHistoryRows();
  }
}

function historyScreen() {
  return `<div class="section-heading"><div><h2>Combat history</h2><p>A record of every fight, with its results and turn times.</p></div><span class="small muted">3 recorded fights</span></div>
    <div class="toolbar">
      <label class="search-field">${icon("search")}<span class="sr-only">Search combat history</span><input id="history-search" type="search" placeholder="Search encounters…" /></label>
      <label><span class="sr-only">Outcome</span><select id="outcome"><option value="all">All outcomes</option><option ${state.outcome === "Completed" ? "selected" : ""}>Completed</option><option ${state.outcome === "Stopped early" ? "selected" : ""}>Stopped early</option></select></label>
      <label class="check-label"><input id="show-tests" type="checkbox" ${state.tests ? "checked" : ""} /> Include test runs</label>
    </div>
    <section class="panel" aria-label="Recorded encounters"><div class="table-scroll"><table class="history-table"><caption class="sr-only">Saved encounter runs with party damage, healing, rounds and active time</caption><thead><tr><th>Encounter</th><th class="optional">Outcome</th><th class="align-end optional">Damage</th><th class="align-end optional">Healing</th><th class="align-end">Combat time</th><th><span class="sr-only">Open report</span></th></tr></thead><tbody id="history-rows"></tbody></table></div><div id="history-no-results" class="no-results" hidden>No fights match these filters.</div><div class="table-footer"><span id="history-count"></span><span>Newest first · Party totals</span></div></section>
    <p class="context-note">${icon("list")}Finished combats are saved here automatically. Test runs are hidden unless you include them.</p>`;
}

function renderHistoryRows() {
  const visible = runs
    .toSorted((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .filter(
      (run) =>
        (state.tests || !run.test) &&
        (state.outcome === "all" || run.outcome === state.outcome) &&
        run.name.toLowerCase().includes(state.search.toLowerCase()),
    );
  document.getElementById("history-rows").innerHTML = visible
    .map(
      (run) => `<tr>
    <td><button type="button" class="text-button encounter-title" data-open="${run.id}">${run.name}</button><small>${run.date} · ${run.session}</small><span class="mobile-outcome">${outcome(run)}</span></td>
    <td class="optional">${outcome(run)}</td><td class="align-end optional">${run.damage}</td><td class="align-end optional">${run.healing}</td>
    <td class="align-end">${secondsLabel(run.duration)}<small>${run.rounds} rounds</small></td>
    <td class="align-end"><button type="button" class="text-button" data-open="${run.id}" aria-label="Open ${run.name} report"><span class="open-label">Report</span>${icon("arrow")}</button></td></tr>`,
    )
    .join("");
  document.getElementById("history-no-results").hidden = visible.length > 0;
  document.getElementById("history-count").textContent =
    `${visible.length} ${visible.length === 1 ? "fight" : "fights"}${state.tests ? " including test runs" : " · Test runs excluded"}`;
}

function reportHeader(run) {
  return `<button type="button" class="text-button report-back" data-go="history">${icon("back")} All combat history</button>
    <div class="report-heading"><div><h2>${run.name}</h2><div class="report-meta">${outcome(run)}<span>·</span><span>${run.date}, ${run.clock}</span><span>·</span><span>${run.session}</span></div></div><div class="report-actions"><button type="button" class="button" id="export">${icon("download")} Export CSV</button><button type="button" class="button secondary" data-go="${state.screen === "timeline" ? "report" : "timeline"}">${icon(state.screen === "timeline" ? "list" : "clock")}${state.screen === "timeline" ? "Fight report" : "Round log"}</button></div></div>
    <dl class="metrics"><div class="metric"><dt>Active combat time</dt><dd>${secondsLabel(run.duration)}</dd><small>${secondsLabel(run.paused)} paused · excluded</small></div><div class="metric"><dt>Rounds played</dt><dd>${run.rounds}</dd><small>${run.rounds * run.combatants.length} completed turns</small></div><div class="metric"><dt>Party damage done</dt><dd>${run.damage}</dd><small>Damage applied to enemies</small></div><div class="metric"><dt>Party healing done</dt><dd>${run.healing}</dd><small>HP actually restored</small></div></dl>`;
}

function reportScreen() {
  const run = currentRun();
  return (
    reportHeader(run) + (state.screen === "timeline" ? timelineScreen(run) : performanceScreen(run))
  );
}

function performanceScreen(run) {
  const people = selectedCombatants();
  const ranked = people.toSorted((a, b) => metricValue(b) - metricValue(a));
  const max = Math.max(1, ...ranked.map(metricValue));
  const total = sum(people.map(metricValue));
  const turns = people.length * run.rounds;
  const totalTime = sum(people.map((person) => sum(person.seconds)));
  const tableHeaders =
    state.metric === "time"
      ? '<th class="align-end">Total time</th><th class="align-end">Avg / turn</th><th class="align-end">Turns</th>'
      : `<th class="align-end">${state.metric === "damage" ? "Done" : "Restored"}</th><th class="align-end">${state.metric === "damage" ? "Taken" : "Overheal"}</th><th class="align-end">Share</th>`;
  return `<nav class="report-tabs" aria-label="Combat report metrics">${[
    ["damage", "swords", "Damage"],
    ["healing", "heart", "Healing"],
    ["time", "clock", "Turn time"],
  ]
    .map(
      ([value, glyph, label]) =>
        `<button type="button" data-metric="${value}" aria-pressed="${state.metric === value}">${icon(glyph)}${label}</button>`,
    )
    .join(
      "",
    )}<button type="button" data-go="timeline">${icon("list")}Round log ${icon("arrow")}</button></nav>
    <div class="report-layout"><section class="panel" aria-labelledby="meter-title"><div class="panel-heading"><div><h3 id="meter-title">${metricTitle()}</h3><p>${state.side === "party" ? "Party" : state.side === "enemy" ? "Enemies" : "All combatants"} · ${state.metric === "time" ? "Time spent taking turns" : "Applied results across the fight"}</p></div><div class="segmented" role="group" aria-label="Combatants">${[
      ["party", "Party"],
      ["enemy", "Enemies"],
      ["all", "All"],
    ]
      .map(
        ([value, label]) =>
          `<button type="button" data-side="${value}" aria-pressed="${state.side === value}">${label}</button>`,
      )
      .join("")}</div></div>
    <ol class="meter-list">${ranked
      .map((person) => {
        const value = metricValue(person);
        return `<li><div class="meter-label">${avatar(person)}<span class="bar-name">${person.name}</span><span class="bar-value">${state.metric === "time" ? secondsLabel(value) : value}<small>${total ? Math.round((value / total) * 100) : 0}%</small></span></div><div class="meter-track" role="meter" aria-label="${person.name} ${metricTitle().toLowerCase()}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-valuetext="${state.metric === "time" ? `${value} seconds` : `${value} HP`}"><div class="meter-fill ${state.metric}" style="width:${(value / max) * 100}%"></div></div></li>`;
      })
      .join("")}</ol>
    <p class="chart-caption">${state.metric === "time" ? "Pauses and time between turns are excluded. Average uses completed turns." : state.metric === "healing" ? "Counts HP restored. Healing beyond maximum HP is recorded separately." : "Counts applied damage after defenses. Undone results are excluded."}</p>
    <div class="compact-summary"><span>${state.metric === "time" ? "Total turn time" : "Total"}<strong>${state.metric === "time" ? secondsLabel(total) : `${total} HP`}</strong></span><span>${state.metric === "time" ? `Average turn <strong>${secondsLabel(Math.round(totalTime / turns))}</strong>` : `${people.length} combatants · ${run.rounds} rounds`}</span></div></section>
    <section class="panel" aria-labelledby="detail-title"><div class="panel-heading"><div><h3 id="detail-title">${state.metric === "time" ? "Turn-by-turn pace" : "Combatant breakdown"}</h3><p>${state.metric === "time" ? "Total and average active turn duration" : state.metric === "healing" ? "Restored HP and unused healing" : "Damage dealt and damage received"}</p></div></div><div class="table-scroll"><table class="detail-table"><caption class="sr-only">${metricTitle()} by combatant</caption><thead><tr><th>Combatant</th>${tableHeaders}</tr></thead><tbody>${ranked.map((person) => breakdownRow(person, run, total)).join("")}<tr class="total-row"><td>Total</td><td class="align-end">${state.metric === "time" ? secondsLabel(total) : total}</td><td class="align-end">${state.metric === "time" ? secondsLabel(Math.round(totalTime / turns)) : state.metric === "damage" ? sum(people.map((person) => person.taken)) : overhealTotal(people)}</td><td class="align-end">${state.metric === "time" ? turns : total ? "100%" : "—"}</td></tr></tbody></table></div><div class="table-footer">${state.metric === "time" ? "Turn times describe table pace; they aren’t a performance score." : state.metric === "healing" ? "Overheal is excluded from healing done." : "Damage from physical dice can be entered manually and attributed."}</div></section></div>
    <section class="panel round-breakdown"><div class="panel-heading"><h3>Round breakdown</h3><span class="small muted">Active time · Party results</span></div><div class="round-strip">${Array.from({ length: run.rounds }, (_, round) => `<button type="button" class="round-card" data-round-open="${round}"><strong>Round ${round + 1}</strong><span class="round-time numeric">${secondsLabel(sum(run.combatants.map((person) => person.seconds[round])))}</span><small>${sum(run.combatants.filter((person) => person.side === "party").map((person) => person.damage[round]))} damage · ${sum(run.combatants.filter((person) => person.side === "party").map((person) => person.healing[round]))} healing</small><span class="text-link">View round</span></button>`).join("")}</div></section>
    <p class="context-note">${icon("book")}<span><strong>DM note</strong> · ${run.note}</span></p>`;
}

function overheal(person) {
  return person.name === "Emerald" ? 4 : 0;
}
function overhealTotal(people) {
  return sum(people.map(overheal));
}

function breakdownRow(person, run, total) {
  const value = metricValue(person);
  const cells =
    state.metric === "time"
      ? [secondsLabel(value), secondsLabel(Math.round(value / run.rounds)), run.rounds]
      : [
          value,
          state.metric === "damage" ? person.taken : overheal(person),
          total ? `${Math.round((value / total) * 100)}%` : "—",
        ];
  return `<tr><td><span class="person-name">${avatar(person)}<span>${person.name}</span></span></td>${cells.map((cell) => `<td class="align-end">${cell}</td>`).join("")}</tr>`;
}

function timelineScreen(run) {
  const rounds = Array.from({ length: run.rounds }, (_, round) => round).filter(
    (round) => state.round === "all" || round === Number(state.round),
  );
  return `<div class="section-heading"><div><h3>Round log</h3><p>Applied results, who caused them, and how long each turn took.</p></div><button type="button" class="text-button" data-go="report">Back to report ${icon("arrow")}</button></div>
    <div class="log-controls"><div class="round-filter" role="group" aria-label="Filter by round"><button type="button" data-round="all" aria-pressed="${state.round === "all"}">All rounds</button>${Array.from({ length: run.rounds }, (_, round) => `<button type="button" data-round="${round}" aria-pressed="${String(state.round) === String(round)}">Round ${round + 1}</button>`).join("")}</div><label><span class="sr-only">Event type</span><select id="event-type"><option value="all">All events</option><option value="damage" ${state.kind === "damage" ? "selected" : ""}>Damage only</option><option value="healing" ${state.kind === "healing" ? "selected" : ""}>Healing only</option></select></label></div>
    ${rounds
      .map((round, index) => {
        const events = run.events.filter(
          (event) => event.round === round && (state.kind === "all" || event.kind === state.kind),
        );
        return `<details class="panel log-round" ${index === 0 || state.round !== "all" ? "open" : ""}><summary>Round ${round + 1}<span>${secondsLabel(sum(run.combatants.map((person) => person.seconds[round])))} active · ${run.combatants.length} turns</span></summary>${events.length ? `<ol class="event-list">${events.map(eventRow).join("")}</ol>` : `<p class="no-results">No ${state.kind} recorded in this round.</p>`}</details>`;
      })
      .join("")}
    <p class="context-note">${icon("clock")}Timestamps use active combat time. Each completed turn is counted once, even when it contains multiple results.</p>`;
}

function eventRow(event) {
  const isHealing = event.kind === "healing";
  const text = event.undone
    ? `<strong>${event.person.name}</strong> → ${event.target.name} · Damage undone`
    : `<strong>${event.person.name}</strong> ${isHealing ? "healed" : "dealt damage to"} <strong>${event.target.name}</strong>`;
  const manual = event.person.side === "party";
  const extraHealing = isHealing && event.person.name === "Emerald" && event.round === 1 ? 4 : 0;
  return `<li class="event ${event.undone ? "undone" : ""}"><time aria-label="${event.elapsed} seconds into active combat">${secondsLabel(event.elapsed)}</time>${avatar(event.person)}<div><p>${text}</p><small>${event.undone ? "DM correction · Excluded from totals" : `${manual ? "Physical dice · Manual entry" : "NPC action · Applied result"} · Turn ${secondsLabel(event.turn)}`}</small><details><summary>Result details</summary><p>${event.undone ? "This 8 HP damage entry was undone. It remains in the log for reference and contributes 0 HP to the report." : `${isHealing ? "Healing" : "Damage"} applied: ${event.amount} HP. ${extraHealing ? `Rolled healing: ${event.amount + extraHealing} HP; overheal: ${extraHealing} HP. ` : ""}Attributed to ${event.person.name}. Target: ${event.target.name}. Recorded ${manual ? "by the DM" : "from the resolved NPC action"}.`}</p></details></div><span class="event-amount">${isHealing ? "+" : "−"}${event.amount} HP</span></li>`;
}

function emptyScreen() {
  return `<div class="section-heading"><div><h2>Combat history</h2><p>Your completed fights will appear here.</p></div></div><div class="empty-state">${icon("list")}<h2>No combats recorded yet</h2><p>Run an encounter to start a record of damage, healing, and time spent taking turns.</p><button type="button" class="button primary" data-go="prepared">Go to prepared encounters ${icon("arrow")}</button><span class="small muted">Test runs are kept separate.</span></div><ol class="empty-steps"><li>Start an encounter from your prepared list.</li><li>Apply damage and healing as you play. Turn times are recorded automatically.</li><li>Finish combat to save the report and round log.</li></ol>`;
}

function preparedScreen() {
  return `<div class="section-heading"><div><h2>Prepared encounters</h2><p>Existing encounter management stays in this tab.</p></div><button type="button" class="button primary" data-go="history">View combat history ${icon("arrow")}</button></div><section class="panel"><div class="table-scroll"><table><caption class="sr-only">Sample prepared encounters</caption><thead><tr><th>Encounter</th><th>Party</th><th>Enemies</th><th>History</th></tr></thead><tbody>${runs
    .filter((run) => !run.test)
    .map(
      (run) =>
        `<tr><td><strong>${run.name}</strong><small>Prepared encounter · Sample data</small></td><td>5 players</td><td>3 creatures</td><td><button type="button" class="text-button" data-open="${run.id}">View last run ${icon("arrow")}</button></td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div></section><p class="context-note">${icon("list")}This is a navigation preview. The proposed new work lives in Combat history.</p>`;
}

function exportCSV() {
  const run = currentRun();
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [
    [
      "Encounter",
      "Combatant",
      "Side",
      "Damage done",
      "Damage taken",
      "Healing restored",
      "Turn time (seconds)",
      "Completed turns",
      "Average turn (seconds)",
    ],
    ...run.combatants.map((person) => [
      run.name,
      person.name,
      person.side,
      sum(person.damage),
      person.taken,
      sum(person.healing),
      sum(person.seconds),
      run.rounds,
      Math.round(sum(person.seconds) / run.rounds),
    ]),
  ];
  const blob = new Blob([rows.map((row) => row.map(quote).join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bludm-${run.id}-sample-report.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const toast = document.getElementById("toast");
  toast.textContent = "Sample combat report exported as CSV.";
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.screen) changeScreen(button.dataset.screen);
  else if (button.dataset.go) changeScreen(button.dataset.go);
  else if (button.dataset.workspace)
    changeScreen(button.dataset.workspace === "prepared" ? "prepared" : "history");
  else if (button.dataset.open) {
    state.run = button.dataset.open;
    state.round = "all";
    changeScreen("report");
  } else if (button.dataset.metric) {
    state.metric = button.dataset.metric;
    render();
  } else if (button.dataset.side) {
    state.side = button.dataset.side;
    render();
  } else if (button.dataset.roundOpen !== undefined) {
    state.round = button.dataset.roundOpen;
    changeScreen("timeline");
  } else if (button.dataset.round !== undefined) {
    state.round = button.dataset.round;
    render();
  } else if (button.id === "prepared-shortcut") changeScreen("prepared");
  else if (button.id === "export") exportCSV();
  else if (button.id === "theme") {
    document.documentElement.classList.toggle("dark");
    button.setAttribute(
      "aria-label",
      `Switch to ${document.documentElement.classList.contains("dark") ? "light" : "dark"} theme`,
    );
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "history-search") {
    state.search = event.target.value;
    renderHistoryRows();
  }
});
document.addEventListener("change", (event) => {
  if (event.target.id === "accent") document.documentElement.dataset.accent = event.target.value;
  else if (event.target.id === "outcome") {
    state.outcome = event.target.value;
    renderHistoryRows();
  } else if (event.target.id === "show-tests") {
    state.tests = event.target.checked;
    renderHistoryRows();
  } else if (event.target.id === "event-type") {
    state.kind = event.target.value;
    render();
  }
});
window.addEventListener("hashchange", () => {
  const next = window.location.hash.slice(1);
  if (
    ["history", "report", "timeline", "empty", "prepared"].includes(next) &&
    state.screen !== next
  ) {
    state.screen = next;
    render();
  }
});
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  document.documentElement.classList.add("dark");
  document.getElementById("theme").setAttribute("aria-label", "Switch to light theme");
}
if (["history", "report", "timeline", "empty", "prepared"].includes(window.location.hash.slice(1)))
  state.screen = window.location.hash.slice(1);
render();
