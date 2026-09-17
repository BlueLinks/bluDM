const state = {
  workflow: "quick",
  kind: "damage",
  amount: 8,
  source: "aid",
};

const scenarios = {
  quick: {
    workflow: "quick",
    kind: "damage",
    amount: 8,
    reason: "Fell from the ruined bridge",
    targets: ["tamsin", "borin"],
  },
  aid: {
    workflow: "source",
    source: "aid",
    amount: 5,
    targets: ["tamsin", "mira", "borin"],
  },
  leader: {
    workflow: "source",
    source: "leader",
    amount: 12,
    targets: ["tamsin", "mira", "borin", "nyx", "vharkus"],
  },
};

const sourceContent = {
  aid: {
    actor: "mira",
    name: "Aid",
    meta: "2nd-level spell · 8 hours · no concentration",
    description: "Each target’s current and maximum hit points increase by 5 for the duration.",
    current: "+5",
    secondaryLabel: "Maximum HP",
    maximum: "+5",
    limit: 3,
    resource: "1 level 2 spell slot",
    action: "Cast Aid",
  },
  leader: {
    actor: "nyx",
    name: "Inspiring Leader",
    meta: "Character feature · until next long rest",
    description:
      "Each chosen creature gains 12 temporary hit points. Existing temporary HP is kept when higher.",
    current: "No change",
    secondaryLabel: "Temporary HP",
    maximum: "12 temp HP",
    limit: 6,
    resource: "Inspiring Leader marked used",
    action: "Use Inspiring Leader",
  },
};

const kindContent = {
  damage: {
    action: "Apply damage",
    title: (amount) => `Deal ${amount} bludgeoning damage`,
    note: "Damage uses temporary HP first. Resistance and vulnerability are not applied here.",
  },
  healing: {
    action: "Apply healing",
    title: (amount) => `Restore up to ${amount} hit points`,
    note: "Healing cannot raise current HP above the creature’s effective maximum.",
  },
  temporary: {
    action: "Grant temp HP",
    title: (amount) => `Grant ${amount} temporary hit points`,
    note: "Temporary hit points do not stack. Each target keeps whichever value is higher.",
  },
  maximum: {
    action: "Apply max HP change",
    title: (amount) => `Increase maximum HP by ${amount}`,
    note: "This creates a removable effect instead of permanently changing the character sheet.",
  },
};

const q = (selector) => document.querySelector(selector);
const qa = (selector) => [...document.querySelectorAll(selector)];

