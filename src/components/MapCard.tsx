import React from 'react';
import { MapSelectionId } from '../types/game';
import { Check, Sparkles, MapPin } from 'lucide-react';

interface MapCardProps {
  id: MapSelectionId;
  name: string;
  subtitle: string;
  theme: string;
  shortDescription: string;
  badge?: string;
  isSelected: boolean;
  onSelect: () => void;
}

export const MapCard: React.FC<MapCardProps> = ({
  id,
  name,
  subtitle,
  theme,
  shortDescription,
  badge,
  isSelected,
  onSelect
}) => {
  return (
    <div
      id={`map-card-${id}`}
      className={`group relative flex flex-col justify-between rounded-3xl border-3 transition-all duration-200 overflow-hidden bg-slate-900/95 backdrop-blur-md shadow-xl ${
        isSelected
          ? 'border-amber-400 ring-4 ring-amber-400/30 shadow-amber-500/20 shadow-2xl scale-[1.01]'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      {/* Top Banner / Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider font-comic border shadow-md flex items-center gap-1 ${
            isSelected
              ? 'bg-amber-400 text-slate-950 border-amber-300'
              : 'bg-slate-950/80 text-amber-300 border-slate-700'
          }`}
        >
          <MapPin className="w-3 h-3" />
          {theme}
        </span>
        {badge && (
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-slate-700">
            {badge}
          </span>
        )}
      </div>

      {isSelected && (
        <div className="absolute top-3 right-3 z-10 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-xl text-xs font-black font-comic flex items-center gap-1 shadow-lg border border-amber-300 animate-bounceIn">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>ATIVO</span>
        </div>
      )}

      {/* MAP PREVIEW IMAGE / ILLUSTRATION */}
      <div className="relative w-full h-40 sm:h-44 overflow-hidden bg-slate-950 flex items-center justify-center">
        {id === 'paper_city' && (
          <svg className="w-full h-full object-cover" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="180" fill="#bae6fd" />
            {/* Paper Cloud 1 */}
            <path d="M50 40 Q60 25 80 25 Q100 25 110 40 Q125 40 125 55 Q125 70 105 70 L45 70 Q30 70 30 55 Q30 40 50 40 Z" fill="#ffffff" opacity="0.9" />
            {/* Paper Cloud 2 */}
            <path d="M280 35 Q290 20 310 20 Q330 20 340 35 Q355 35 355 50 Q355 65 335 65 L275 65 Q260 65 260 50 Q260 35 280 35 Z" fill="#ffffff" opacity="0.85" />
            
            {/* Background Distant Buildings */}
            <rect x="30" y="65" width="45" height="75" fill="#93c5fd" stroke="#1e3a8a" strokeWidth="2" strokeDasharray="4 2" />
            <rect x="85" y="50" width="55" height="90" fill="#fde047" stroke="#854d0e" strokeWidth="2" />
            <polygon points="85,50 112.5,25 140,50" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
            <rect x="150" y="70" width="50" height="70" fill="#86efac" stroke="#166534" strokeWidth="2" />
            <rect x="210" y="55" width="60" height="85" fill="#fbcfe8" stroke="#9d174d" strokeWidth="2" strokeDasharray="5 3" />
            <rect x="280" y="60" width="50" height="80" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
            <polygon points="280,60 305,35 330,60" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
            <rect x="340" y="75" width="45" height="65" fill="#fef08a" stroke="#a16207" strokeWidth="2" />

            {/* Windows on buildings */}
            <rect x="95" y="60" width="12" height="15" fill="#ffffff" stroke="#854d0e" strokeWidth="1" />
            <rect x="115" y="60" width="12" height="15" fill="#ffffff" stroke="#854d0e" strokeWidth="1" />
            <rect x="95" y="85" width="12" height="15" fill="#ffffff" stroke="#854d0e" strokeWidth="1" />
            <rect x="115" y="85" width="12" height="15" fill="#ffffff" stroke="#854d0e" strokeWidth="1" />

            {/* Street / Ground Craft */}
            <rect y="130" width="400" height="50" fill="#64748b" stroke="#334155" strokeWidth="2" />
            {/* Dashed Center Road Line */}
            <line x1="10" y1="155" x2="390" y2="155" stroke="#fef08a" strokeWidth="4" strokeDasharray="18 14" />
            
            {/* Origami Mini Car */}
            <rect x="180" y="142" width="46" height="18" rx="4" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
            <rect x="190" y="135" width="26" height="10" rx="2" fill="#bae6fd" stroke="#7f1d1d" strokeWidth="1.5" />
            <circle cx="192" cy="160" r="5" fill="#1e293b" />
            <circle cx="214" cy="160" r="5" fill="#1e293b" />

            {/* Sketched paper texture lines */}
            <line x1="0" y1="130" x2="400" y2="130" stroke="#0f172a" strokeWidth="3" />
          </svg>
        )}

        {id === 'paper_factory' && (
          <svg className="w-full h-full object-cover" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="180" fill="#cbd5e1" />
            
            {/* Industrial Smoke Puffs */}
            <circle cx="110" cy="30" r="14" fill="#f1f5f9" opacity="0.8" />
            <circle cx="125" cy="18" r="18" fill="#f8fafc" opacity="0.9" />
            <circle cx="270" cy="25" r="15" fill="#f1f5f9" opacity="0.8" />

            {/* Smokestacks */}
            <rect x="100" y="45" width="22" height="65" fill="#ea580c" stroke="#7c2d12" strokeWidth="2" />
            <rect x="97" y="40" width="28" height="6" fill="#9a3412" stroke="#7c2d12" strokeWidth="1.5" />
            <rect x="260" y="35" width="20" height="75" fill="#ea580c" stroke="#7c2d12" strokeWidth="2" />
            <rect x="257" y="30" width="26" height="6" fill="#9a3412" stroke="#7c2d12" strokeWidth="1.5" />

            {/* Main Sawtooth Factory Roofs */}
            <polygon points="40,110 80,65 80,110" fill="#78716c" stroke="#44403c" strokeWidth="2" />
            <polygon points="120,110 160,65 160,110" fill="#a8a29e" stroke="#44403c" strokeWidth="2" />
            <polygon points="200,110 240,65 240,110" fill="#78716c" stroke="#44403c" strokeWidth="2" />
            <polygon points="280,110 320,65 320,110" fill="#a8a29e" stroke="#44403c" strokeWidth="2" />

            {/* Factory Building Walls */}
            <rect x="30" y="110" width="340" height="35" fill="#d6d3d1" stroke="#44403c" strokeWidth="2" />

            {/* Danger Warning Stripes */}
            <g>
              <rect x="30" y="138" width="340" height="10" fill="#facc15" stroke="#713f12" strokeWidth="1" />
              <line x1="50" y1="138" x2="60" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="80" y1="138" x2="90" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="110" y1="138" x2="120" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="140" y1="138" x2="150" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="170" y1="138" x2="180" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="200" y1="138" x2="210" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="230" y1="138" x2="240" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="260" y1="138" x2="270" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="290" y1="138" x2="300" y2="148" stroke="#1c1917" strokeWidth="3" />
              <line x1="320" y1="138" x2="330" y2="148" stroke="#1c1917" strokeWidth="3" />
            </g>

            {/* Huge Paper Rolls / Drums */}
            <ellipse cx="90" cy="158" rx="20" ry="12" fill="#fed7aa" stroke="#c2410c" strokeWidth="2" />
            <ellipse cx="90" cy="158" rx="8" ry="4" fill="#9a3412" />
            
            <ellipse cx="310" cy="158" rx="22" ry="13" fill="#fed7aa" stroke="#c2410c" strokeWidth="2" />
            <ellipse cx="310" cy="158" rx="9" ry="5" fill="#9a3412" />

            {/* Industrial Ground Floor */}
            <rect y="152" width="400" height="28" fill="#57534e" stroke="#292524" strokeWidth="2" />
          </svg>
        )}

        {id === 'paper_island' && (
          <svg className="w-full h-full object-cover" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="180" fill="#7dd3fc" />
            {/* Golden Sun */}
            <circle cx="340" cy="40" r="24" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
            
            {/* Origami Waves in Distance */}
            <path d="M0 90 Q30 80 60 90 T120 90 T180 90 T240 90 T300 90 T360 90 T420 90 L420 180 L0 180 Z" fill="#0284c7" />
            <path d="M0 115 Q35 105 70 115 T140 115 T210 115 T280 115 T350 115 T420 115 L420 180 L0 180 Z" fill="#0369a1" />

            {/* Sandy Island Mound (Kraft Paper) */}
            <path d="M40 180 Q100 120 200 120 Q300 120 370 180 Z" fill="#fde68a" stroke="#b45309" strokeWidth="2.5" />
            
            {/* Wooden Pier / Bridge */}
            <rect x="150" y="145" width="100" height="16" fill="#b45309" stroke="#78350f" strokeWidth="2" />
            <line x1="170" y1="145" x2="170" y2="161" stroke="#78350f" strokeWidth="2" />
            <line x1="190" y1="145" x2="190" y2="161" stroke="#78350f" strokeWidth="2" />
            <line x1="210" y1="145" x2="210" y2="161" stroke="#78350f" strokeWidth="2" />
            <line x1="230" y1="145" x2="230" y2="161" stroke="#78350f" strokeWidth="2" />

            {/* Origami Palm Tree 1 (Left) */}
            <path d="M120 150 Q115 110 125 75" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
            {/* Palm leaves made of green cardstock */}
            <polygon points="125,75 80,70 120,60" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
            <polygon points="125,75 90,45 130,50" fill="#16a34a" stroke="#15803d" strokeWidth="1.5" />
            <polygon points="125,75 140,40 145,60" fill="#4ade80" stroke="#15803d" strokeWidth="1.5" />
            <polygon points="125,75 165,60 140,75" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
            <polygon points="125,75 160,85 135,85" fill="#16a34a" stroke="#15803d" strokeWidth="1.5" />

            {/* Origami Palm Tree 2 (Right) */}
            <path d="M280 155 Q285 120 275 85" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
            <polygon points="275,85 240,75 270,68" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
            <polygon points="275,85 255,50 285,60" fill="#16a34a" stroke="#15803d" strokeWidth="1.5" />
            <polygon points="275,85 305,55 295,75" fill="#4ade80" stroke="#15803d" strokeWidth="1.5" />
            <polygon points="275,85 315,85 290,90" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
          </svg>
        )}

        {id === 'random' && (
          <svg className="w-full h-full object-cover" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Gradient Background */}
            <rect width="400" height="180" fill="#312e81" />
            
            {/* Colorful Origami Paper Triangles in Background */}
            <polygon points="30,30 90,20 60,80" fill="#f43f5e" opacity="0.5" />
            <polygon points="320,30 380,50 340,90" fill="#06b6d4" opacity="0.5" />
            <polygon points="50,130 110,150 70,175" fill="#eab308" opacity="0.5" />
            <polygon points="310,130 370,110 350,170" fill="#10b981" opacity="0.5" />
            <polygon points="180,20 220,15 200,45" fill="#a855f7" opacity="0.6" />

            {/* Central 3D Origami Dice */}
            <g transform="translate(160, 50)">
              {/* Top Face */}
              <polygon points="40,10 80,25 40,40 0,25" fill="#e0e7ff" stroke="#4338ca" strokeWidth="2.5" />
              {/* Left Face */}
              <polygon points="0,25 40,40 40,85 0,70" fill="#c7d2fe" stroke="#4338ca" strokeWidth="2.5" />
              {/* Right Face */}
              <polygon points="40,40 80,25 80,70 40,85" fill="#a5b4fc" stroke="#4338ca" strokeWidth="2.5" />
              
              {/* Dots on Left Face (3 dots) */}
              <circle cx="12" cy="40" r="3" fill="#312e81" />
              <circle cx="20" cy="55" r="3" fill="#312e81" />
              <circle cx="28" cy="70" r="3" fill="#312e81" />

              {/* Dots on Right Face (2 dots) */}
              <circle cx="55" cy="50" r="3.5" fill="#312e81" />
              <circle cx="65" cy="65" r="3.5" fill="#312e81" />

              {/* Dot on Top Face */}
              <circle cx="40" cy="25" r="4" fill="#ef4444" />
            </g>

            {/* Shuffle / Random Circular Arrows */}
            <g transform="translate(130, 95)">
              <path d="M-20 -15 Q-5 -30 20 -25" stroke="#fde047" strokeWidth="4" strokeLinecap="round" fill="none" />
              <polygon points="25,-25 15,-32 18,-20" fill="#fde047" />

              <path d="M160 35 Q145 50 120 45" stroke="#fde047" strokeWidth="4" strokeLinecap="round" fill="none" />
              <polygon points="115,45 125,52 122,40" fill="#fde047" />
            </g>

            {/* Dynamic Badge text */}
            <text x="200" y="155" textAnchor="middle" fill="#fef08a" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="1.5">
              ROTAÇÃO AUTOMÁTICA
            </text>
          </svg>
        )}

        {/* Subtle overlay paper edge */}
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
      </div>

      {/* CARD CONTENT */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-white font-comic tracking-wide uppercase">
              {name}
            </h3>
            <span className="text-[11px] font-bold text-amber-400 font-mono">
              {subtitle}
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            {shortDescription}
          </p>
        </div>

        {/* SELECT ACTION BUTTON */}
        <div className="pt-2">
          <button
            id={`btn-select-map-${id}`}
            type="button"
            onClick={onSelect}
            className={`w-full py-2.5 sm:py-3 px-4 rounded-2xl font-black text-xs sm:text-sm font-comic tracking-wider border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isSelected
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-slate-950 hover:scale-[1.02] shadow-lg active:scale-95'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>SELECIONADO</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-current" />
                <span>SELECIONAR MAPA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
