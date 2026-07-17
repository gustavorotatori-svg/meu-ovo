import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { yolkPulse } from '../lib/motion';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'black' | 'white' | 'colored' | 'dark-colored';
  animated?: boolean;
}

export function Logo({ className, size = 'md', variant = 'black', animated = false }: LogoProps) {
  const sizes = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-20',
    xl: 'h-32'
  };

  // Define colors based on variants
  // black: Logo 1 (White bg, Black text)
  // white: All white
  // colored: Logo 3 (White bg, Black 'meu', Yellow 'ovo')
  // dark-colored: Logo 2 (Black bg, White 'meu', Yellow 'ovo')
  
  const yolkYellow = "#FFC928"; 
  const brandBlack = "#111111"; 
  const brandWhite = "#FFFFFF";

  let outlineColor = brandBlack;
  let meuColor = brandBlack;
  let ovoColor = brandBlack;
  let shellFill = brandWhite;

  if (variant === 'white') {
    outlineColor = brandWhite;
    meuColor = brandWhite;
    ovoColor = brandWhite;
    shellFill = "transparent";
  } else if (variant === 'colored') {
    outlineColor = brandBlack;
    meuColor = brandBlack;
    ovoColor = yolkYellow;
    shellFill = brandWhite;
  } else if (variant === 'dark-colored') {
    outlineColor = brandWhite;
    meuColor = brandWhite;
    ovoColor = yolkYellow;
    shellFill = "transparent";
  } else if (variant === 'black') {
    outlineColor = brandBlack;
    meuColor = brandBlack;
    ovoColor = brandBlack;
    shellFill = brandWhite;
  }

  return (
    <div className={cn("flex items-center gap-3 select-none", sizes[size], className)} id="brand-logo">
      <div className="relative h-full aspect-[1/1] shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible">
          {/* Main Egg Shell - Organic brush-stroke style from attachment */}
          <path 
            d="M60 22C56 12 48 10 52 25C44 12 36 15 40 32C30 22 22 30 30 45C15 70 18 100 35 112C52 124 78 122 92 105C106 85 105 55 90 35C82 25 78 15 68 25C70 10 64 8 60 22Z" 
            fill={shellFill}
            stroke={outlineColor} 
            strokeWidth="8" 
            strokeLinejoin="round" 
            strokeLinecap="round"
          />
          
          {/* Heart Yolk - Distinctive bean-heart shape from logo */}
          <motion.path
            animate={animated ? yolkPulse : undefined}
            d="M65 92C50 86 40 75 40 60C40 48 52 42 63 55C74 42 86 48 86 60C86 75 78 86 65 92Z"
            fill={yolkYellow}
          />

          {/* Smiley Eyes and Mouth */}
          <g transform="translate(3, -2)">
            <circle cx="53" cy="62" r="3.5" fill={brandBlack} />
            <circle cx="70" cy="62" r="3.5" fill={brandBlack} />
            <path 
              d="M52 74C52 74 56 81 62 81C68 81 72 74 72 74" 
              fill="none" 
              stroke={brandBlack} 
              strokeWidth="5" 
              strokeLinecap="round"
            />
          </g>

          {/* Shine Highlight */}
          <path 
            d="M78 57C80 59 81 63 81 66" 
            fill="none" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>
      
      <div 
        className="flex flex-col leading-[0.7] font-black lowercase ml-[-2px] items-start"
        style={{ fontSize: size === 'sm' ? '1.2rem' : size === 'md' ? '1.8rem' : size === 'lg' ? '3rem' : '4.5rem' }}
      >
        <span style={{ 
          color: meuColor, 
          fontSize: '0.45em', 
          fontWeight: 800, 
          letterSpacing: '-0.02em', 
          marginBottom: '0.05em'
        }}>meu</span>
        <span style={{ 
          color: ovoColor, 
          fontSize: '1em', 
          letterSpacing: '-0.06em'
        }}>ovo</span>
      </div>
    </div>
  );
}
