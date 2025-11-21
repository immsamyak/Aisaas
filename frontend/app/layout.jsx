import './globals.css';

export const metadata = {
  title: 'AI Shorts Video Generator',
  description: 'Turn text into engaging short videos with AI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
