import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Random Chat',
    template: '%s | Random Chat',
  },
  description: 'A simple anonymous random chat app that matches two people for a live conversation.',
  keywords: ['random chat', 'anonymous chat', 'chat app', 'stranger chat', 'live chat'],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Random Chat',
    description: 'A simple anonymous random chat app that matches two people for a live conversation.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Random Chat',
    description: 'A simple anonymous random chat app that matches two people for a live conversation.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
