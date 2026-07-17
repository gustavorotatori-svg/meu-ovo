import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import OvinhoTour, { TourStep } from '../components/OvinhoTour';

interface TourConfig {
  steps: TourStep[];
  onComplete: () => void;
  onSkip?: () => void;
}

interface TourContextType {
  isTourOpen: boolean;
  startTour: (config: TourConfig) => void;
  closeTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TourConfig | null>(null);

  const startTour = useCallback((cfg: TourConfig) => {
    setConfig(cfg);
  }, []);

  const closeTour = useCallback(() => {
    setConfig(null);
  }, []);

  return (
    <TourContext.Provider value={{ isTourOpen: !!config, startTour, closeTour }}>
      {children}
      {config && (
        <OvinhoTour
          steps={config.steps}
          isOpen={true}
          onComplete={() => {
            config.onComplete();
            closeTour();
          }}
          onSkip={() => {
            config.onSkip?.();
            closeTour();
          }}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
