import React, { useState } from 'react';
import { AuthService } from '../firebase/authService';
import { soundManager } from '../game/audio/SoundManager';
import { User, Check, X, AlertCircle } from 'lucide-react';

interface NicknameModalProps {
  isOpen: boolean;
  isFirstTime?: boolean;
  currentNickname?: string;
  currentUid?: string;
  onConfirm: (newNickname: string) => void;
  onCancel?: () => void;
}

export const NicknameModal: React.FC<NicknameModalProps> = ({
  isOpen,
  isFirstTime = false,
  currentNickname = '',
  currentUid,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) {
      return 'O nickname não pode ser vazio.';
    }
    if (trimmed.length < 3) {
      return 'O nickname deve ter pelo menos 3 caracteres.';
    }
    if (trimmed.length > 16) {
      return 'O nickname deve ter no máximo 16 caracteres.';
    }
    // Only letters, numbers, underscores and hyphens
    const regex = /^[a-zA-Z0-9_-]+$/;
    if (!regex.test(trimmed)) {
      return 'Use apenas letras, números, _ ou - (sem espaços ou acentos).';
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playButtonClick();
    setError(null);

    const validationError = validate(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmed = nickname.trim();
    setIsSubmitting(true);

    try {
      const isTaken = await AuthService.isNicknameTaken(trimmed, currentUid);
      if (isTaken) {
        setError('Este nickname já está em uso por outro jogador. Escolha outro!');
        setIsSubmitting(false);
        return;
      }

      onConfirm(trimmed);
    } catch (err) {
      console.warn('Error saving nickname:', err);
      // Still allow saving locally if network glitch
      onConfirm(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="nickname-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div
        id="nickname-modal-card"
        className="w-full max-w-md bg-amber-50 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transform -rotate-0.5"
      >
        {/* Header */}
        <div className="bg-amber-400 p-4 border-b-4 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-6 h-6 text-slate-950" />
            <h2 className="text-xl font-black text-slate-950 font-comic tracking-wide">
              {isFirstTime ? 'ESCOLHA SEU NICKNAME' : 'ALTERAR NICKNAME'}
            </h2>
          </div>
          {!isFirstTime && onCancel && (
            <button
              id="btn-close-nickname-modal"
              onClick={onCancel}
              className="bg-slate-900 hover:bg-slate-800 text-white p-1.5 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <p className="text-xs sm:text-sm font-medium text-slate-700">
            {isFirstTime
              ? 'Seja bem-vindo ao PAPERNITE! Digite o nome pelo qual você será reconhecido no lobby, placar e partidas multiplayer:'
              : 'Digite seu novo nickname. Ele será atualizado no seu perfil e nas próximas partidas:'}
          </p>

          <div>
            <label className="block text-xs font-black uppercase text-slate-800 tracking-wider mb-1.5 font-comic">
              NICKNAME DO JOGADOR
            </label>
            <div className="relative">
              <input
                id="input-player-nickname"
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (error) setError(null);
                }}
                maxLength={16}
                autoFocus
                placeholder="Ex: OrigamiMaster"
                className="w-full bg-white border-2 border-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-300 rounded-xl px-4 py-3 text-slate-900 font-bold text-base outline-none transition"
              />
              <span className="absolute right-3 top-3.5 text-xs font-mono font-bold text-slate-400">
                {nickname.length}/16
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              De 3 a 16 caracteres. Apenas letras, números, _ ou -.
            </p>
          </div>

          {error && (
            <div
              id="nickname-error-msg"
              className="flex items-start gap-2 bg-red-100 border-2 border-red-400 p-2.5 rounded-xl text-xs font-bold text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            {!isFirstTime && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-200 transition cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              id="btn-confirm-nickname"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 font-black px-6 py-2.5 rounded-xl shadow border-2 border-slate-900 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>SALVANDO...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>CONFIRMAR</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