function setWorkflow(workflow) {
  state.workflow = workflow;
  qa(".workflow-tab").forEach((tab) => {
    const active = tab.dataset.workflow === workflow;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  q(".quick-workflow").classList.toggle("is-hidden", workflow !== "quick");
  q(".source-workflow").classList.toggle("is-hidden", workflow !== "source");
  updateAll();
}

function setKind(kind) {
  state.kind = kind;
  qa(".kind-button").forEach((button) =>
    button.classList.toggle("is-active", button.dataset.kind === kind),
  );
  q(".damage-type-field").classList.toggle("is-hidden", kind !== "damage");
  q(".duration-field").classList.toggle("is-hidden", kind !== "maximum");
  q(".max-current-option").classList.toggle("is-hidden", kind !== "maximum");
  q(".quick-note").textContent = kindContent[kind].note;
  updateAll();
}

function setSource(source) {
  state.source = source;
  const content = sourceContent[source];
  q("#source-select").value = source;
  q("#actor-select").value = content.actor;
  q(".source-name").textContent = content.name;
  q(".source-meta").textContent = content.meta;
  q(".source-description").textContent = content.description;
  q(".current-effect").textContent = content.current;
  q(".secondary-effect-label").textContent = content.secondaryLabel;
  q(".maximum-effect").textContent = content.maximum;
  q(".target-limit").textContent = `Up to ${content.limit}`;
  q(".spell-resource").classList.toggle("is-hidden", source !== "aid");
  q(".feature-resource").classList.toggle("is-hidden", source !== "leader");
  state.amount = source === "aid" ? aidAmount() : 12;
  updateAll();
}

function aidAmount() {
  const slot = Number(q("#slot-level")?.value || 2);
  return 5 + Math.max(0, slot - 2) * 5;
}

function selectedRows() {
  return qa(".target-row").filter((row) => row.querySelector("input").checked);
}

function setTargets(ids) {
  qa(".target-row").forEach((row) => {
    const selected = ids.includes(row.dataset.id);
    row.querySelector("input").checked = selected;
    row.classList.toggle("is-selected", selected);
  });
  updateAll();
}

function projection(row) {
  const hp = Number(row.dataset.hp);
  const max = Number(row.dataset.max);
  const temp = Number(row.dataset.temp);
  const amount = state.amount;
  if (state.workflow === "source" && state.source === "aid") {
    return `${hp + amount} / ${max + amount} HP`;
  }
  if (state.workflow === "source" && state.source === "leader") {
    return `${hp} / ${max} HP · ${Math.max(temp, amount)} temp`;
  }
  if (state.kind === "damage") {
    return `${Math.max(0, hp - Math.max(0, amount - temp))} / ${max} HP`;
  }
  if (state.kind === "healing") {
    return `${Math.min(max, hp + amount)} / ${max} HP`;
  }
  if (state.kind === "temporary") {
    return `${hp} / ${max} HP · ${Math.max(temp, amount)} temp`;
  }
  return `${hp + amount} / ${max + amount} HP`;
}

function updateTargets() {
  const selected = selectedRows();
  const count = selected.length;
  q("#target-count").textContent = `${count} selected`;

  qa(".target-row").forEach((row) => {
    row.classList.toggle("is-selected", row.querySelector("input").checked);
    const projectionText = projection(row);
    row.querySelector(".target-projected b").textContent = projectionText;
    const projected = row.querySelector(".target-projected b");
    projected.style.color =
      state.workflow === "quick" && state.kind === "damage" ? "var(--danger)" : "var(--success)";
  });

  const overLimit = state.workflow === "source" && count > sourceContent[state.source].limit;
  q(".target-limit-warning").classList.toggle("is-hidden", !overLimit);
  if (overLimit) {
    q(".target-limit-warning").textContent =
      `${sourceContent[state.source].name} can affect no more than ${sourceContent[state.source].limit} targets.`;
  }
  q("#apply-change").disabled = count === 0 || overLimit;
}

function updateSummary() {
  const count = selectedRows().length;
  const noun = count === 1 ? "target" : "targets";
  if (state.workflow === "source") {
    const content = sourceContent[state.source];
    q("#summary-title").textContent = `${content.name} · ${count} ${noun}`;
    q("#summary-detail").textContent =
      state.source === "aid" ? `1 level ${q("#slot-level").value} spell slot` : content.resource;
    q("#apply-change").textContent = content.action;
    return;
  }
  const content = kindContent[state.kind];
  q("#summary-title").textContent = content.title(state.amount);
  q("#summary-detail").textContent = `${count} ${noun} · no character resources used`;
  q("#apply-change").textContent = content.action;
}

function updateAll() {
  updateTargets();
  updateSummary();
}

function loadScenario(name) {
  const scenario = scenarios[name];
  qa(".prototype-scenario").forEach((button) =>
    button.classList.toggle("is-active", button.dataset.scenario === name),
  );
  document.body.classList.remove("dialog-closed");
  if (scenario.workflow === "quick") {
    state.amount = scenario.amount;
    q("#amount").value = String(scenario.amount);
    q("#reason").value = scenario.reason;
    setKind(scenario.kind);
    setWorkflow("quick");
  } else {
    setSource(scenario.source);
    setWorkflow("source");
  }
  setTargets(scenario.targets);
}

qa(".prototype-scenario").forEach((button) =>
  button.addEventListener("click", () => loadScenario(button.dataset.scenario)),
);

qa(".workflow-tab").forEach((button) =>
  button.addEventListener("click", () => setWorkflow(button.dataset.workflow)),
);

qa(".kind-button").forEach((button) =>
  button.addEventListener("click", () => setKind(button.dataset.kind)),
);

qa(".target-row input").forEach((checkbox) => checkbox.addEventListener("change", updateAll));

q("#amount").addEventListener("input", (event) => {
  state.amount = Math.max(0, Number(event.target.value) || 0);
  updateAll();
});

qa("[data-step]").forEach((button) =>
  button.addEventListener("click", () => {
    state.amount = Math.max(0, state.amount + Number(button.dataset.step));
    q("#amount").value = String(state.amount);
    updateAll();
  }),
);

q("#source-select").addEventListener("change", (event) => setSource(event.target.value));

q("#slot-level").addEventListener("change", () => {
  state.amount = aidAmount();
  q(".current-effect").textContent = `+${state.amount}`;
  q(".maximum-effect").textContent = `+${state.amount}`;
  q(".source-description").textContent =
    `Each target’s current and maximum hit points increase by ${state.amount} for the duration.`;
  updateAll();
});

q("#select-party").addEventListener("click", () => setTargets(["tamsin", "mira", "borin", "nyx"]));
q("#clear-targets").addEventListener("click", () => setTargets([]));

qa(".close-dialog").forEach((button) =>
  button.addEventListener("click", () => document.body.classList.add("dialog-closed")),
);
q(".adjust-trigger").addEventListener("click", () =>
  document.body.classList.remove("dialog-closed"),
);

q("#apply-change").addEventListener("click", () => {
  const toast = q(".toast");
  toast.classList.add("is-visible");
  window.clearTimeout(window.prototypeToastTimer);
  window.prototypeToastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
});

q(".target-search input").addEventListener("input", (event) => {
  const query = event.target.value.trim().toLowerCase();
  qa(".target-row").forEach((row) => {
    row.classList.toggle("is-hidden", !row.textContent.toLowerCase().includes(query));
  });
});

loadScenario("quick");
