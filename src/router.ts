import { useEffect, useState } from 'react';

export function useRoute(): string[] {
  const get = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);
  const [r, setR] = useState(get);
  useEffect(() => {
    const h = () => {
      setR(get());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return r;
}

export function go(path: string) {
  location.hash = '#/' + path.replace(/^\//, '');
}

export function href(path: string) {
  return '#/' + path.replace(/^\//, '');
}
