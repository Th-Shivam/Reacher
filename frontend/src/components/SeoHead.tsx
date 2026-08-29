import { useEffect } from 'react';
import { useLocation } from 'react-router';

const SITE_ORIGIN = 'https://reacherpro.vercel.app';
const SOCIAL_IMAGE = `${SITE_ORIGIN}/logo.png`;
const DESCRIPTION = 'Research the right people, personalize your outreach, and turn every reach-out into a better conversation with Reacher.';

type SeoPage = {
  title: string;
  description: string;
  canonicalPath: string;
};

const PUBLIC_PAGES: Record<string, SeoPage> = {
  '/': {
    title: 'Reacher - Research Before You Reach',
    description: DESCRIPTION,
    canonicalPath: '/',
  },
  '/about': {
    title: 'About Reacher - Research Before You Reach',
    description: 'See how Reacher researches roles and companies before turning your real experience into thoughtful outreach.',
    canonicalPath: '/about',
  },
};

const SOCIAL_PROPERTIES = [
  'og:title',
  'og:description',
  'og:type',
  'og:url',
  'og:image',
  'og:image:alt',
  'og:site_name',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'twitter:image:alt',
];

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function removeMeta(attribute: 'name' | 'property', key: string) {
  document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)?.remove();
}

function setCanonical(href: string | null) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }

  const link = existing ?? document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  if (!existing) document.head.appendChild(link);
}

function setStructuredData(page: SeoPage | undefined) {
  const existing = document.head.querySelector<HTMLScriptElement>('#reacher-structured-data');
  if (!page) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.createElement('script');
  script.id = 'reacher-structured-data';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Reacher',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE_ORIGIN,
        description: DESCRIPTION,
        image: `${SITE_ORIGIN}/reacher-icon-512.png`,
      },
      {
        '@type': 'Organization',
        name: 'Reacher',
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/reacher-icon-512.png`,
      },
      {
        '@type': 'WebSite',
        name: 'Reacher',
        url: SITE_ORIGIN,
        description: DESCRIPTION,
      },
    ],
  });
  if (!existing) document.head.appendChild(script);
}

export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname.replace(/\/+$/, '') || '/';
    const page = PUBLIC_PAGES[normalizedPath];
    const title = page?.title ?? 'Reacher';
    const description = page?.description ?? DESCRIPTION;
    const isIndexable = Boolean(page);

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', isIndexable ? 'index, follow' : 'noindex, nofollow');
    setCanonical(isIndexable ? `${SITE_ORIGIN}${page.canonicalPath}` : null);

    if (isIndexable) {
      const canonicalUrl = `${SITE_ORIGIN}${page.canonicalPath}`;
      setMeta('property', 'og:title', title);
      setMeta('property', 'og:description', description);
      setMeta('property', 'og:type', 'website');
      setMeta('property', 'og:url', canonicalUrl);
      setMeta('property', 'og:image', SOCIAL_IMAGE);
      setMeta('property', 'og:image:alt', 'Reacher research and outreach workspace');
      setMeta('property', 'og:site_name', 'Reacher');
      setMeta('name', 'twitter:card', 'summary_large_image');
      setMeta('name', 'twitter:title', title);
      setMeta('name', 'twitter:description', description);
      setMeta('name', 'twitter:image', SOCIAL_IMAGE);
      setMeta('name', 'twitter:image:alt', 'Reacher research and outreach workspace');
    } else {
      SOCIAL_PROPERTIES.forEach((property) => {
        removeMeta(property.startsWith('og:') ? 'property' : 'name', property);
      });
    }

    setStructuredData(page);
  }, [pathname]);

  return null;
}
