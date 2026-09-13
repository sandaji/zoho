// frontend/hooks/use-hotkeys.ts
'use client';

import { useEffect } from 'react';

type HotkeyCallback = (event: KeyboardEvent) => void;

export const useHotkeys = (hotkeys: Record<string, HotkeyCallback>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const key in hotkeys) {
        const parts = key.split('+');
        const ctrl = parts.includes('Ctrl');
        const shift = parts.includes('Shift');
        const alt = parts.includes('Alt');
        const code = parts.find(p => !['Ctrl', 'Shift', 'Alt'].includes(p));

        if (
          event.key.toLowerCase() === code?.toLowerCase() &&
          event.ctrlKey === ctrl &&
          event.shiftKey === shift &&
          event.altKey === alt
        ) {
          event.preventDefault();
          if (hotkeys[key]) {
            hotkeys[key](event);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hotkeys]);
};
