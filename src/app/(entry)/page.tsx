import Link from 'next/link';

export default function EntryPage() {
  return (
    <main id="main-content" className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-4xl font-light tracking-wide text-stone-900 mb-4">
        HavenArt
      </h1>
      <p className="text-lg text-stone-600 max-w-xl mb-8">
        Kiến tạo nơi bạn thuộc về — Không gian minh họa ý tưởng thiết kế nhà ở Contemporary Tropical Minimalism.
      </p>
      <div className="flex gap-4">
        <Link
          href="/vi"
          className="px-6 py-3 bg-stone-900 text-stone-50 rounded-sm hover:bg-stone-800 transition-colors"
        >
          Khám phá không gian (Tiếng Việt)
        </Link>
        <Link
          href="/en"
          className="px-6 py-3 border border-stone-300 text-stone-800 rounded-sm hover:border-stone-500 transition-colors"
        >
          Explore in English
        </Link>
      </div>
    </main>
  );
}
