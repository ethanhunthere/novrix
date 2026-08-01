// Ambient declarations for non-TS asset imports used in the App Router.
// Next.js handles these at build time; this file only quiets the editor.

declare module '*.css';
declare module '*.scss';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
