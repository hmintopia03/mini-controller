let namespace = "default";
let eventSource = null;
let livePaused = false;
const seenEventKeys = new Set();

function setLiveStatus(status) {
  const el = document.getElementById("liveStatus");

  el.className = `live-status ${status}`;

  if (status === "live") el.textContent = "● Live";
  if (status === "paused") el.textContent = "● Paused";
  if (status === "disconnected") el.textContent = "● Disconnected";
  if (status === "error") el.textContent = "● Watch error";
  if (status === "no-access") el.textContent = "● No access";
}

function connectEventStream() {
  const status = document.getElementById("liveStatus");
  let reconnectTimer = null;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

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
    setLiveStatus("live");
  };

  eventSource.onerror = () => {
    setLiveStatus("disconnected");

    eventSource.close();

    reconnectTimer = setTimeout(() => {
      connectEventStream();
    }, 3000);
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
    setLiveStatus("paused");
    return;
  }

  button.textContent = "Pause Live";
  setLiveStatus("live");
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

function getDeploymentStatus(dep) {
  if (dep.ready_replicas === dep.replicas && dep.replicas > 0) return "healthy";
  if (dep.ready_replicas === 0 && dep.replicas > 0) return "error";
  if (dep.ready_replicas < dep.replicas) return "warning";
  if (dep.replicas === 0) return "scaled-zero";
  return "unknown";
}

function getPodStatus(pod) {
  const phase = pod.phase;

  if (phase === "Running") return "running";
  if (phase === "Pending") return "pending";
  if (phase === "Succeeded") return "succeeded";
  if (phase === "Failed") return "failed";
  if (phase === "Unknown") return "unknown";

  return "unknown";
}

function getDeploymentStatus(d) {
  const replicas = d.replicas ?? 0;
  const ready = d.ready_replicas ?? 0;

  if (replicas === 0) return "scaled-zero";
  if (ready === replicas) return "healthy";
  if (ready === 0) return "error";

  return "warning";
}

function getPodStatus(pod) {
  const phase = pod.phase;

  if (phase === "Running") return "running";
  if (phase === "Pending") return "pending";
  if (phase === "Succeeded") return "succeeded";
  if (phase === "Failed") return "failed";
  if (phase === "Unknown") return "unknown";

  return "unknown";
}

function statusBadge(status) {
  return `<span class="status-badge status-${status}">${status}</span>`;
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

async function loadDeployments() {
  const root = document.getElementById("deployments");

  try {
    const data = await fetchJson(
      `/deployments?namespace=${namespace}`
    );

    root.innerHTML = data.deployments.map((d) => {
      const status = getDeploymentStatus(d);

  return `
    <div class="card deployment-card">
      <div class="deployment-header">
        <h3>${d.name}</h3>
        ${statusBadge(status)}
      </div>

      <div class="deployment-meta">
        <div>
          <span>Ready</span>
          <strong>${d.ready_replicas ?? 0} / ${d.replicas ?? 0}</strong>
        </div>

        <div>
          <span>Namespace</span>
          <strong>${d.namespace}</strong>
        </div>

        <div>
          <span>Image</span>
          <strong>${d.image ?? "-"}</strong>
        </div>
      </div>

      <div class="deployment-actions">
        <button onclick="loadDeploymentDetail('${d.name}')">Detail</button>
        <button onclick="scaleDeployment('${d.name}')">Scale</button>
        <button onclick="restartDeployment('${d.name}')">Restart</button>
        <button onclick="loadPods('${d.name}')">Pods</button>
        <button onclick="loadRollout('${d.name}')">Rollout</button>
      </div>

      <div id="detail-${d.name}" class="deployment-detail"></div>
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

async function loadPods(deploymentName) {
  const pods = await fetchJson(
    `/deployments/${deploymentName}/pods?namespace=${namespace}`
  );

  const detail = document.getElementById(`detail-${deploymentName}`);

  detail.innerHTML = pods.map((p) => {
    const status = getPodStatus(p);

    return `
      <div class="pod-card">
        <div class="pod-header">
          <span>Pod: ${p.name}</span>
          ${statusBadge(status)}
        </div>
        <div class="pod-meta">
          <div>Phase: ${p.phase}</div>
          <div>Ready: ${p.ready ?? "-"}</div>
          <div>Restarts: ${p.restart_count ?? "-"}</div>
          <div>Node: ${p.node_name ?? "-"}</div>
        </div>
        <button class="logs-button" onclick="loadPodLogs('${deploymentName}', '${p.name}')">Logs</button>
      </div>
    `;
  }).join("");
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

    const deploymentStatuses = deployments.map(getDeploymentStatus);

    const healthyCount = deploymentStatuses.filter((s) => s === "healthy").length;
    const warningCount = deploymentStatuses.filter((s) => s === "warning").length;
    const errorCount = deploymentStatuses.filter((s) => s === "error").length;
    const scaledZeroCount = deploymentStatuses.filter((s) => s === "scaled-zero").length;

    root.innerHTML = `
      <div class="card">
        <p>Current namespace: ${namespace}</p>
        <p>Namespaces: ${namespaces.length}</p>
        <p>Deployments: ${deployments.length}</p>
        <p>Events: ${events.length}</p>

        <hr>

        <div class="summary-grid">
          <div class="summary-item" id="summary-healthy">
            <strong>${healthyCount}</strong>
            <span>Ready</span>
          </div>

          <div class="summary-item" id="summary-warning">
            <strong>${warningCount}</strong>
            <span>Warning</span>
          </div>

          <div class="summary-item" id="summary-error ">
            <strong>${errorCount}</strong>
            <span>Not Ready</span>
          </div>

          <div class="summary-item id="summary-scaled-zero">
            <strong>${scaledZeroCount}</strong>
            <span>Scaled Zero</span>
          </div>
        </div>
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
    await loadHealth();
    await loadMetrics();
    await loadEvents();
    updateLastUpdated();
  } catch (err) {
    console.error("Auto refresh failed:", err);
  }
}, 5000);