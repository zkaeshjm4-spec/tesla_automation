import './globals.css';

export const metadata = {
  title: 'Tesla Automation Control Center',
  description: 'Control, monitor, and re-authenticate your Tesla Fleet Payment automation on GitHub Actions & Vercel.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
