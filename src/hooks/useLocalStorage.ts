import { useState, useCallback } from 'react';

// Generic localStorage hook with TypeScript support
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// Specific hooks for common app data
export function useStoredLabelText(): [string, (text: string) => void] {
  return useLocalStorage('labelBro_labelText', '');
}

export function useStoredPrintOptions(): [
  { printFullLabel: boolean; printSmallLabel: boolean; clearAfterPrint: boolean },
  (options: { printFullLabel: boolean; printSmallLabel: boolean; clearAfterPrint: boolean }) => void
] {
  const [value, setValue] = useLocalStorage('labelBro_printOptions', {
    printFullLabel: true,
    printSmallLabel: true,
    clearAfterPrint: false,
  });

  return [value, setValue];
}

export function useStoredConnectionMode(): [
  'manual' | 'auto',
  (mode: 'manual' | 'auto') => void
] {
  const [value, setValue] = useLocalStorage<'manual' | 'auto'>('labelBro_connectionMode', 'manual');
  return [value, setValue];
}

export function useStoredManualIp(): [string, (ip: string) => void] {
  return useLocalStorage('labelBro_manualIp', '');
}

export function useStoredSelectedPrinter(): [string | null, (printerId: string | null) => void] {
  const [value, setValue] = useLocalStorage<string | null>('labelBro_selectedPrinter', null);
  return [value, setValue];
}
