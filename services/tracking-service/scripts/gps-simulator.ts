import { readFileSync } from 'node:fs';

type Scenario = 'normal' | 'red-zone' | 'stop';
type Coordinates = [number, number];

type SimVehicle = {
  transferId: string;
  vehicleId: number;
  deviceId: string;
  scenario: Scenario;
};

const GPS_URL = process.env.TRACKING_GPS_URL ?? 'http://localhost:4004/api/v1/tracking/gps/reading';
const DEVICE_SECRET = process.env.GPS_DEVICE_SECRET ?? 'dev-secret';
const INTERVAL_MS = Number(process.env.SIM_INTERVAL_MS ?? 10000);
const PACKET_LOSS = Number(process.env.SIM_PACKET_LOSS ?? 0);

const NORMAL_ROUTE: Coordinates[] = [
  [-56.1645, -34.9011],
  [-56.1689, -34.9055],
  [-56.1731, -34.9089],
  [-56.1802, -34.9123],
  [-56.1875, -34.9156],
];

const RED_ZONE_ROUTE: Coordinates[] = [
  [-56.2009, -34.8721],
  [-56.2025, -34.8735],
  [-56.2041, -34.8749],
  [-56.2057, -34.8763],
];

function routeFor(scenario: Scenario): Coordinates[] {
  if (scenario === 'red-zone') return RED_ZONE_ROUTE;
  if (scenario === 'stop') return [NORMAL_ROUTE[0]];
  return NORMAL_ROUTE;
}

function loadVehicles(): SimVehicle[] {
  const configPath = process.env.SIM_CONFIG;
  if (configPath) {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as SimVehicle[];
  }

  const transferId = process.env.SIM_TRANSFER_ID;
  if (!transferId) {
    throw new Error('Provide SIM_CONFIG or SIM_TRANSFER_ID/SIM_VEHICLE_ID/SIM_DEVICE_ID');
  }

  return [
    {
      transferId,
      vehicleId: Number(process.env.SIM_VEHICLE_ID ?? 1),
      deviceId: process.env.SIM_DEVICE_ID ?? 'GPS-001',
      scenario: (process.env.SIM_SCENARIO as Scenario) ?? 'normal',
    },
  ];
}

async function sendReading(vehicle: SimVehicle, coordinates: Coordinates): Promise<void> {
  if (Math.random() < PACKET_LOSS) {
    console.log(`[${vehicle.deviceId}] packet lost (simulated)`);
    return;
  }

  try {
    const response = await fetch(GPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-secret': DEVICE_SECRET,
      },
      body: JSON.stringify({
        transferId: vehicle.transferId,
        vehicleId: vehicle.vehicleId,
        deviceId: vehicle.deviceId,
        coordinates,
        timestamp: new Date().toISOString(),
      }),
    });
    console.log(`[${vehicle.deviceId}] ${coordinates.join(',')} -> ${response.status}`);
  } catch (error) {
    console.error(`[${vehicle.deviceId}] send failed`, error);
  }
}

function startVehicle(vehicle: SimVehicle): void {
  const route = routeFor(vehicle.scenario);
  let index = 0;

  const tick = async (): Promise<void> => {
    const coordinates = route[index % route.length];
    index += 1;
    await sendReading(vehicle, coordinates);
  };

  void tick();
  setInterval(() => void tick(), INTERVAL_MS);
}

function main(): void {
  const vehicles = loadVehicles();
  console.log(
    `Starting GPS simulator: ${vehicles.length} vehicle(s), interval ${INTERVAL_MS}ms, target ${GPS_URL}`
  );
  for (const vehicle of vehicles) {
    startVehicle(vehicle);
  }
}

main();
