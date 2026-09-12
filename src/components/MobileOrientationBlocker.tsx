import React, { useEffect, useState } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export const MobileOrientationBlocker: React.FC = () => {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if screen is portrait and width indicates mobile/tablet
      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobileDevice = window.innerWidth < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsPortraitMobile(isPortrait && isMobileDevice);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortraitMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white select-none">
      {/* Cartoon Paper Warning Card */}
      <div className="max-w-xs w-full bg-[#fffdfa] text-slate-950 p-6 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_rgba(251,191,36,1)] space-y-4">
        
        {/* Animated Phone Rotation */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center bg-amber-200 rounded-2xl border-3 border-slate-900">
          <Smartphone className="w-10 h-10 text-slate-900 animate-pulse" />
          <RotateCw className="w-6 h-6 text-amber-600 absolute -top-1 -right-1 animate-spin" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black font-comic tracking-tight text-slate-950">
            VIRE O CELULAR PARA JOGAR
          </h2>
          <p className="text-xs font-bold text-slate-600 leading-relaxed">
            O <strong>PAPERNITE</strong> foi desenvolvido exclusivamente para o modo horizontal (paisagem 16:9).
          </p>
        </div>

        <div className="p-3 bg-amber-100 rounded-2xl border-2 border-amber-300 text-[11px] font-bold text-amber-900 flex items-center justify-center gap-2">
          <span>🔄</span>
          <span>Gire o aparelho para desbloquear a tela</span>
        </div>
      </div>
    </div>
  );
};
