/**
 * Font CSS variables (DM Sans, Krona One, Orbitron).
 * We load Google Fonts at runtime via a link in layout so the Next.js build never fetches them.
 * Variables are defined in globals.css; same export shape as next/font for drop-in use.
 */
const dmSans = {
  variable: "--font-dm-sans",
  className: "font-sans",
};
const kronaOne = {
  variable: "--font-krona-one",
  className: "font-sans",
};
const orbitron = {
  variable: "--font-orbitron-sans",
  className: "font-sans",
};

export { dmSans, kronaOne, orbitron };
