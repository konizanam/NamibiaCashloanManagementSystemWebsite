import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Sits inside <BrowserRouter>. Whenever the pathname changes, jump back to
 * the top of the document. Without this, navigating from a deep-scrolled
 * page (e.g. bottom of Home) to another route leaves you scrolled to that
 * same Y on the new page.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
};
