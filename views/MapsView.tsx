
import React, { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { VRU } from '../types';
import { MapPin, AlertTriangle, Layers, X, Search, Gauge, Globe, Zap, LocateFixed, Plus, Minus, RotateCcw, ExternalLink, List, ChevronDown, CloudRain, Sun } from 'lucide-react';
import * as L from 'leaflet';
import { getMachineData } from '../data/MachineRepository';
import { t } from '../utils/i18n';

interface MapsViewProps {
    fleet: VRU[];
    onSelectMachine: (id: string) => void;
    theme?: 'dark' | 'light' | 'high-contrast';
    showPendingUnits?: boolean;
    lang: 'en' | 'ar' | 'zh' | 'ko';
}

type SmartMarker = L.Marker & {
    _lastIconHtml?: string;
    _lastZIndex?: number;
};

export const MapsView: React.FC<MapsViewProps> = ({ fleet, onSelectMachine, theme = 'dark', showPendingUnits = false, lang }) => {
    const [selectedVRUId, setSelectedVRUId] = useState<string | null>(null);
    const [popupVru, setPopupVru] = useState<VRU | null>(null);
    const [popupPos, setPopupPos] = useState<{x: number, y: number} | null>(null);
    const [popupLayout, setPopupLayout] = useState<{ x: number; y: number; placement: 'above' | 'below' } | null>(null);
    const [showOnlyAlarms, setShowOnlyAlarms] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pumpFilter, setPumpFilter] = useState('All');
    const [isMobileListOpen, setIsMobileListOpen] = useState(false);
    const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);

    // Leaflet refs
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [id: string]: SmartMarker }>({});
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const weatherLayerGroupRef = useRef<L.LayerGroup | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    
    // Popup refs - using state to trigger re-render on mount
    const [popupNode, setPopupNode] = useState<HTMLDivElement | null>(null);
    const popupRef = useCallback((node: HTMLDivElement | null) => {
        setPopupNode(node);
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedSearch(searchTerm); }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const getPumpCount = (id: string) => {
        const numPart = id.split('-')[1] || '0';
        const val = parseInt(numPart);
        const mod = val % 10;
        if (mod < 5) return (val % 4) + 1;
        if (mod < 8) return (val % 4) + 5;
        return (val % 4) + 9;
    };

    const hasActiveAlert = (vru: VRU) => {
        return vru.alerts.some(a => !a.acknowledged && (a.severity === 'Critical' || a.severity === 'Warning'));
    };

    const filteredFleet = useMemo(() => {
        return fleet.filter(v => {
            if (showOnlyAlarms && !hasActiveAlert(v)) return false;
            if (!showPendingUnits && v.status === 'Pending_Install') return false;
            if (debouncedSearch && !v.name.toLowerCase().includes(debouncedSearch.toLowerCase()) && !v.city.toLowerCase().includes(debouncedSearch.toLowerCase()) && !v.id.includes(debouncedSearch)) return false;
            if (pumpFilter !== 'All') {
                const count = getPumpCount(v.id);
                if (pumpFilter === '1-4 Pumps' && (count < 1 || count > 4)) return false;
                if (pumpFilter === '5-8 Pumps' && (count < 5 || count > 8)) return false;
                if (pumpFilter === '9+ Pumps' && count < 9) return false;
            }
            return true;
        });
    }, [fleet, showOnlyAlarms, showPendingUnits, debouncedSearch, pumpFilter]);

    const cities = useMemo(() => Array.from(new Set(fleet.map(f => f.city))).sort(), [fleet]);

    // Initialize Map and Resize Observer
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;
        
        // 1. Init Map
        const map = L.map(mapContainerRef.current, { 
            zoomControl: false, 
            attributionControl: false, 
            center: [24.7136, 46.6753], 
            zoom: 6, 
            minZoom: 3, 
            maxZoom: 18, 
            // renderer: L.canvas() - Removed to fix icon rendering issues
        });
        mapRef.current = map;
        weatherLayerGroupRef.current = L.layerGroup().addTo(map);

        map.on('move', () => {
            if (popupVru) {
                const pt = map.latLngToContainerPoint([popupVru.latitude, popupVru.longitude]);
                setPopupPos({ x: pt.x, y: pt.y });
            }
        });
        map.on('click', () => { setPopupVru(null); setPopupPos(null); });

        // 2. Init Resize Observer for Layout Stability
        resizeObserverRef.current = new ResizeObserver(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize(); // Critical: Tells Leaflet container changed size
            }
        });
        resizeObserverRef.current.observe(mapContainerRef.current);

        return () => { 
            if (mapRef.current) {
                mapRef.current.remove(); 
                mapRef.current = null; 
            }
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
        };
    }, []); // Empty dependency array ensures run once on mount

    // Weather Overlay Logic
    useEffect(() => {
        const layer = weatherLayerGroupRef.current;
        if (!layer) return;
        layer.clearLayers();

        if (showWeatherOverlay) {
            fleet.forEach(u => {
                const temp = u.temperatureC || 30;
                const color = temp > 35 ? '#ef4444' : temp > 25 ? '#f59e0b' : '#3b82f6';
                L.circle([u.latitude, u.longitude], {
                    radius: 50000, 
                    fillColor: color,
                    fillOpacity: 0.3,
                    stroke: false
                }).addTo(layer);
            });
        }
    }, [showWeatherOverlay, fleet]);

    // Initial View Fit
    useEffect(() => {
        const map = mapRef.current;
        if (!map || fleet.length === 0) return;
        // Only run this once or if fleet changes significantly (not just status)
        // Check if map center is still default to avoid resetting user view on every poll
        const currentCenter = map.getCenter();
        const isDefault = currentCenter.lat === 24.7136 && currentCenter.lng === 46.6753;
        
        if (isDefault) {
            const lats = fleet.map(f => f.latitude);
            const lngs = fleet.map(f => f.longitude);
            if (fleet.length === 1) { 
                map.setView([lats[0], lngs[0]], 13, { animate: false }); 
            } else { 
                const bounds = L.latLngBounds([Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]); 
                map.fitBounds(bounds, { padding: [50, 50], animate: false, maxZoom: 10 }); 
            }
        }
    }, [fleet.length]); // Only depend on length to prevent constant re-centering

    // Tile Layer Management
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (tileLayerRef.current) { tileLayerRef.current.remove(); }
        const tileUrl = theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        const layer = L.tileLayer(tileUrl, { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 20 }).addTo(map);
        tileLayerRef.current = layer;
    }, [theme]);

    // Marker Management (Diffing)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        
        const filteredIds = new Set(filteredFleet.map(f => f.id));
        
        // Remove old markers
        Object.keys(markersRef.current).forEach(id => {
            if (!filteredIds.has(id)) { 
                markersRef.current[id].remove(); 
                delete markersRef.current[id]; 
            }
        });

        // Add/Update markers
        filteredFleet.forEach(vru => {
            const isSelected = selectedVRUId === vru.id;
            const isAlert = hasActiveAlert(vru);
            
            // Explicit color mapping for reliability
            let bgColor = '#64748b'; // default slate-500
            let glowColor = '';
            
            if (vru.status === 'Offline') { 
                bgColor = '#64748b'; // slate-500
            } 
            else if (isAlert) { 
                bgColor = '#f43f5e'; // rose-500
                glowColor = '#f43f5e';
            } 
            else if (vru.status === 'Running') { 
                bgColor = '#10b981'; // emerald-500
            } 
            else if (vru.status === 'Maintenance') { 
                bgColor = '#f59e0b'; // amber-500
            } 
            else if (vru.status === 'Pending_Install') { 
                bgColor = '#60a5fa'; // blue-400
            }
            
            // Create a simpler, more robust HTML structure with inline styles
            const ringStyle = isSelected ? `box-shadow: 0 0 0 2px white, 0 0 0 4px #0f172a;` : '';
            const glowHtml = (isAlert && vru.status !== 'Offline') ? 
                `<span class="absolute inline-flex rounded-full opacity-75 animate-ping" style="width:100%;height:100%;background-color:${glowColor};top:0;left:0;"></span>` : '';
            
            const iconHtml = `
                <div class="relative flex items-center justify-center" style="width:24px;height:24px;">
                    ${glowHtml}
                    <span class="relative inline-flex rounded-full border border-slate-900 shadow-lg" style="width:12px;height:12px;background-color:${bgColor};${ringStyle}"></span>
                </div>
            `;
            
            const targetZIndex = isSelected ? 1000 : 0;
            
            if (markersRef.current[vru.id]) {
                const marker = markersRef.current[vru.id];
                if (marker._lastIconHtml !== iconHtml) {
                    const icon = L.divIcon({ 
                        className: '', // Empty class name to avoid default styles
                        html: iconHtml, 
                        iconSize: [24, 24], 
                        iconAnchor: [12, 12] 
                    });
                    marker.setIcon(icon);
                    marker._lastIconHtml = iconHtml;
                }
                if (marker._lastZIndex !== targetZIndex) { marker.setZIndexOffset(targetZIndex); marker._lastZIndex = targetZIndex; }
                
                const curPos = marker.getLatLng();
                if (curPos.lat !== vru.latitude || curPos.lng !== vru.longitude) { marker.setLatLng([vru.latitude, vru.longitude]); }
            } else {
                const icon = L.divIcon({ 
                    className: '', 
                    html: iconHtml, 
                    iconSize: [24, 24], 
                    iconAnchor: [12, 12] 
                });
                const marker = L.marker([vru.latitude, vru.longitude], { icon, zIndexOffset: targetZIndex }) as SmartMarker;
                marker._lastIconHtml = iconHtml;
                marker._lastZIndex = targetZIndex;
                marker.on('click', (e) => { L.DomEvent.stopPropagation(e); handleUnitSelect(vru); });
                marker.addTo(map);
                markersRef.current[vru.id] = marker;
            }
        });
    }, [filteredFleet, selectedVRUId]);

    // Popup Positioning Update
    useEffect(() => {
        if (popupVru && mapRef.current) {
            setPopupLayout(null); // Reset layout to prevent jump
            const pt = mapRef.current.latLngToContainerPoint([popupVru.latitude, popupVru.longitude]);
            setPopupPos({ x: pt.x, y: pt.y });
        }
    }, [popupVru]);

    useLayoutEffect(() => {
        if (!popupPos || !mapContainerRef.current || !popupNode) {
            setPopupLayout(null);
            return;
        }
        
        const containerRect = mapContainerRef.current.getBoundingClientRect();
        const popupRect = popupNode.getBoundingClientRect();
        
        // Safety check - if popup hasn't rendered dimensions yet, wait
        if (popupRect.width === 0 || popupRect.height === 0) return;

        const PADDING = 12;
        const GAP = 16; 
        const MARKER_OFFSET = 12;

        // 1. Clamp X (Horizontal)
        // Ensure center of popup (popupPos.x) is within [PADDING + w/2, Width - PADDING - w/2]
        const halfWidth = popupRect.width / 2;
        const minX = PADDING + halfWidth;
        const maxX = containerRect.width - PADDING - halfWidth;
        const clampedX = Math.min(maxX, Math.max(minX, popupPos.x));

        // 2. Calculate Vertical Position Candidates
        // 'above': sits above marker
        const topAbove = popupPos.y - MARKER_OFFSET - GAP - popupRect.height;
        // 'below': sits below marker
        const topBelow = popupPos.y + MARKER_OFFSET + GAP;

        // 3. Check bounds for candidates
        const fitsAbove = topAbove >= PADDING;
        const fitsBelow = (topBelow + popupRect.height) <= (containerRect.height - PADDING);

        let placement: 'above' | 'below' = 'above';
        let top = topAbove;

        if (fitsAbove) {
            // Default preference
            placement = 'above';
            top = topAbove;
        } else if (fitsBelow) {
            // If above doesn't fit but below does, swap
            placement = 'below';
            top = topBelow;
        } else {
            // Neither fits perfectly. Choose the one with MORE visibility.
            // Or simply clamp the one that is "closer" to being right?
            // Strategy: Clamp the result to be within [PADDING, ContainerHeight - PADDING - Height]
            // But which anchor to use?
            // If we are in the top half of the screen, 'below' usually has more room.
            // If we are in the bottom half, 'above' usually has more room.
            
            if (popupPos.y < containerRect.height / 2) {
                placement = 'below';
                top = topBelow;
            } else {
                placement = 'above';
                top = topAbove;
            }
        }

        // 4. Final Hard Clamp for Y
        // Ensure the popup is strictly inside the container vertically
        const maxTop = containerRect.height - PADDING - popupRect.height;
        const minTop = PADDING;
        top = Math.max(minTop, Math.min(maxTop, top));

        setPopupLayout({ x: clampedX, y: top, placement });
    }, [popupPos, popupVru, popupNode]);

    const handleUnitSelect = (vru: VRU) => {
        setSelectedVRUId(vru.id);
        setPopupVru(vru);
        if (mapRef.current) {
            mapRef.current.flyTo([vru.latitude, vru.longitude], 13, { duration: 1.5 });
            setIsMobileListOpen(false);
            // Smooth scroll sidebar to item
            setTimeout(() => {
                const el = document.getElementById(`list-item-${vru.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    };

    const handleCityJump = (cityName: string) => {
        if (!mapRef.current) return;
        if (cityName === 'Global') { if (fleet.length === 1) { const u = fleet[0]; mapRef.current.flyTo([u.latitude, u.longitude], 13); } else { mapRef.current.flyTo([24.7136, 46.6753], 5); } return; }
        const cityUnits = fleet.filter(u => u.city === cityName);
        if (cityUnits.length === 0) return;
        const avgLat = cityUnits.reduce((sum, u) => sum + u.latitude, 0) / cityUnits.length;
        const avgLng = cityUnits.reduce((sum, u) => sum + u.longitude, 0) / cityUnits.length;
        mapRef.current.flyTo([avgLat, avgLng], 10, { duration: 1.5 });
    };

    const zoomIn = () => mapRef.current?.zoomIn();
    const zoomOut = () => mapRef.current?.zoomOut();
    const resetView = () => { if (mapRef.current) { if (fleet.length === 1) { const u = fleet[0]; mapRef.current.flyTo([u.latitude, u.longitude], 13); } else { mapRef.current.flyTo([24.7136, 46.6753], 6); } } };
    const getPopupStats = (vruId: string) => { const details = getMachineData(vruId); const currentYear = new Date().getFullYear().toString(); const yearRecords = details.daily.filter(d => d.date.startsWith(currentYear)); const recordsToUse = yearRecords.length > 0 ? yearRecords : details.daily; if (recordsToUse.length === 0) return 0; const totalVol = recordsToUse.reduce((acc, curr) => acc + curr.recoveredLiters, 0); return Math.round(totalVol / recordsToUse.length); };

    return (
        <div className="relative h-[calc(100vh-10rem)] md:h-[calc(100vh-6rem)] w-full overflow-hidden rounded-3xl bg-slate-50 dark:bg-[#0b1121] border border-slate-200 dark:border-slate-800 shadow-2xl flex transition-colors duration-300">
            <div className="absolute top-4 left-4 z-[1001] md:hidden"><button onClick={() => setIsMobileListOpen(!isMobileListOpen)} className="p-3 bg-white dark:bg-scada-800 rounded-full shadow-lg border border-slate-200 dark:border-scada-700 text-slate-700 dark:text-white">{isMobileListOpen ? <X size={20} /> : <List size={20} />}</button></div>
            <div className={`absolute md:static z-[1000] flex flex-col gap-4 transition-all duration-300 pointer-events-auto ${isMobileListOpen ? 'inset-0 bg-black/50 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none p-4' : 'pointer-events-none md:pointer-events-auto'} md:top-4 md:bottom-4 md:w-80 md:flex ${lang === 'ar' ? 'md:right-4' : 'md:left-4'}`}>
                <div className={`flex flex-col gap-4 h-full transition-transform duration-300 ${isMobileListOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0 opacity-0 md:opacity-100'} ${isMobileListOpen ? 'max-h-[80vh] mt-auto' : ''}`}>
                    <div className="bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-xl flex-shrink-0 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><Globe className="text-scada-accent animate-pulse" size={18} /><h2 className="font-bold text-slate-800 dark:text-white tracking-wide text-sm uppercase">{t('globalCommand', lang)}</h2></div>
                            <span className="text-[10px] font-mono bg-scada-accent/20 text-scada-accent px-2 py-0.5 rounded border border-scada-accent/30">{t('online', lang)}</span>
                        </div>
                        <div className="space-y-2">
                            <div className="relative"><LocateFixed className={`absolute top-2.5 text-scada-accent ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={14} /><select onChange={(e) => handleCityJump(e.target.value)} className={`w-full bg-slate-50/80 dark:bg-[#0f172a]/80 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-xs font-bold text-slate-700 dark:text-white uppercase outline-none focus:border-scada-accent appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-[#0f172a] ${lang === 'ar' ? 'pr-9 pl-8' : 'pl-9 pr-8'}`}><option value="Global">{t('quickJump', lang)}: {fleet.length === 1 ? fleet[0].region : 'Global'}</option>{cities.map(city => (<option key={city} value={city}>{t('locate', lang)}: {city}</option>))}</select></div>
                            <div className="relative"><Search className={`absolute top-2.5 text-slate-400 ${lang === 'ar' ? 'right-3' : 'left-3'}`} size={14} /><input type="text" placeholder={t('filterById', lang)} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full bg-slate-50/80 dark:bg-[#0f172a]/50 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-xs text-slate-700 dark:text-white placeholder-slate-500 focus:border-scada-accent outline-none transition-colors ${lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setShowOnlyAlarms(!showOnlyAlarms)} className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border ${showOnlyAlarms ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50' : 'bg-slate-50/50 dark:bg-[#0f172a]/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}><AlertTriangle size={12} />{showOnlyAlarms ? t('alarms', lang) : t('noAlarms', lang)}</button>
                            <select value={pumpFilter} onChange={(e) => setPumpFilter(e.target.value)} className="col-span-1 bg-slate-50/50 dark:bg-[#0f172a]/50 border border-slate-300 dark:border-slate-600 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase outline-none focus:border-scada-accent appearance-none cursor-pointer text-center"><option>{t('allSizes', lang)}</option><option>1-4 Pumps</option><option>5-8 Pumps</option><option>9+ Pumps</option></select>
                        </div>
                    </div>
                    <div className="flex-1 bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-xl min-h-0">
                        <div className="p-3 bg-slate-50/80 dark:bg-[#0f172a]/40 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center flex-shrink-0"><span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{t('assetList', lang)}</span><span className="text-[10px] text-scada-accent font-mono">{filteredFleet.length}</span></div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {filteredFleet.map(vru => {
                                const isSelected = selectedVRUId === vru.id;
                                const isAlert = hasActiveAlert(vru);
                                const isOffline = vru.status === 'Offline';
                                return (
                                    <div key={vru.id} id={`list-item-${vru.id}`} onClick={() => handleUnitSelect(vru)} className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 group relative overflow-hidden ${isSelected ? 'bg-scada-accent/10 dark:bg-scada-accent/20 border-scada-accent/50' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`font-bold text-xs ${isSelected ? 'text-scada-accent dark:text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{vru.name}</span>
                                            {isAlert && !isOffline && <AlertTriangle size={12} className="text-rose-500 animate-pulse" />}
                                            {isOffline && <span className="w-2 h-2 rounded-full bg-slate-500" title="Offline"></span>}
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400"><div className="flex items-center gap-1"><MapPin size={10} /> {vru.city}</div><div className="font-mono">{vru.id}</div></div>
                                        {isSelected && <div className={`absolute top-0 bottom-0 w-1 bg-scada-accent ${lang === 'ar' ? 'right-0' : 'left-0'}`}></div>}
                                    </div>
                                );
                            })}
                            {filteredFleet.length === 0 && <div className="p-8 text-center text-slate-500 text-xs">{t('noAssetsFound', lang)}</div>}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-1 relative z-10 w-full h-full">
                <div ref={mapContainerRef} id="map" className="w-full h-full bg-slate-200 dark:bg-[#0f172a]"></div>
                <div className={`absolute top-6 z-[1000] flex flex-col gap-3 pointer-events-auto ${lang === 'ar' ? 'left-6' : 'right-6'}`}>
                    <button onClick={zoomIn} className="w-10 h-10 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur border border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-scada-accent dark:hover:text-white hover:border-scada-accent hover:bg-scada-accent/10 dark:hover:bg-scada-accent/20 transition-all shadow-lg active:scale-95"><Plus size={20} /></button>
                    <button onClick={zoomOut} className="w-10 h-10 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur border border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-scada-accent dark:hover:text-white hover:border-scada-accent hover:bg-scada-accent/10 dark:hover:bg-scada-accent/20 transition-all shadow-lg active:scale-95"><Minus size={20} /></button>
                    <button onClick={resetView} className="w-10 h-10 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur border border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-scada-accent dark:hover:text-white hover:border-scada-accent hover:bg-scada-accent/10 dark:hover:bg-scada-accent/20 transition-all shadow-lg active:scale-95"><RotateCcw size={18} /></button>
                    <div className="h-px bg-slate-300 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => setShowWeatherOverlay(!showWeatherOverlay)} className={`w-10 h-10 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur border rounded-xl flex items-center justify-center transition-all shadow-lg ${showWeatherOverlay ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-amber-500'}`}><Sun size={20} /></button>
                </div>
                {popupVru && popupPos && (
                    <div
                        className={`absolute z-[1001] pointer-events-none transform -translate-x-1/2`}
                        style={{ 
                            left: popupLayout?.x ?? popupPos.x, 
                            top: popupLayout?.y ?? popupPos.y,
                            visibility: popupLayout ? 'visible' : 'hidden'
                        }}
                    >
                        <div ref={popupRef} className="pointer-events-auto bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-scada-accent/30 w-72 overflow-hidden animate-in zoom-in-95 fade-in duration-200 ring-1 ring-slate-900/5 dark:ring-white/10">
                            <div className="p-4 bg-gradient-to-r from-slate-100 to-transparent dark:from-scada-accent/10 dark:to-transparent border-b border-slate-200 dark:border-white/5 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900 dark:text-white text-sm">{popupVru.name}</h3><div className={`w-2 h-2 rounded-full ${popupVru.status === 'Running' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : popupVru.status === 'Stopped' || popupVru.status === 'Offline' ? 'bg-slate-500' : 'bg-amber-500'}`}></div></div>
                                    <div className="text-[10px] text-scada-accent font-mono mt-0.5">{popupVru.id} • {popupVru.city}</div>
                                    {popupVru.address && (<div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">{popupVru.address}</div>)}
                                </div>
                                <button onClick={() => { setPopupVru(null); setPopupPos(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={14} /></button>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-2.5 rounded-lg border border-slate-100 dark:border-white/5"><div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Zap size={10} /> {t('efficiency', lang)}</div><div className="font-mono text-lg font-bold text-slate-900 dark:text-white">{(popupVru.recoveryRatePercentage * 100).toFixed(1)}%</div><div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden"><div className="h-full bg-emerald-500" style={{width: `${popupVru.recoveryRatePercentage * 100}%`}}></div></div></div>
                                <div className="bg-slate-50 dark:bg-[#1e293b]/50 p-2.5 rounded-lg border border-slate-100 dark:border-white/5"><div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Gauge size={10} /> Daily Avg</div><div className="font-mono text-lg font-bold text-slate-900 dark:text-white">{getPopupStats(popupVru.id).toLocaleString()} <span className="text-[10px] text-slate-500">L/d</span></div><div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden"><div className="h-full bg-sky-500" style={{width: '65%'}}></div></div></div>
                            </div>
                            <div className="p-2 pt-0"><button onClick={() => onSelectMachine(popupVru.id)} className="w-full py-2 bg-slate-100 dark:bg-white/5 hover:bg-scada-accent hover:border-scada-accent hover:text-white border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 group">{t('accessTelemetry', lang)} <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform" /></button></div>
                        </div>
                        {popupLayout?.placement === 'below' ? (
                            <>
                                <div className="absolute left-1/2 bottom-full h-4 w-px bg-gradient-to-t from-scada-accent/50 to-transparent"></div>
                                <div className="absolute left-1/2 bottom-full -translate-x-1/2 mt-px w-2 h-2 bg-white dark:bg-[#0f172a] rotate-45 border-l border-t border-slate-200 dark:border-scada-accent/30"></div>
                            </>
                        ) : (
                            <>
                                <div className="absolute left-1/2 top-full h-4 w-px bg-gradient-to-b from-scada-accent/50 to-transparent"></div>
                                <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-px w-2 h-2 bg-white dark:bg-[#0f172a] rotate-45 border-r border-b border-slate-200 dark:border-scada-accent/30"></div>
                            </>
                        )}
                    </div>
                )}
                <div className="absolute bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 dark:bg-[#0f172a]/80 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-full px-6 py-2 flex gap-4 md:gap-8 shadow-2xl pointer-events-auto w-max max-w-[90%] overflow-x-auto">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('running', lang)}</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"></span><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">{t('criticalAlerts', lang)}</span></div>
                    <div className="flex items-center gap-2 hidden sm:flex"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('maintenance', lang)}</span></div>
                    <div className="flex items-center gap-2 hidden sm:flex"><span className="w-2 h-2 rounded-full bg-slate-500"></span><span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('offline', lang)}</span></div>
                </div>
            </div>
        </div>
    );
};
