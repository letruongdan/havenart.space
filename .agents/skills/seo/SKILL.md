---
name: seo
description: Comprehensive SEO auditing, meta tags, OpenGraph, JSON-LD Schema.org structured data, XML sitemaps, robots.txt, Core Web Vitals, and keyword optimization. Use to audit website SEO, generate meta tags, check sitemaps, optimize ranking factors, and implement structured data.
argument-hint: "[audit|meta|schema|sitemap|checklist]"
license: MIT
metadata:
  author: havenart
  version: "1.0.0"
---

# SEO Optimization & Health Audit Skill

Kỹ năng chuyên sâu về tối ưu hóa công cụ tìm kiếm (Search Engine Optimization - SEO), kiểm tra sức khỏe SEO tự động, dữ liệu có cấu trúc Schema.org, Open Graph, Sitemap XML và Core Web Vitals cho ứng dụng Haven Art.

## When to Use

- Kiểm toán (audit) toàn diện chất lượng SEO và lập chỉ mục của trang web
- Tối ưu hóa thẻ meta tiêu đề (Title), mô tả (Description), từ khóa (Keywords)
- Cấu hình Open Graph (Facebook, Zalo) và Twitter Cards khi chia sẻ mạng xã hội
- Quản lý dữ liệu có cấu trúc Schema.org JSON-LD (WebSite, WebApplication, CreativeWork)
- Cấu hình và kiểm tra tệp `robots.txt` và `sitemap-index.xml`
- Kiểm soát lập chỉ mục đa ngôn ngữ (Hreflang vi, en, x-default)
- Ngăn chặn lập chỉ mục các trang quản trị nhạy cảm (`noindex`, `nofollow`)
- Tối ưu hóa Core Web Vitals (LCP, CLS, INP) phục vụ xếp hạng Google PageSpeed

## Quick Start

### 1. Chạy kiểm tra SEO tự động toàn dự án
```bash
node .agents/skills/seo/scripts/seo-audit.mjs
```
Hoặc qua npm script:
```bash
npm run seo:audit
```

### 2. Xem bảng kiểm tra tiêu chuẩn SEO
Đọc tài liệu tại: `references/seo-checklist.md`

## Architecture & Integrations

Hệ thống SEO của dự án được xây dựng theo kiến trúc đa tầng không làm tăng dung lượng JavaScript client-side:

```
┌────────────────────────────────────────────────────────┐
│                   Astro Build / SSR                    │
├──────────────────────────┬─────────────────────────────┤
│   @astrojs/sitemap       │  Tự động sinh sitemap.xml   │
│   astro-seo              │  Xử lý thẻ meta tiêu chuẩn  │
│   src/components/SEO.astro│  Component SEO dùng lại     │
│   public/robots.txt      │  Quy tắc thu thập dữ liệu   │
└──────────────────────────┴─────────────────────────────┘
```

1. **`@astrojs/sitemap`**: Tích hợp chính thức của Astro trong `astro.config.mjs`, tự động lập bản đồ các trang công khai khi build, tự động loại trừ `/admin` và `/api/`.
2. **`src/components/SEO.astro`**: Component bọc `astro-seo`, quản lý:
   - Thẻ `<title>` và `<meta name="description">`
   - Canonical URL chuẩn HTTPS
   - Open Graph đầy đủ (kích thước ảnh 1200x630, locale vi_VN & en_US)
   - Twitter Card `summary_large_image`
   - Hreflang đa ngôn ngữ (`vi`, `en`, `x-default`)
   - Dữ liệu có cấu trúc JSON-LD (`WebSite` và `WebApplication`)
3. **`public/robots.txt`**: Khai báo quyền truy cập bot và trỏ trực tiếp đến `sitemap-index.xml`.

## Subcommands & Workflows

| Lệnh | Mục đích | Hướng dẫn thực hiện |
| :--- | :--- | :--- |
| `audit` | Quét kiểm tra toàn diện HTML & Sitemap | Chạy script `.agents/skills/seo/scripts/seo-audit.mjs` |
| `meta` | Tối ưu thẻ meta và mạng xã hội | Cập nhật props tại `src/components/SEO.astro` |
| `schema` | Mở rộng JSON-LD Schema.org | Thêm thực thể vào script `application/ld+json` |
| `sitemap` | Cập nhật cấu hình bản đồ trang web | Chỉnh sửa bộ lọc sitemap tại `astro.config.mjs` |
| `checklist` | Tra cứu danh sách tiêu chuẩn kiểm thử | Đọc `references/seo-checklist.md` |

## Verification & Continuous Integration

Để đảm bảo chất lượng SEO không bị suy giảm (regression) trong quá trình phát triển, dự án có bài kiểm thử Vitest tự động:
```bash
npx vitest run tests/seo/
```
Bài test này xác thực cú pháp robots.txt, tính hợp lệ của thẻ SEO trên HTML build, Schema.org và tính an toàn của trang admin.
