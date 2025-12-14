import { useState, useEffect, useRef } from 'preact/hooks';

interface Route {
  pattern: string;
  component: (params?: Record<string, string>) => JSX.Element;
}

interface RouterProps {
  routes: Route[];
  fallback?: () => JSX.Element;
}

export function Router({ routes, fallback }: RouterProps) {
  const [currentRoute, setCurrentRoute] = useState<() => JSX.Element | null>(null);
  const routesRef = useRef(routes);
  const fallbackRef = useRef(fallback);

  // Keep refs updated
  routesRef.current = routes;
  fallbackRef.current = fallback;

  useEffect(() => {
    const matchRoute = () => {
      const path = window.location.pathname;

      for (const route of routesRef.current) {
        const pattern = new URLPattern({ pathname: route.pattern });
        const match = pattern.exec({ pathname: path });
        if (match) {
          const params = match.pathname.groups || {};
          setCurrentRoute(() => () => route.component(params));
          return;
        }
      }

      // No route matched
      if (fallbackRef.current) {
        setCurrentRoute(() => fallbackRef.current!);
      } else {
        setCurrentRoute(() => () => <div>404 - Page Not Found</div>);
      }
    };

    const handleNavigate = (event: NavigateEvent) => {
      // Only intercept same-origin navigations
      if (!event.canIntercept || event.hashChange) return;

      event.intercept({
        handler: () => {
          matchRoute();
        }
      });
    };

    // Match route on mount
    matchRoute();

    // Listen for navigation events
    window.navigation.addEventListener('navigate', handleNavigate);

    return () => {
      window.navigation.removeEventListener('navigate', handleNavigate);
    };
  }, []);

  return currentRoute ? currentRoute() : null;
}

export function navigate(path: string) {
  window.navigation.navigate(path);
}

export function useParams() {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const extractParams = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlParams: Record<string, string> = {};

      searchParams.forEach((value, key) => {
        urlParams[key] = value;
      });

      setParams(urlParams);
    };

    extractParams();

    const handleChange = () => {
      extractParams();
    };

    window.navigation.addEventListener('currententrychange', handleChange);

    return () => {
      window.navigation.removeEventListener('currententrychange', handleChange);
    };
  }, []);

  return params;
}

export function useCurrentPath() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleChange = () => {
      setPath(window.location.pathname);
    };

    window.navigation.addEventListener('currententrychange', handleChange);

    return () => {
      window.navigation.removeEventListener('currententrychange', handleChange);
    };
  }, []);

  return path;
}
