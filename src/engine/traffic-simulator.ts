// ==========================================================
// Traffic Simulator
// ==========================================================
// Applies dynamic congestion to roads based on presets,
// time-of-day patterns, and user-injected events.

import { Road, TrafficPreset, TrafficEvent, TrafficState } from './types';
import { SeededRandom } from './random';

export function applyTrafficPreset(
  roads: Road[],
  preset: TrafficPreset,
  level: number, // 0..100
  seed: number = 42,
): Road[] {
  const rng = new SeededRandom(seed);
  const factor = level / 100;

  return roads.map(road => {
    let congestion = 0;
    const baseNoise = rng.range(0, 0.15);

    switch (preset) {
      case 'free-flow':
        congestion = baseNoise * 0.3;
        break;
      case 'morning-peak':
        congestion = road.isMainRoad
          ? factor * rng.range(0.4, 0.85) + baseNoise
          : factor * rng.range(0.1, 0.4) + baseNoise;
        break;
      case 'afternoon':
        congestion = factor * rng.range(0.15, 0.45) + baseNoise;
        break;
      case 'evening-peak':
        congestion = road.isMainRoad
          ? factor * rng.range(0.5, 0.9) + baseNoise
          : factor * rng.range(0.15, 0.5) + baseNoise;
        break;
      case 'heavy-congestion':
        congestion = factor * rng.range(0.5, 0.95) + baseNoise;
        break;
      case 'random':
        congestion = rng.range(0, factor * 0.9) + baseNoise;
        break;
    }

    congestion = Math.max(0, Math.min(1, congestion));
    const speedReduction = 1 - congestion * 0.85; // 85% max speed reduction
    const currentSpeed = Math.max(5, road.freeFlowSpeed * speedReduction);

    return {
      ...road,
      congestion,
      currentSpeed: Math.round(currentSpeed * 10) / 10,
    };
  });
}

export function applyTrafficEvent(
  roads: Road[],
  event: TrafficEvent,
): Road[] {
  return roads.map(road => {
    if (road.id !== event.roadId) return road;

    switch (event.type) {
      case 'closure':
        return { ...road, isClosed: true, congestion: 1, currentSpeed: 0 };
      case 'accident':
        return {
          ...road,
          congestion: Math.min(1, road.congestion + event.severity * 0.6),
          currentSpeed: Math.max(5, road.currentSpeed * (1 - event.severity * 0.7)),
        };
      case 'spike':
        return {
          ...road,
          congestion: Math.min(1, road.congestion + event.severity * 0.4),
          currentSpeed: Math.max(5, road.currentSpeed * (1 - event.severity * 0.5)),
        };
      case 'restore':
        return {
          ...road,
          isClosed: false,
          congestion: Math.max(0, road.congestion * 0.3),
          currentSpeed: road.freeFlowSpeed * 0.85,
        };
      default:
        return road;
    }
  });
}

/**
 * Reapply the active, road-scoped incidents after generating a global traffic
 * baseline. Keeping this separate prevents a later preset change from erasing
 * a closure or from turning a local incident into a network-wide state.
 */
export function applyTrafficEvents(roads: Road[], events: TrafficEvent[]): Road[] {
  return events.reduce(
    (updatedRoads, event) => applyTrafficEvent(updatedRoads, event),
    roads,
  );
}

export function createTrafficEvent(
  type: TrafficEvent['type'],
  roadId: string,
  severity: number = 0.7,
): TrafficEvent {
  return {
    id: `EVT-${Date.now()}`,
    type,
    roadId,
    timestamp: Date.now(),
    description: getEventDescription(type, roadId),
    severity,
  };
}

function getEventDescription(type: TrafficEvent['type'], roadId: string): string {
  switch (type) {
    case 'spike': return `Traffic spike detected on ${roadId}`;
    case 'closure': return `Road ${roadId} closed`;
    case 'accident': return `Accident reported on ${roadId}`;
    case 'restore': return `Road ${roadId} restored to normal`;
  }
}

export function getInitialTrafficState(): TrafficState {
  return {
    level: 40,
    preset: 'afternoon',
    events: [],
    timestamp: Date.now(),
  };
}

export function getCongestionColor(congestion: number): string {
  if (congestion < 0.25) return '#4ade80'; // green
  if (congestion < 0.5) return '#facc15';  // yellow
  if (congestion < 0.75) return '#f97316'; // orange
  return '#ef4444';                         // red
}

export function getCongestionLabel(congestion: number): string {
  if (congestion < 0.25) return 'Free Flow';
  if (congestion < 0.5) return 'Moderate';
  if (congestion < 0.75) return 'Heavy';
  return 'Severe';
}
