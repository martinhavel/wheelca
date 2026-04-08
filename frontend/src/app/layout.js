import './globals.css';
import { AuthProvider } from '../components/AuthContext';

export const metadata = {
  title: 'Wheelca — Bezbarierova mapa',
  description: 'Interaktivni mapa pristupnosti pro vozickare. Bezbarierove trasy, mista a WC.',
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
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
