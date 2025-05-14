// src/app/layout.jsx
export const metadata = {
  title: 'Earnings Call Summarizer',
  description: 'AI summaries of the latest earnings transcripts',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
