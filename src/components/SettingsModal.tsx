import React, { useState } from 'react';
import { GraphicsSettings } from '../types/game';
import { soundManager } from '../game/audio/SoundManager';
import { X, Sliders, Volume2, Monitor, Keyboard, Smartphone } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GraphicsSettings;
  onSaveSettings: (settings: GraphicsSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'graphics' | 'audio' | 'controls'>('graphics');
  const [current, setCurrent] = useState<GraphicsSettings>({ ...settings });

  const handlePreset = (preset: 'low' | 'medium' | 'high') => {
    if (preset === 'low') {
      setCurrent(prev => ({
        ...prev,
        preset: 'low',
        shadows: false,
        renderScale: 0.75,
        renderDistance: 80
      }));
    } else if (preset === 'medium') {
      setCurrent(prev => ({
        ...prev,
        preset: 'medium',
        shadows: true,
        renderScale: 1.0,
        renderDistance: 120
      }));
    } else {
      setCurrent(prev => ({
        ...prev,
        preset: 'high',
        shadows: true,
        renderScale: 1.25,
        renderDistance: 160
      }));
    }
  };

  const handleAudioChange = (type: 'master' | 'sfx' | 'music', val: number) => {
    setCurrent(prev => {
      const next = { ...prev, [type === 'master' ? 'masterVolume' : type === 'sfx' ? 'sfxVolume' : 'musicVolume']: val };
      soundManager.setVolumes(next.masterVolume, next.sfxVolume, next.musicVolume);
      return next;
    });
  };

  const handleSave = () => {
    onSaveSettings(current);
    soundManager.playButtonClick();
    onClose();
  };

  return (
    <div id="settings-modal-backdrop" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div id="settings-modal-card" className="bg-amber-50 w-full max-w-xl rounded-3xl border-4 border-slate-900 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-amber-400 p-4 border-b-4 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-slate-950" />
            <h2 className="text-xl font-black text-slate-950 font-comic tracking-wide">
              CONFIGURAÇÕES • PAPERNITE
            </h2>
          </div>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white p-1.5 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-2 border-slate-300 bg-amber-100/60 p-2 gap-2">
          <button
            onClick={() => setActiveTab('graphics')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'graphics' ? 'bg-slate-900 text-amber-400 shadow' : 'text-slate-700 hover:bg-amber-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Gráficos</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'audio' ? 'bg-slate-900 text-amber-400 shadow' : 'text-slate-700 hover:bg-amber-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Áudio</span>
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'controls' ? 'bg-slate-900 text-amber-400 shadow' : 'text-slate-700 hover:bg-amber-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Controles</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          
          {/* GRAPHICS TAB */}
          {activeTab === 'graphics' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 font-comic">
                  Preset de Qualidade
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => handlePreset(p)}
                      className={`py-2 px-3 rounded-xl font-black text-xs uppercase border-2 transition ${
                        current.preset === p
                          ? 'bg-amber-400 text-slate-950 border-slate-900 shadow'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {p === 'low' ? 'Leve (Celular)' : p === 'medium' ? 'Equilibrado' : 'Alto (PC)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shadows Toggle */}
              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-300">
                <span className="text-sm font-bold text-slate-800">Sombras de Papel</span>
                <input
                  type="checkbox"
                  checked={current.shadows}
                  onChange={(e) => setCurrent(prev => ({ ...prev, shadows: e.target.checked }))}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* FOV Slider */}
              <div className="bg-white p-3 rounded-xl border border-slate-300">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Campo de Visão (FOV)</span>
                  <span>{current.fov}°</span>
                </div>
                <input
                  type="range"
                  min="65"
                  max="95"
                  value={current.fov}
                  onChange={(e) => setCurrent(prev => ({ ...prev, fov: parseInt(e.target.value, 10) }))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Sensitivities */}
              <div className="bg-white p-3 rounded-xl border border-slate-300">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Sensibilidade do Mouse</span>
                  <span>{(current.mouseSensitivity * 1000).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.005"
                  step="0.0002"
                  value={current.mouseSensitivity}
                  onChange={(e) => setCurrent(prev => ({ ...prev, mouseSensitivity: parseFloat(e.target.value) }))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div className="bg-white p-3 rounded-xl border border-slate-300">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Volume Geral</span>
                  <span>{Math.round(current.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={current.masterVolume}
                  onChange={(e) => handleAudioChange('master', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-300">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Efeitos Sonoros (Tiros de Papel, Passos)</span>
                  <span>{Math.round(current.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={current.sfxVolume}
                  onChange={(e) => handleAudioChange('sfx', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-300">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Música do Lobby</span>
                  <span>{Math.round(current.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={current.musicVolume}
                  onChange={(e) => handleAudioChange('music', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          )}

          {/* CONTROLS TAB */}
          {activeTab === 'controls' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-2">
                <div className="font-black text-slate-900 flex items-center gap-2 mb-2 font-comic text-sm">
                  <Keyboard className="w-4 h-4 text-amber-500" />
                  <span>Controles no Computador (Teclado & Mouse)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">W, A, S, D</kbd> Movimentar</div>
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">Mouse</kbd> Mirar</div>
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">Clique Esq.</kbd> Atirar Bolinha</div>
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">Clique Dir.</kbd> Mirar (ADS)</div>
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">Espaço</kbd> Pular</div>
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">Shift</kbd> Correr</div>
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">R</kbd> Recarregar</div>
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">1 - 5 / Scroll</kbd> Trocar Arma</div>
                  <div><kbd className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold">TAB</kbd> Placar</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-300 space-y-2">
                <div className="font-black text-slate-900 flex items-center gap-2 mb-2 font-comic text-sm">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <span>Controles no Celular (Touch)</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li><strong>Joystick Virtual (Esquerda):</strong> Mova o polegar para andar</li>
                  <li><strong>Toque e Arraste (Direita):</strong> Controle a mira do personagem</li>
                  <li><strong>Botão Vermelho (💥):</strong> Disparar arma</li>
                  <li><strong>Botão Mira (🎯):</strong> Mirar de perto (ADS)</li>
                  <li><strong>Botão Pulo (⬆️):</strong> Pular caixas e obstáculos</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-amber-100 p-4 border-t-2 border-slate-300 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-200 transition"
          >
            Cancelar
          </button>
          <button
            id="btn-save-settings"
            onClick={handleSave}
            className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-black px-6 py-2 rounded-xl shadow border-2 border-slate-900 transition"
          >
            Salvar
          </button>
        </div>

      </div>
    </div>
  );
};
