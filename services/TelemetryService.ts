
import { VRU } from '../types';

export interface TelemetryData {
    timestamp: number;
    machineId: string;
    pressure: number; // PSI
    flowRate: number; // L/h
    temperature: number; // Celsius
    vibration: number; // mm/s
    status: 'Running' | 'Idle' | 'Error';
}

type TelemetryCallback = (data: TelemetryData) => void;

class TelemetryService {
    private subscribers: Map<string, Set<TelemetryCallback>> = new Map();
    private activeInterval: number | null = null;
    
    // Physics state for simulation continuity
    private machineStates: Map<string, {
        pressurePhase: number;
        tempBase: number;
        flowBase: number;
        lastUpdate: number;
    }> = new Map();

    constructor() {
        // Start the "Server" heartbeat
        this.startSimulation();
    }

    /**
     * Subscribe to real-time updates for a specific machine.
     * In a real app, this would send a JSON message to the WSS server: { "action": "subscribe", "id": machineId }
     */
    public subscribe(machineId: string, callback: TelemetryCallback) {
        if (!this.subscribers.has(machineId)) {
            this.subscribers.set(machineId, new Set());
            // Initialize physics state for this machine if new
            if (!this.machineStates.has(machineId)) {
                this.machineStates.set(machineId, {
                    pressurePhase: Math.random() * 100,
                    tempBase: 25 + Math.random() * 10,
                    flowBase: 35 + Math.random() * 10,
                    lastUpdate: Date.now()
                });
            }
        }
        this.subscribers.get(machineId)?.add(callback);
    }

    /**
     * Unsubscribe to stop receiving updates.
     */
    public unsubscribe(machineId: string, callback: TelemetryCallback) {
        if (this.subscribers.has(machineId)) {
            this.subscribers.get(machineId)?.delete(callback);
            if (this.subscribers.get(machineId)?.size === 0) {
                this.subscribers.delete(machineId);
                // Optional: Clean up state if no one is watching
            }
        }
    }

    // --- MOCK SERVER ENGINE ---

    private startSimulation() {
        if (this.activeInterval) return;

        // update every 1000ms (1 Hz)
        this.activeInterval = window.setInterval(() => {
            this.broadcastUpdates();
        }, 1000);
    }

    private broadcastUpdates() {
        const now = Date.now();

        this.subscribers.forEach((callbacks, machineId) => {
            const state = this.machineStates.get(machineId);
            if (!state) return;

            // PHYSICS SIMULATION
            // 1. Pressure: Sine wave to simulate compressor cycles (10-18 PSI)
            state.pressurePhase += 0.1; 
            const pressureNoise = (Math.random() - 0.5) * 0.5;
            const pressure = 14 + Math.sin(state.pressurePhase) * 3 + pressureNoise;

            // 2. Flow Rate: Consistent with minor variance, occasional drop
            const flowNoise = (Math.random() - 0.5) * 2;
            const flowRate = Math.max(0, state.flowBase + flowNoise);

            // 3. Temperature: Very slow drift
            const tempDrift = (Math.random() - 0.5) * 0.1;
            state.tempBase += tempDrift;
            // Keep temp within realistic bounds
            if (state.tempBase > 50) state.tempBase -= 0.2;
            if (state.tempBase < 20) state.tempBase += 0.2;

            // 4. Vibration: Low constant noise
            const vibration = 0.5 + Math.random() * 0.2;

            const dataPoint: TelemetryData = {
                timestamp: now,
                machineId,
                pressure: parseFloat(pressure.toFixed(2)),
                flowRate: parseFloat(flowRate.toFixed(1)),
                temperature: parseFloat(state.tempBase.toFixed(1)),
                vibration: parseFloat(vibration.toFixed(3)),
                status: 'Running'
            };

            // Push to all components listening to this machine
            callbacks.forEach(cb => cb(dataPoint));
        });
    }
}

// Singleton Instance
export const telemetryService = new TelemetryService();
