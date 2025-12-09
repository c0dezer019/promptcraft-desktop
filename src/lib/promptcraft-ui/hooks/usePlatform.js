import { useState, useEffect } from 'react';

/**
 * Hook to detect the current platform (web vs desktop)
 * Compatible with both Tauri v1 and v2
 * @returns {{ platform: 'web' | 'desktop', isDesktop: boolean, isWeb: boolean }}
 */
export function usePlatform() {
  const [platform, setPlatform] = useState('web');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    async function detectPlatform() {
      // Try Tauri v2 first
      try {
        await import('@tauri-apps/api/app');
        console.log('[usePlatform] Detected Tauri v2 desktop mode');
        setPlatform('desktop');
        setIsDesktop(true);
        return;
      } catch (error) {
        // Not Tauri v2, try v1
      }

      // Try Tauri v1 (backward compatibility)
      if (typeof window !== 'undefined' && window.__TAURI__) {
        console.log('[usePlatform] Detected Tauri v1 desktop mode');
        setPlatform('desktop');
        setIsDesktop(true);
        return;
      }

      // Web mode
      console.log('[usePlatform] Detected web mode');
      setPlatform('web');
      setIsDesktop(false);
    }

    detectPlatform();
  }, []);

  return {
    platform,
    isDesktop,
    isWeb: !isDesktop,
  };
}
