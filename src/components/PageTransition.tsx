import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, type ReactNode } from 'react';

const flameStyle = `
@keyframes flame-flicker {
  0%, 100% { transform: scaleY(1) translateY(0); opacity: 0.9; }
  25% { transform: scaleY(1.15) translateY(-2px); opacity: 1; }
  50% { transform: scaleY(0.85) translateY(2px); opacity: 0.8; }
  75% { transform: scaleY(1.1) translateY(-1px); opacity: 0.95; }
}
@keyframes flame-dance {
  0%, 100% { transform: translateX(0) scale(1); }
  33% { transform: translateX(3px) scale(1.05); }
  66% { transform: translateX(-2px) scale(0.95); }
}
@keyframes pan-shake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-3deg); }
  40% { transform: rotate(3deg); }
  60% { transform: rotate(-2deg); }
  80% { transform: rotate(2deg); }
}
.flame-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.flame-container {
  position: relative;
  width: 120px;
  height: 120px;
}
.flame-body {
  position: absolute;
  bottom: 30%;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 60px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: flame-flicker 0.15s ease-in-out infinite;
}
.flame-body:nth-child(1) {
  background: radial-gradient(ellipse at center, #fff5a0 0%, #ff8c00 40%, #ff4500 70%, transparent 100%);
  width: 50px;
  height: 70px;
  animation-delay: 0s;
  filter: blur(1px);
}
.flame-body:nth-child(2) {
  background: radial-gradient(ellipse at center, #ffd700 0%, #ff6600 50%, transparent 100%);
  width: 35px;
  height: 55px;
  animation-delay: 0.05s;
  filter: blur(2px);
}
.flame-body:nth-child(3) {
  background: radial-gradient(ellipse at center, #ffeb3b 0%, #ff8c00 30%, transparent 100%);
  width: 45px;
  height: 50px;
  animation-delay: 0.1s;
  filter: blur(3px);
  opacity: 0.7;
}
.flame-glow {
  position: absolute;
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,140,0,0.4) 0%, rgba(255,69,0,0.1) 40%, transparent 70%);
  animation: flame-dance 0.3s ease-in-out infinite;
}
.pan-icon {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 48px;
  animation: pan-shake 0.4s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}
`;

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [showFlame, setShowFlame] = useState(false);

  useEffect(() => {
    setShowFlame(true);
    const timer = setTimeout(() => setShowFlame(false), 1500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <style>{flameStyle}</style>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {showFlame && (
            <motion.div
              className="flame-overlay"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.div
                className="flame-container"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flame-glow" />
                <div className="flame-body" />
                <div className="flame-body" />
                <div className="flame-body" />
                <motion.div
                  className="pan-icon"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 10 }}
                  transition={{ duration: 0.2, repeat: Infinity, repeatType: 'reverse' }}
                >
                  🍳
                </motion.div>
              </motion.div>
            </motion.div>
          )}
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
