const urls = [
  'http://localhost:4329/',
  'http://localhost:4329/favicon.svg',
  'http://localhost:4329/sw.js',
  'http://localhost:4329/manifest.webmanifest',
  'http://localhost:4329/audio/morning-mist.mp3',
  'http://localhost:4329/audio/serene-solitude.mp3',
  'http://localhost:4329/audio/gentle-nightfall.mp3',
  'http://localhost:4329/images/artworks/hokusai-red-fuji.webp',
  'http://localhost:4329/images/artworks/monet-water-lilies.webp',
  'http://localhost:4329/images/artworks/hasui-lake-chuzenji.webp',
  'http://localhost:4329/images/artworks/turner-evening-star.webp',
  'http://localhost:4329/images/artworks/friedrich-morning-mist.webp',
  'http://localhost:4329/icons/icon-192.png',
  'http://localhost:4329/icons/icon-512.png',
  'http://localhost:4329/credits.json',
];

async function check() {
  console.log('Testing Haven Art HTTP responses on http://localhost:4329:');
  let hasError = false;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const ct = res.headers.get('content-type') || 'unknown';
      const cl = res.headers.get('content-length') || '?';
      const statusStr = res.status === 200 ? '✓ [200]' : `✗ [${res.status}]`;
      console.log(`${statusStr} ${new URL(url).pathname} - ${ct} (${cl} bytes)`);
      if (res.status !== 200) hasError = true;
    } catch (err) {
      console.error(`✗ [FAIL] ${url}: ${err.message}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\nSome assets failed verification!');
    process.exit(1);
  } else {
    console.log('\nAll 15 endpoints returned 200 OK successfully!');
  }
}

check();
