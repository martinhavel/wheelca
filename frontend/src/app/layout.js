import './globals.css';

export const metadata = {
  title: 'Wheelca — Bezbariérová mapa',
  description: 'Interaktivní mapa přístupnosti pro vozíčkáře. Bezbariérové trasy, místa a WC.',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
