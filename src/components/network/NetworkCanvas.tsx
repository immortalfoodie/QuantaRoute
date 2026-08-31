import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useStore } from '../../store/useStore';
import { getCongestionColor } from '../../engine/traffic-simulator';
import { VEHICLE_COLORS } from '../../engine/types';

interface NetworkCanvasProps {
  highlightVehicleId?: string | null;
  showZoomControls?: boolean;
  showVehicles?: boolean;
}

interface VehicleAnimState {
  vehicleId: string;
  routeIndex: number;
  edgeProgress: number;
  color: string;
  x: number;
  y: number;
}

export function NetworkCanvas({ highlightVehicleId, showZoomControls = true, showVehicles = true }: NetworkCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    network,
    showOptimizedRoutes,
    optimizedRoutes,
    selectedNode,
    selectedRoad,
    setSelectedNode,
    setSelectedRoad,
  } = useStore();

  const [transform, setTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const animationRef = useRef<number>(0);
  const vehicleStatesRef = useRef<VehicleAnimState[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (e) => setTransform(e.transform));

    d3.select(canvas).call(zoom).on('click', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const transformCurrent = d3.zoomTransform(canvas);
      const x = transformCurrent.invertX(rawX);
      const y = transformCurrent.invertY(rawY);

      let hitNode: string | null = null;
      let hitRoad: string | null = null;

      for (const node of network.nodes) {
        const r = node.type === 'intersection' ? 10 : 16;
        const dx = node.x - x;
        const dy = node.y - y;
        if (dx * dx + dy * dy <= r * r) {
          hitNode = node.id;
          break;
        }
      }

      if (!hitNode) {
        const nodeMap = new Map(network.nodes.map(n => [n.id, n]));
        let minDist = 12;

        for (const road of network.roads) {
          const n1 = nodeMap.get(road.from);
          const n2 = nodeMap.get(road.to);
          if (!n1 || !n2) continue;

          const l2 = (n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2;
          if (l2 === 0) continue;

          let t = ((x - n1.x) * (n2.x - n1.x) + (y - n1.y) * (n2.y - n1.y)) / l2;
          t = Math.max(0, Math.min(1, t));

          const px = n1.x + t * (n2.x - n1.x);
          const py = n1.y + t * (n2.y - n1.y);
          const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
          if (dist < minDist) {
            minDist = dist;
            hitRoad = road.id;
          }
        }
      }

      setSelectedNode(hitNode);
      setSelectedRoad(hitNode ? null : hitRoad);
    });

    d3.select(canvas).call(zoom.transform, d3.zoomIdentity);

    return () => {
      d3.select(canvas).on('.zoom', null).on('click', null);
    };
  }, [network.nodes, network.roads, setSelectedNode, setSelectedRoad]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const container = containerRef.current;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodeMap = new Map(network.nodes.map(n => [n.id, n]));

    const initVehicleStates = () => {
      const activeRoutes = optimizedRoutes.filter(r => r.nodes.length > 2);
      vehicleStatesRef.current = activeRoutes.map((route, i) => ({
        vehicleId: route.vehicleId,
        routeIndex: 0,
        edgeProgress: Math.random() * 0.5,
        color: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
        x: nodeMap.get(route.nodes[0])?.x ?? 0,
        y: nodeMap.get(route.nodes[0])?.y ?? 0,
      }));
    };

    initVehicleStates();

    const render = (time: number) => {
      const t = transform;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f5f2eb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);
      ctx.strokeStyle = '#e8e4dc';
      ctx.lineWidth = 0.5 / t.k;
      const gridSize = 40;
      const bounds = { minX: -200, maxX: 1200, minY: -200, maxY: 900 };
      for (let gx = bounds.minX; gx <= bounds.maxX; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, bounds.minY); ctx.lineTo(gx, bounds.maxY); ctx.stroke();
      }
      for (let gy = bounds.minY; gy <= bounds.maxY; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(bounds.minX, gy); ctx.lineTo(bounds.maxX, gy); ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.k, t.k);

      // Roads
      for (const road of network.roads) {
        const n1 = nodeMap.get(road.from);
        const n2 = nodeMap.get(road.to);
        if (!n1 || !n2) continue;

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);

        const isSelected = selectedRoad === road.id;

        if (road.isClosed) {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 3 / t.k;
          ctx.setLineDash([8 / t.k, 6 / t.k]);
        } else {
          ctx.setLineDash([]);
          const baseColor = getCongestionColor(road.congestion);
          ctx.strokeStyle = isSelected ? '#1a1a1a' : baseColor;
          ctx.lineWidth = (road.isMainRoad ? 2.5 : 1.5) / t.k + (isSelected ? 2 / t.k : 0);
          ctx.globalAlpha = isSelected ? 1 : Math.max(0.4, 0.35 + road.congestion * 0.65);
        }

        ctx.stroke();
        ctx.globalAlpha = 1;

        // Traffic flow particles
        if (!road.isClosed && road.congestion > 0.05) {
          const speed = Math.max(0.02, road.currentSpeed / 200);
          const offset = (time * speed * 0.03) % 1;
          const px = n1.x + (n2.x - n1.x) * offset;
          const py = n1.y + (n2.y - n1.y) * offset;
          ctx.beginPath();
          ctx.arc(px, py, 2 / t.k, 0, Math.PI * 2);
          ctx.fillStyle = getCongestionColor(road.congestion);
          ctx.fill();
        }
      }

      ctx.setLineDash([]);

      // Optimized routes
      if (showOptimizedRoutes && optimizedRoutes.length > 0) {
        for (let i = 0; i < optimizedRoutes.length; i++) {
          const route = optimizedRoutes[i];
          if (!route || route.nodes.length < 2) continue;

          const isHighlighted = !highlightVehicleId || route.vehicleId === highlightVehicleId;
          const color = VEHICLE_COLORS[i % VEHICLE_COLORS.length];

          ctx.beginPath();
          const startNode = nodeMap.get(route.nodes[0]);
          if (startNode) ctx.moveTo(startNode.x, startNode.y);

          for (let j = 1; j < route.nodes.length; j++) {
            const node = nodeMap.get(route.nodes[j]);
            if (node) ctx.lineTo(node.x, node.y);
          }

          ctx.strokeStyle = color;
          ctx.lineWidth = (isHighlighted ? 4 : 2) / t.k;
          ctx.globalAlpha = isHighlighted ? 0.95 : 0.3;
          ctx.setLineDash(isHighlighted ? [10 / t.k, 4 / t.k] : [6 / t.k, 6 / t.k]);
          ctx.lineDashOffset = isHighlighted ? -(time * 0.025) % 14 : 0;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.setLineDash([]);
        }
      }

      // Vehicle animation along routes
      if (showVehicles && showOptimizedRoutes && optimizedRoutes.length > 0) {
        const activeRoutes = optimizedRoutes.filter(r => r.nodes.length > 2);

        activeRoutes.forEach((route, ri) => {
          let vs = vehicleStatesRef.current.find(v => v.vehicleId === route.vehicleId);
          if (!vs) {
            vs = {
              vehicleId: route.vehicleId,
              routeIndex: 0,
              edgeProgress: 0,
              color: VEHICLE_COLORS[ri % VEHICLE_COLORS.length],
              x: 0, y: 0,
            };
            vehicleStatesRef.current.push(vs);
          }

          const isHighlighted = !highlightVehicleId || route.vehicleId === highlightVehicleId;
          if (!isHighlighted) return;

          const speed = 0.0008;
          vs.edgeProgress += speed;
          if (vs.edgeProgress >= 1) {
            vs.edgeProgress = 0;
            vs.routeIndex = (vs.routeIndex + 1) % (route.nodes.length - 1);
          }

          const fromNode = nodeMap.get(route.nodes[vs.routeIndex]);
          const toNode = nodeMap.get(route.nodes[vs.routeIndex + 1]);
          if (fromNode && toNode) {
            vs.x = fromNode.x + (toNode.x - fromNode.x) * vs.edgeProgress;
            vs.y = fromNode.y + (toNode.y - fromNode.y) * vs.edgeProgress;

            const size = 7 / t.k;
            ctx.save();
            ctx.translate(vs.x, vs.y);
            ctx.fillStyle = vs.color;
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 2 / t.k;
            ctx.beginPath();
            ctx.rect(-size / 2, -size / 2, size, size);
            ctx.fill();
            ctx.stroke();

            // Direction indicator
            const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
            ctx.rotate(angle);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(size * 0.3, 0);
            ctx.lineTo(-size * 0.2, -size * 0.25);
            ctx.lineTo(-size * 0.2, size * 0.25);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        });
      }

      // Nodes
      for (const node of network.nodes) {
        const isSelected = selectedNode === node.id;

        ctx.beginPath();
        if (node.type === 'depot') {
          const s = 11 / t.k + (isSelected ? 3 / t.k : 0);
          ctx.moveTo(node.x, node.y - s);
          ctx.lineTo(node.x + s, node.y);
          ctx.lineTo(node.x, node.y + s);
          ctx.lineTo(node.x - s, node.y);
          ctx.closePath();
          ctx.fillStyle = '#7c3aed';
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2 / t.k;
        } else if (node.type === 'customer') {
          const s = 6 / t.k + (isSelected ? 2 / t.k : 0);
          ctx.rect(node.x - s, node.y - s, s * 2, s * 2);
          ctx.fillStyle = '#2563eb';
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 1.5 / t.k;
        } else {
          const r = 3 / t.k + (isSelected ? 2 / t.k : 0);
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? '#1a1a1a' : '#a3a3a3';
          ctx.strokeStyle = 'transparent';
        }

        ctx.fill();
        if (node.type !== 'intersection' || isSelected) ctx.stroke();

        if (isSelected) {
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2 / t.k;
          ctx.setLineDash([4 / t.k, 4 / t.k]);
          ctx.beginPath();
          ctx.arc(node.x, node.y, 18 / t.k, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (t.k > 0.7 && (node.type === 'depot' || node.type === 'customer' || isSelected)) {
          ctx.font = `bold ${11 / t.k}px Inter, sans-serif`;
          ctx.fillStyle = '#1a1a1a';
          ctx.fillText(node.label || node.id, node.x + 12 / t.k, node.y + 4 / t.k);
        }
      }

      ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [network, transform, showOptimizedRoutes, optimizedRoutes, selectedNode, selectedRoad, highlightVehicleId, showVehicles]);

  return (
    <div className="w-full h-full relative bg-bg-primary" ref={containerRef}>
      <canvas ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {showZoomControls && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
          <button
            onClick={() => d3.select(canvasRef.current!).transition().duration(400).call(
              d3.zoom<HTMLCanvasElement, unknown>().transform as any,
              d3.zoomIdentity,
            )}
            className="w-9 h-9 bg-bg-surface border-2 border-border flex items-center justify-center hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors shadow-[2px_2px_0_#1a1a1a]"
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
