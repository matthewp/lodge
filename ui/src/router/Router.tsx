import { useState, useEffect } from 'preact/hooks';

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

  useEffect(() => {
    const matchRoute = () => {
      const path = window.location.pathname;

      for (const route of routes) {
        const pattern = new URLPattern({ pathname: route.pattern });
        const match = pattern.exec({ pathname: path });
        if (match) {
          const params = match.pathname.groups || {};
          setCurrentRoute(() => () => route.component(params));
          return;
        }
      }

      // No route matched
      if (fallback) {
        setCurrentRoute(() => fallback);
      } else {
        setCurrentRoute(() => () => <div>404 - Page Not Found</div>);
      }
    };

    // Match route on mount
    matchRoute();

    // Listen for navigation events
    const handleNavigation = () => {
      matchRoute();
    };

    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [routes, fallback]);

  return currentRoute ? currentRoute() : null;
}

export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useParams() {
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const extractParams = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const urlParams: Record<string, string> = {};

      searchParams.forEach((value, key) => {
        urlParams[key] = value;
      });

      setParams(urlParams);
    };

    extractParams();

    const handleNavigation = () => {
      extractParams();
    };

    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  return params;
}