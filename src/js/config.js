/* ==========================================================================
   Application configuration
   The only place version, branding strings and storage keys are defined.
   ========================================================================== */

export const APP = {
  name: 'ThinkTrooper',
  tool: 'Aftermarket Pricing Explorer',
  version: '0.4.2',
  year: '2026'
};

/* localStorage key for the auto-saved session.
   DO NOT rename casually: changing it orphans every session already saved in
   a colleague's browser. Bump the suffix only on a breaking session-format
   change, and handle the migration in state.js -> applySnapshot(). */
export const STORAGE_KEY = 'thinktrooper_workshop_v1';

/* Session-file format version written into exported .json files. */
export const SESSION_FORMAT = 3;

/* Logo path. The build script rewrites this exact string to a base64 data URI
   when it inlines everything into the standalone dist file, so keep the
   literal in one place and never build the path dynamically. */
export const LOGO_SRC = 'assets/logo.png';
