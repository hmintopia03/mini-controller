let namespace = "default";
let eventSource = null;
let livePaused = false;
const seenEventKeys = new Set();

function connectEventStream() {
  const status = document.getElementById("liveStatus");

  if (eventSource) {
    eventSource.close();
  }

  if (namespace !== "default") {
    status.textContent = "● No access";
    return;
  }

  eventSource = new EventSource(
    `/watch/events?namespace=${namespace}`
  );

  eventSource.onopen = () => {
    status.textContent = "● Live";
  };

  eventSource.onerror = () => {
    status.textContent = "● Disconnected";
  };

  eventSource.onmessage = (event) => {
    if (livePaused) return;

    const payload = JSON.parse(event.data);

    if (payload.watch_type === "ERROR") {
      status.textContent = "● Watch error";
      prependEvent({
        event: {
          reason: "Watch Error",
          message: payload.error,
          type: "Error",
        },
      });
      return;
    }

    prependEvent(payload);
  };
}

function prependEvent(payload) {

  const root = document.getElementById("events");
  const e = payload.event;

  const key = eventKey(e);

  if (seenEventKeys.has(key)) {
    return;
  }
  seenEventKeys.add(key);


  const card = document.createElement("div");
  card.className = `event event-${(e.type ?? "normal").toLowerCase()}`;

  card.innerHTML = `
    <strong>${e.reason}</strong>
    <p>${e.message}</p>
    <small>${e.type}</small>
  `;

  root.prepend(card);

  while (root.children.length > 50) {
    root.removeChild(root.lastChild);
  }
}

function toggleLiveEvents() {
  livePaused = !livePaused;

  const button = document.getElementById("pauseLiveButton");
  const status = document.getElementById("liveStatus");

  if (livePaused) {
    button.textContent = "Resume Live";
    status.textContent = "● Paused";
    return;
  }

  button.textContent = "Pause Live";
  status.textContent = "● Live";
}

function clearEvents() {
  document.getElementById("events").innerHTML = "";
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}

function eventKey(e) {
  return [
    e.name ?? "",
    e.reason ?? "",
    e.message ?? "",
    e.last_timestamp ?? "",
    e.involved_object_name ?? "",
  ].join("|");
}

async function loadDeployments() {
  const root = document.getElementById("deployments");

  try {
    const data = await fetchJson(
      `/deployments?namespace=${namespace}`
    );
  root.innerHTML = data.deployments.map((d) => {
    return `
      <div class="card">
        <h3>${d.name}</h3>
        <p>Namespace: ${d.namespace}</p>
        <p>Replicas: ${d.ready_replicas ?? 0} / ${d.replicas ?? 0}</p>
        <p>Image: ${d.image ?? "-"}</p>

        <button onclick="loadDeploymentDetail('${d.name}')">Detail</button>
        <button onclick="scaleDeployment('${d.name}')">Scale</button>
        <button onclick="restartDeployment('${d.name}')">Restart</button>
        <button onclick="loadPods('${d.name}')">Pods</button>
        <button onclick="loadRollout('${d.name}')">Rollout</button>

        <pre id="detail-${d.name}"></pre>
      </div>
    `;
  }).join("");
} catch (err) {

    root.innerHTML = `
      <div class="card">
        <h3>Cannot access namespace</h3>
        <p>${namespace}</p>
        <pre>${err.message}</pre>
      </div>
    `;
  }
}

async function loadDeploymentDetail(deploymentName) {
  const data = await fetchJson(
    `/deployments/${deploymentName}?namespace=${namespace}`
  );

  const detail = document.getElementById(`detail-${deploymentName}`);
  detail.textContent = JSON.stringify(data, null, 2);
}



