import { useEffect, useState } from 'react';

/**
 * Hook to safely detect if component has mounted (client-side)
 * Prevents hydration mismatches between server and client
 */
export const useMounted = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};
