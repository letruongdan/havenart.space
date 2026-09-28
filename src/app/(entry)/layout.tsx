import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'HavenArt — Kiến tạo nơi bạn thuộc về',
  description: 'HavenArt — Không gian kiến trúc nhà ở đương đại mang tinh thần Contemporary Tropical Minimalism.',
};

export default function EntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-stone-50 text-stone-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