async function scaleDeployment(deploymentName) {
  const input = prompt(`Scale ${deploymentName} to replicas:`);

  if (input === null) return;

  const replicas = Number(input);

  if (!Number.isInteger(replicas) || replicas < 0) {
    alert("Replicas must be a non-negative integer.");
    return;
  }

  const data = await fetchJson(
    `/deployments/${deploymentName}/scale?namespace=${namespace}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        replicas: replicas,
      }),
    }
  );

  const detail = document.getElementById(`detail-${deploymentName}`);

  detail.textContent = [
    `Deployment: ${data.deployment}`,
    `Namespace: ${data.namespace}`,
    `Replicas requested: ${data.replicas}`,
    `Status: ${data.status}`,
  ].join("\n");

  await loadDeployments();
}

async function restartDeployment(deploymentName) {
  const ok = confirm(`Restart deployment ${deploymentName}?`);

  if (!ok) return;

  await fetchJson(
    `/deployments/${deploymentName}/restart?namespace=${namespace}`,
    {
      method: "POST",
    }
  );

  await loadDeployments();
}

async function loadEvents() {
  const root = document.getElementById("events");

  try {
    const data = await fetchJson(`/events?namespace=${namespace}`);

    root.innerHTML = data.events.map((e) => {
      seenEventKeys.add(eventKey(e));

      return `
        <div class="event event-${(e.type ?? "normal").toLowerCase()}">
          <strong>${e.reason ?? "Event"}</strong>
          <p>${e.message ?? ""}</p>
          <small>${e.type ?? ""} ${e.last_timestamp ?? ""}</small>
        </div>
      `;
    }).join("");
  } catch (err) {
    root.innerHTML = `<p>Events endpoint not available yet.</p>`;
  }
}

async function refreshAll() {
  try {
    await loadHealth();
    await loadMetrics();
    await loadDeployments();
    await loadEvents();
    updateLastUpdated();
  } catch (err) {
    console.error("Refresh failed:", err);
  }
}

async function loadNamespaces() {
  const namespaces = await fetchJson("/namespaces");
  const select = document.getElementById("namespaceSelect");

  select.innerHTML = namespaces.map((ns) => {
    const disabled = ns.name === "default" ? "" : "disabled";

    return `
      <option value="${ns.name}" ${disabled}>
        ${ns.name} (${ns.status})${disabled ? " - no access" : ""}
      </option>
    `;
  }).join("");

  select.value = namespace;

  select.addEventListener("change", async () => {
    namespace = select.value;
    await refreshAll();
    connectEventStream();
  });
}

async function loadHealth() {
  const root = document.getElementById("health");

  try {
    const apiHealth = await fetchJson("/health");
    const kubeHealth = await fetchJson("/health/kubernetes");

    root.innerHTML = `
      <div class="card">
        <p>API: ${apiHealth.status}</p>
        <p>Kubernetes: ${kubeHealth.status}</p>
        <p>Namespace: ${kubeHealth.namespace ?? "-"}</p>
        <p>Reason: ${kubeHealth.reason ?? "-"}</p>
      </div>
    `;
  } catch (err) {
    root.innerHTML = `
      <div class="card">
        <p>Health check failed</p>
        <p>${err.message}</p>
      </div>
    `;
  }
}

async function loadPods(deploymentName) {
  const pods = await fetchJson(
    `/deployments/${deploymentName}/pods?namespace=${namespace}`
  );

  const detail = document.getElementById(`detail-${deploymentName}`);

  detail.innerHTML = pods.map((p) => {
    return `
Pod: ${p.name}
Phase: ${p.phase}
Ready: ${p.ready}
Restarts: ${p.restart_count ?? "-"}
Node: ${p.node_name ?? "-"}

<button onclick="loadPodLogs('${deploymentName}', '${p.name}')">Logs</button>
`;
  }).join("\n\n---\n\n");
}

async function loadRollout(deploymentName) {
  const data = await fetchJson(
    `/deployments/${deploymentName}/rollout?namespace=${namespace}`
  );

  const detail = document.getElementById(`detail-${deploymentName}`);
  const status = data.rollout_complete
  ? "✅ Complete"
  : "⏳ Rolling Out";
detail.textContent = [
  `Deployment: ${data.name}`,
  `Namespace: ${data.namespace}`,
  "",
  `Status: ${status}`,
  "",
  `Desired replicas: ${data.desired_replicas}`,
  `Updated replicas: ${data.updated_replicas}`,
  `Ready replicas: ${data.ready_replicas}`,
  `Available replicas: ${data.available_replicas}`
].join("\n");
}


async function loadPodLogs(deploymentName, podName) {
  const data = await fetchJson(
    `/pods/${podName}/logs?namespace=${namespace}&tail_lines=100`
  );

  const detail = document.getElementById(`detail-${deploymentName}`);

  detail.textContent = [
    `Pod: ${data.pod}`,
    `Namespace: ${data.namespace}`,
    `Tail lines: ${data.tail_lines}`,
    "",
    data.logs ?? "",
  ].join("\n");
}

async function loadMetrics() {
  const root = document.getElementById("metrics");

  try {
    const deploymentsData = await fetchJson(`/deployments?namespace=${namespace}`);
    const eventsData = await fetchJson(`/events?namespace=${namespace}`);
    const namespacesData = await fetchJson("/namespaces");

    const deployments = deploymentsData.deployments ?? [];
    const events = eventsData.events ?? [];
    const namespaces = namespacesData ?? [];

    root.innerHTML = `
      <div class="card">
        <p>Current namespace: ${namespace}</p>
        <p>Namespaces: ${namespaces.length}</p>
        <p>Deployments: ${deployments.length}</p>
        <p>Events: ${events.length}</p>
      </div>
    `;
  } catch (err) {
    root.innerHTML = `
      <div class="card">
        <p>Metrics unavailable for namespace: ${namespace}</p>
        <pre>${err.message}</pre>
      </div>
    `;
  }
}

function updateLastUpdated() {
  const el = document.getElementById("lastUpdated");
  el.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}



async function init() {

  await loadNamespaces();
  await refreshAll();
  connectEventStream();
}
init();

setInterval(async () => {
  if (namespace !== "default") return;

  try {
    await refreshAll();
  } catch (err) {
    console.error("Auto refresh failed:", err);
  }
}, 5000);
