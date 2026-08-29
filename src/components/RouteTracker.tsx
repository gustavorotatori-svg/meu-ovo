import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackRouteChange } from '../lib/analytics';

export default function RouteTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackRouteChange(pathname + (window.location.search || ''));
  }, [pathname]);

  return null;
}