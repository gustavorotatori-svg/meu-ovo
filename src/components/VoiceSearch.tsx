import React, { useState, useEffect } from 'react';
import { Mic, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface VoiceSearchProps {
  onTranscript: (text: string) => void;
  className?: string;
  isDark?: boolean;
}

export default function VoiceSearch({ onTranscript, className, isDark }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [browserSupportsSpeech, setBrowserSupportsSpeech] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setBrowserSupportsSpeech(true);
    }
  }, []);

  const startListening = () => {
    setError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Permissão negada');
      } else {
        setError('Erro ao ouvir');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setIsListening(false);
    }
  };

  if (!browserSupportsSpeech) return null;

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={startListening}
        disabled={isListening}
        className={cn(
          "p-3 rounded-xl transition-all flex items-center justify-center relative",
          isListening 
            ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200" 
            : isDark 
              ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-[#FFC928]" 
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black",
          className
        )}
        title="Buscar por voz"
      >
        {isListening ? <Loader2 className="animate-spin" size={20} /> : <Mic size={20} />}
      </button>

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold uppercase py-1 px-2 rounded flex items-center justify-between z-50">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={10} /></button>
        </div>
      )}

      {isListening && (
        <div className="absolute top-1/2 -translate-y-1/2 -right-24 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full z-50 shadow-lg pointer-events-none">
          Ouvindo...
        </div>
      )}
    </div>
  );
}
