const ZONES_URL = '/configuration/zones';
const TRANSFERS_URL = '/tracking/active-transfers';
const POLL_INTERVAL_MS = 7000;
const TOKEN_STORAGE_KEY = 'move_operator_token';

const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');
const connectBtn = document.getElementById('connect');

const map = L.map('map').setView([-34.9011, -56.1645], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(map);

const zoneLayer = L.layerGroup().addTo(map);
const vehicleMarkers = new Map();
let pollHandle = null;
let zoneCount = 0;
let adminOnlyZones = false;

function authHeaders() {
  const token = tokenInput.value.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    const error = new Error(`${url} -> ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function ringToLatLng(coordinates) {
  return coordinates.map(([lng, lat]) => [lat, lng]);
}

async function loadZones() {
  const zones = await fetchJson(ZONES_URL);
  zoneCount = zones.length;
  zoneLayer.clearLayers();
  for (const zone of zones) {
    const color = zone.type === 'RED_ZONE' ? '#dc2626' : '#16a34a';
    L.polygon(ringToLatLng(zone.coordinates), { color, weight: 2, fillOpacity: 0.2 })
      .bindPopup(`<strong>${zone.name}</strong><br/>${zone.type}`)
      .addTo(zoneLayer);
  }
}

function vehicleIcon(hasActiveAlerts) {
  const color = hasActiveAlerts ? '#dc2626' : '#2563eb';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.5);"></div>`,
    iconSize: [14, 14],
  });
}

function clearVehicleMarkers() {
  for (const marker of vehicleMarkers.values()) {
    map.removeLayer(marker);
  }
  vehicleMarkers.clear();
}

async function pollActiveTransfers() {
  if (adminOnlyZones) {
    statusEl.textContent = `Conectado · ${zoneCount} zona(s) total(es) · ${new Date().toLocaleTimeString()}`;
    return;
  }

  try {
    const transfers = await fetchJson(TRANSFERS_URL);
    const seen = new Set();

    for (const transfer of transfers) {
      if (!transfer.lastPosition) continue;
      const [lng, lat] = transfer.lastPosition.coordinates;
      seen.add(transfer.id);

      const alertBadge = transfer.hasActiveAlerts
        ? ' <strong style="color:#dc2626">&#9888; ALERTA</strong>'
        : '';
      const popup = `
        <strong>Traslado #${transfer.id}</strong><br/>
        ${transfer.origin} &rarr; ${transfer.destination}<br/>
        Vehículo: ${transfer.vehicleLabel ?? transfer.vehicleId}<br/>
        Conductor: ${transfer.driverName ?? transfer.driverId}<br/>
        Estado: ${transfer.status}${alertBadge}
      `;

      let marker = vehicleMarkers.get(transfer.id);
      if (!marker) {
        marker = L.marker([lat, lng], { icon: vehicleIcon(transfer.hasActiveAlerts) }).addTo(map);
        vehicleMarkers.set(transfer.id, marker);
      } else {
        marker.setLatLng([lat, lng]);
        marker.setIcon(vehicleIcon(transfer.hasActiveAlerts));
      }
      marker.bindPopup(popup);
    }

    for (const [id, marker] of vehicleMarkers.entries()) {
      if (!seen.has(id)) {
        map.removeLayer(marker);
        vehicleMarkers.delete(id);
      }
    }

    statusEl.textContent = `Conectado · ${transfers.length} traslado(s) activo(s) · ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    if (error.status === 403) {
      adminOnlyZones = true;
      clearVehicleMarkers();
      statusEl.textContent = `Conectado · ${zoneCount} zona(s) total(es) · ${new Date().toLocaleTimeString()}`;
      return;
    }
    statusEl.textContent = `Error: ${error.message}`;
  }
}

function start() {
  localStorage.setItem(TOKEN_STORAGE_KEY, tokenInput.value.trim());
  if (pollHandle) clearInterval(pollHandle);
  adminOnlyZones = false;
  clearVehicleMarkers();

  loadZones()
    .catch((error) => {
      statusEl.textContent = `Error al cargar zonas: ${error.message}`;
    })
    .then(() => {
      pollActiveTransfers();
      pollHandle = setInterval(pollActiveTransfers, POLL_INTERVAL_MS);
    });
}

connectBtn.addEventListener('click', start);

const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
if (savedToken) {
  tokenInput.value = savedToken;
}
