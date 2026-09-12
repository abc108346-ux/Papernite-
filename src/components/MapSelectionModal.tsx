import React from 'react';
import { MapSelectionId } from '../types/game';
import { MAP_OPTIONS } from '../game/constants';
import { MapCard } from './MapCard';
import { soundManager } from '../game/audio/SoundManager';
import { X, ArrowLeft, Layers, CheckCircle2, Play } from 'lucide-react';

interface MapSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMap: MapSelectionId;
  onSelectMap: (mapId: MapSelectionId) => void;
  onStartMatch?: () => void;
}

export const MapSelectionModal: React.FC<MapSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedMap,
  onSelectMap,
  onStartMatch
}) => {
  if (!isOpen) return null;

  const currentOption = MAP_OPTIONS[selectedMap] || MAP_OPTIONS.paper_city;

  const handleSelect = (mapId: MapSelectionId) => {
    soundManager.playButtonClick();
    onSelectMap(mapId);
  };

  const handleConfirm = () => {
    soundManager.playButtonClick();
    onClose();
  };

  return (
    <div
      id="map-selection-screen"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between overflow-y-auto pt-safe pb-safe pl-safe pr-safe select-none animate-fadeIn"
    >
      {/* HEADER: Title, Subtitle, Close Button */}
      <header className="sticky top-0 z-20 w-full bg-slate-950/90 border-b-2 border-slate-800 backdrop-blur-lg px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            id="btn-close-map-selection"
            onClick={handleConfirm}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 text-xs sm:text-sm font-bold active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="hidden sm:inline">Voltar ao Lobby</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-amber-300 font-comic tracking-wide uppercase">
                SELEÇÃO DE MAPAS
              </h2>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-lg border border-amber-400/30">
                4 OPÇÕES
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Escolha a arena de cartolina para partidas online 6v6 ou modo treino
            </p>
          </div>
        </div>

        <button
          id="btn-close-map-selection-icon"
          onClick={handleConfirm}
          className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          title="Fechar seleção"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* SCROLLABLE CONTENT AREA: Map Cards Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        
        {/* Helper guide on mobile */}
        <div className="sm:hidden mb-4 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center gap-2.5 text-xs text-slate-300">
          <span className="text-base">👆</span>
          <span>Deslize para cima ou para baixo para visualizar todos os mapas disponíveis.</span>
        </div>

        {/* The 4 Map Cards Grid: Paper City, Paper Factory, Paper Island, Aleatório */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 pb-20">
          {(Object.keys(MAP_OPTIONS) as MapSelectionId[]).map((optionKey) => {
            const mapInfo = MAP_OPTIONS[optionKey];
            return (
              <MapCard
                key={optionKey}
                id={optionKey}
                name={mapInfo.name}
                subtitle={mapInfo.subtitle}
                theme={mapInfo.theme}
                shortDescription={mapInfo.shortDescription}
                badge={mapInfo.badge}
                isSelected={selectedMap === optionKey}
                onSelect={() => handleSelect(optionKey)}
              />
            );
          })}
        </div>
      </main>

      {/* STICKY BOTTOM CONFIRMATION BAR */}
      <footer className="sticky bottom-0 z-20 w-full bg-slate-950/95 border-t-2 border-slate-800 backdrop-blur-lg px-4 sm:px-8 py-3.5 sm:py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Active selection info */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">
                Arena Selecionada
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-amber-300 font-comic uppercase">
                  {currentOption.name}
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  • {currentOption.subtitle}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              id="btn-confirm-map-selection"
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black font-comic text-xs sm:text-sm border-2 border-slate-950 shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>CONFIRMAR MAPA</span>
            </button>

            {onStartMatch && (
              <button
                id="btn-confirm-and-play"
                onClick={() => {
                  onClose();
                  onStartMatch();
                }}
                className="flex-1 sm:flex-initial py-2.5 sm:py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black font-comic text-xs sm:text-sm border-2 border-slate-950 shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>JOGAR NESTE MAPA</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
