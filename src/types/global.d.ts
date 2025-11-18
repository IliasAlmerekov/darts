// Global type declarations for importing static assets (CSS, images, fonts, etc.)
// This fixes TypeScript errors like:
// "Cannot find module or type declarations for side-effect import of './start.css'.ts(2882)"

declare module "*.css";
declare module "*.scss";
declare module "*.sass";

declare module "*.module.css";
declare module "*.module.scss";

declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.webp";

declare module "*.mp3";
declare module "*.wav";

declare module "*.json" {
  // Use `unknown` here to avoid `no-explicit-any` eslint rule while still allowing
  // importing JSON files. Consumers should assert/validate the expected structure.
  const value: unknown;
  export default value;
}
