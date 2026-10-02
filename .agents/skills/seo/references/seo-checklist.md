# Haven Art — Professional SEO Reference & Optimization Checklist

## 1. Technical SEO (Thu thập dữ liệu & Lập chỉ mục)

- [x] **robots.txt**: Nằm tại `/robots.txt`, cho phép các công cụ tìm kiếm cào trang chủ (`Allow: /`), chặn các đường dẫn riêng tư (`Disallow: /admin`, `Disallow: /api/`), khai báo URL sitemap (`Sitemap: https://havenart.space/sitemap-index.xml`).
- [x] **XML Sitemap**: Tự động sinh bởi `@astrojs/sitemap` tại `/sitemap-index.xml` và `/sitemap-0.xml` khi build.
- [x] **Canonical URLs**: Khai báo `<link rel="canonical" href="https://havenart.space/" />` để tránh duplicate content giữa các query parameters hoặc domain variations.
- [x] **SSL / HTTPS**: Toàn bộ liên kết, ảnh, script, fonts đều tải qua giao thức `https://`.
- [x] **Responsive Mobile Viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`.
- [x] **Admin Route Protection**: Trang `/admin` khai báo `<meta name="robots" content="noindex, nofollow" />` và được loại trừ khỏi XML sitemap.

## 2. On-Page & Semantic SEO (Nội dung & Thẻ siêu dữ liệu)

- [x] **Title Tag**: Tối ưu 30–65 ký tự (`Haven Art — Góc tĩnh lặng cho tâm hồn`), chứa từ khóa thương hiệu và thông điệp cốt lõi.
- [x] **Meta Description**: Tối ưu 120–165 ký tự, hấp dẫn, chứa lời kêu gọi hành động (CTA) nhẹ nhàng và mô tả trung thực tính năng.
- [x] **Keywords & Author**: Khai báo meta keywords và author cho công cụ tìm kiếm phụ trợ.
- [x] **Semantic HTML5**: Sử dụng `<header>`, `<main>`, `<nav>`, `<h1>`, `<h2>`, `<button>` đúng chuẩn ngữ nghĩa.
- [x] **Image Alt Attributes**: Toàn bộ hình ảnh kiệt tác hội họa kinh điển đều có thuộc tính `alt` mô tả sinh động.

## 3. Social Meta & Open Graph (Tối ưu hóa chia sẻ mạng xã hội)

- [x] **Open Graph (Facebook, Zalo, LinkedIn)**:
  - `og:title`, `og:description`, `og:url`, `og:site_name`, `og:type: website`
  - `og:image`: Ảnh đại diện tỉ lệ chuẩn 1200x630px (`hokusai-red-fuji.webp`)
  - `og:locale`: `vi_VN`, `og:locale:alternate`: `en_US`
- [x] **Twitter Cards**:
  - `twitter:card: summary_large_image`
  - `twitter:site: @havenartspace`
  - `twitter:title`, `twitter:description`, `twitter:image`

## 4. Structured Data (Dữ liệu có cấu trúc Schema.org JSON-LD)

- [x] **Schema WebSite**: Khai báo thực thể website, tên thương hiệu, logo, đa ngôn ngữ `inLanguage: ["vi-VN", "en-US"]`.
- [x] **Schema WebApplication**:
  - `applicationCategory: LifestyleApplication`
  - `operatingSystem: All`
  - `offers: 0 VND (Miễn phí)`
  - `featureList`: Danh sách tính năng nổi bật (PWA ngoại tuyến, nhạc ambient, nhật ký bảo mật AES-GCM).

## 5. Đa ngôn ngữ & International SEO (Hreflang)

- [x] Khai báo `<link rel="alternate" hreflang="vi" href="https://havenart.space/" />`
- [x] Khai báo `<link rel="alternate" hreflang="en" href="https://havenart.space/?lang=en" />`
- [x] Khai báo `<link rel="alternate" hreflang="x-default" href="https://havenart.space/" />`

## 6. Core Web Vitals & Hiệu năng tải trang

- [x] **LCP (Largest Contentful Paint)**: Tối ưu preloading fonts, định dạng ảnh WebP nén cao cấp, fallback gradient tức thời.
- [x] **CLS (Cumulative Layout Shift = 0)**: Cố định kích thước khung tranh canvas/img `fixed inset-0`, các thành phần UI dock/gate không gây xô lệch giao diện.
- [x] **INP (Interaction to Next Paint)**: Tối ưu hóa phản hồi micro-interactions, debounce autosave 2000ms.
- [x] **PWA & Caching**: Service Worker lưu bộ nhớ đệm app shell và hình ảnh, giúp trang tải tức thì sau lần truy cập đầu tiên.
