/**
 * Shared layout tokens — pair with CSS variables in globals.css.
 * Use these class names instead of hardcoded padding/scroll values per page.
 */

/** @deprecated Header now renders an in-flow spacer; kept for legacy imports */
export const SITE_MAIN_OFFSET = "site-header-spacer";

/** Clears fixed public header — prefer LandingHeader's built-in spacer */
export const SITE_HEADER_SPACER = "site-header-spacer";

/** Anchor targets under the floating public header. */
export const SITE_SECTION_ANCHOR = "site-section-anchor";

/** Room for mobile bottom nav on public pages. */
export const SITE_BOTTOM_OFFSET = "site-bottom-offset";

/** Clears dashboard mobile header (hidden on md+). */
export const DASHBOARD_MOBILE_OFFSET = "dashboard-mobile-offset";

/** Room for dashboard mobile bottom nav. */
export const DASHBOARD_BOTTOM_OFFSET = "site-bottom-offset";

/** Docs sidebar sticky positioning below public header. */
export const DOCS_SIDEBAR_STICKY = "docs-sidebar-sticky";

/** Markdown / prose heading scroll offset. */
export const PROSE_HEADING_ANCHOR = "prose-heading-anchor";

export const SITE_CONTAINER = "mx-auto w-full max-w-5xl px-4 sm:px-6";

export const SITE_CONTAINER_WIDE = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export const DOCS_CONTENT_MAX = "mx-auto w-full max-w-3xl";

/** @deprecated Use SITE_MAIN_OFFSET */
export const LANDING_HEADER_OFFSET = SITE_MAIN_OFFSET;

/** @deprecated Use SITE_SECTION_ANCHOR */
export const LANDING_SECTION_SCROLL = SITE_SECTION_ANCHOR;

/** @deprecated Use PROSE_HEADING_ANCHOR on headings */
export const DOCS_CONTENT_SCROLL_MT =
  "[&_h2]:scroll-mt-[var(--site-header-scroll-offset)] [&_h3]:scroll-mt-[var(--site-header-scroll-offset)]";

/** @deprecated Use SITE_CONTAINER */
export const LANDING_CONTAINER_CLASS = SITE_CONTAINER;
