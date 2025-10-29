// src/hooks/useMediaQuery.js
import { useState, useEffect } from 'react';

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    
    // Modern way to listen for changes
    media.addEventListener('change', listener);
    
    // Fallback for older browsers
    // if (media.addListener) {
    //   media.addListener(listener);
    // }

    return () => {
      // Modern way to remove the listener
      media.removeEventListener('change', listener);
      
      // Fallback for older browsers
      // if (media.removeListener) {
      //   media.removeListener(listener);
      // }
    };
  }, [query]);

  return matches;
};