import { type ReactNode, useSyncExternalStore } from 'react';

type ClientOnlyProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** Renders children only in the browser; the server and the hydration pass render the fallback. */
export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return isClient ? children : fallback;
}
