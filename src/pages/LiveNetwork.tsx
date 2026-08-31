import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { NetworkCanvas } from '../components/network/NetworkCanvas';
import { FloatingPanel, TrafficLegend, InspectorPanel, TabBar } from '../components/design-system';
import { getCongestionLabel } from '../engine/traffic-simulator';
import { motion, AnimatePresence } from 'framer-motion';

type Layer = 'network' | 'traffic' | 'routes' | 'vehicles';
type PanelTab = 'layers' | 'legend';

export function LiveNetwork() {
  const {
    network,
    selectedNode,
    selectedRoad,
    setSelectedNode,
    setSelectedRoad,
    showOptimizedRoutes,
    toggleOptimizedRoutes,
    currentResult,
    optimizedRoutes,
  } = useStore();

  const [activeLayers, setActiveLayers] = useState<Set<Layer>>(new Set(['network', 'traffic', 'routes', 'vehicles']));
  const [showVehicleLayer, setShowVehicleLayer] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>('layers');

  const node = selectedNode ? network.nodes.find(n => n.id === selectedNode) : null;
  const road = selectedRoad ? network.roads.find(r => r.id === selectedRoad) : null;

  const selectedVehicleRoute = selectedNode
    ? optimizedRoutes.find(r => r.nodes.includes(selectedNode))
    : null;

  const toggleLayer = (layer: Layer) => {
    if (layer === 'routes') {
      if (currentResult) toggleOptimizedRoutes();
      return;
    }
    if (layer === 'vehicles') {
      setShowVehicleLayer(v => !v);
      return;
    }
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const routesActive = showOptimizedRoutes && !!currentResult;
  const vehiclesActive = showVehicleLayer && routesActive;

  return (
    <div className="w-full h-full relative bg-bg-primary">
      <NetworkCanvas showVehicles={vehiclesActive} />

      <FloatingPanel position="top-left" className="min-w-[200px] p-0 overflow-hidden">
        <TabBar
          tabs={[
            { id: 'layers', label: 'Layers' },
            { id: 'legend', label: 'Legend' },
          ]}
          active={panelTab}
          onChange={id => setPanelTab(id as PanelTab)}
        />
        <div className="p-4">
          {panelTab === 'layers' && (
            <div className="space-y-1">
              {(['network', 'traffic', 'routes', 'vehicles'] as Layer[]).map(layer => {
                const isActive = layer === 'routes' ? routesActive
                  : layer === 'vehicles' ? vehiclesActive
                  : activeLayers.has(layer);
                return (
                  <button
                    key={layer}
                    type="button"
                    onClick={() => toggleLayer(layer)}
                    disabled={layer === 'routes' && !currentResult}
                    className={`w-full text-left px-3 py-2.5 text-[14px] capitalize font-medium transition-colors border-2 ${
                      isActive
                        ? 'border-border bg-bg-inverse text-text-inverse'
                        : 'border-transparent text-text-muted hover:text-text-primary hover:bg-bg-hover'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {layer}
                  </button>
                );
              })}
            </div>
          )}
          {panelTab === 'legend' && <TrafficLegend />}
        </div>
      </FloatingPanel>

      <AnimatePresence>
        {(node || road) && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 right-4 z-20"
          >
            <InspectorPanel
              title={node ? (node.label || `Node ${node.id}`) : `Road ${road?.id}`}
              onClose={() => { setSelectedNode(null); setSelectedRoad(null); }}
            >
              {node && (
                <div className="space-y-4 text-[14px]">
                  <Row label="Type" value={node.type} />
                  <Row label="Coordinates" value={`${Math.round(node.x)}, ${Math.round(node.y)}`} mono />
                  <Row label="District" value={node.district || '—'} />
                  {node.type === 'customer' && (
                    <>
                      <Row
                        label="Demand"
                        value={`${network.customers.find(c => c.nodeId === node.id)?.demand ?? 0} units`}
                      />
                      {selectedVehicleRoute && (
                        <div className="pt-4 border-t-2 border-border-subtle">
                          <div className="label-editorial mb-2">Assigned Route</div>
                          <div className="font-mono text-[14px] font-bold text-text-primary">
                            Vehicle {selectedVehicleRoute.vehicleId.replace('V', '').padStart(2, '0')}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {node.type === 'depot' && (
                    <Row label="Role" value="Distribution Hub" />
                  )}
                </div>
              )}
              {road && (
                <div className="space-y-4 text-[14px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2.5 bg-bg-hover border border-border overflow-hidden">
                      <div
                        className={`h-full ${road.congestion > 0.6 ? 'bg-accent-red' : road.congestion > 0.3 ? 'bg-accent-yellow' : 'bg-accent-green'}`}
                        style={{ width: `${Math.max(5, road.congestion * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[14px] font-bold">{Math.round(road.congestion * 100)}%</span>
                  </div>
                  <Row label="Road ID" value={road.id} mono />
                  <Row
                    label="Status"
                    value={road.isClosed ? 'Closed' : getCongestionLabel(road.congestion)}
                    warn={road.isClosed}
                  />
                  <Row label="Speed" value={`${Math.round(road.currentSpeed)} km/h`} mono />
                  <Row label="Free-flow" value={`${road.freeFlowSpeed} km/h`} mono />
                  <Row label="Distance" value={`${road.distance} km`} mono />
                  <Row label="Type" value={road.isMainRoad ? 'Arterial' : 'Secondary'} />
                </div>
              )}
            </InspectorPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border-subtle pb-3 last:border-0">
      <span className="text-text-muted font-medium">{label}</span>
      <span className={`${mono ? 'font-mono font-bold' : 'font-semibold'} ${warn ? 'text-accent-red' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}
