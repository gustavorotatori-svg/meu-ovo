import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * OptimizedImage component for better performance
 * Handles lazy loading, auto-formatting for known providers (Pexels, Unsplash),
 * and provides a blur-up effect.
 */
export default function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className, 
  priority = false,
  ...props 
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState(src);

  useEffect(() => {
    let finalSrc = src;

    // Basic optimization for Pexels/Unsplash if width/height are provided
    if (src.includes('images.pexels.com') || src.includes('images.unsplash.com')) {
      const url = new URL(src);
      
      // If we have specific width/height, replace or add them
      if (width) url.searchParams.set('w', width.toString());
      if (height) url.searchParams.set('h', height.toString());
      
      // Add auto-optimization parameters
      url.searchParams.set('auto', 'compress,format');
      url.searchParams.set('fit', 'crop');
      
      finalSrc = url.toString();
    }

    setOptimizedSrc(finalSrc);
  }, [src, width, height]);

  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-gray-100",
        !isLoaded && "animate-pulse",
        className
      )}
      style={{ width, height }}
    >
      <img
        src={optimizedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
