import { type ReactNode, useEffect, useState } from 'react';

type ClientOnlyProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted ? children : fallback;
}
