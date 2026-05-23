import { useEffect } from 'react';

const SITE_NAME = 'NCLMS — Namibia Cash Loan Management System';
const BASE_URL = 'https://nclms.konizanam.com';

export interface PageMeta {
  /** Page-specific title; appended with " — NCLMS" automatically. */
  title: string;
  description?: string;
  /** Override the canonical URL. Defaults to current pathname under BASE_URL. */
  canonicalPath?: string;
  /** Set to true on pages that shouldn't be indexed (auth, account, dashboards). */
  noindex?: boolean;
}

function upsertMeta(selector: string, attrName: 'name' | 'property', attrValue: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Lightweight per-page meta updates. Sets <title>, the description meta tag,
 * a canonical link, and the matching Open Graph + Twitter tags. No external
 * deps — uses native DOM. Updates on mount; resets to the site default on
 * unmount so a page without this hook doesn't inherit stale meta.
 */
export function usePageMeta(meta: PageMeta): void {
  useEffect(() => {
    const fullTitle = `${meta.title} — NCLMS`;
    const canonical = meta.canonicalPath
      ? `${BASE_URL}${meta.canonicalPath}`
      : `${BASE_URL}${window.location.pathname}`;

    document.title = fullTitle;
    upsertCanonical(canonical);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    upsertMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      meta.noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large',
    );

    if (meta.description) {
      upsertMeta('meta[name="description"]', 'name', 'description', meta.description);
      upsertMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
      upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
    }

    return () => {
      document.title = SITE_NAME;
    };
  }, [meta.title, meta.description, meta.canonicalPath, meta.noindex]);
}
