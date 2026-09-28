# HavenArt — Kiến tạo nơi bạn thuộc về

Trang đích kiến trúc cao cấp (Architectural Landing Page) kết hợp trải nghiệm cuộn không gian 3D tương tác (cinematic 3D scroll journey) và nền tảng tài liệu ngữ nghĩa chuẩn mực tiếp cận (WCAG 2.2 AA).

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](#)
[![Three.js](https://img.shields.io/badge/Three.js-0.174-orange)](#)
[![WCAG](https://img.shields.io/badge/WCAG-2.2%20AA-success)](#)
[![Asset Budget](https://img.shields.io/badge/Asset%20Budget-0%20USD-blueviolet)](#)

---

## 1. Điểm nổi bật & Triết lý kiến trúc

- **Kiến trúc hai lớp (Dual-Layer Architecture):**
  - **Lớp ngữ nghĩa (Semantic HTML Base):** Dựng sẵn tĩnh 100% (SSG) cho cả `/vi` và `/en`. Khi tắt JavaScript hoặc kích hoạt `prefers-reduced-motion`, toàn bộ nội dung, câu chuyện 6 chương, triết lý thiết kế, 3 thẻ chi tiết kiến trúc native và kênh liên hệ vẫn hiển thị trọn vẹn, lập chỉ mục SEO tối đa.
  - **Lớp nâng cao (Progressive 3D Enhancement):** Khi đủ điều kiện phần cứng và người dùng không yêu cầu giảm chuyển động, hệ thống nạp Three.js/R3F render hành trình camera spline mượt mà qua biệt thự nhiệt đới HavenArt (ngưỡng cửa chính, phòng khách, vườn sau).
- **Ngân sách tài sản 0 USD & Bản quyền minh bạch:**
  - 100% hình học kiến trúc do dự án dựng (procedural geometry / code-based proxies).
  - 3 tệp âm thanh môi trường Ogg Vorbis tổng hợp thủ tục (220.8 KB <= 1.5 MB).
  - 12 poster WebP và 1 ảnh OpenGraph 1200x630 (32.2 KB) nén tối ưu.
  - Toàn bộ tài sản được cấp phép theo CC0-1.0 / Public Domain và lưu mã băm SHA-256 tại [`ASSET_LICENSES.md`](ASSET_LICENSES.md).
- **Tiếp cận toàn diện (WCAG 2.2 AA):**
  - Hộp thoại chi tiết kiến trúc (Hotspot Modal) tuân thủ nghiêm ngặt APG Modal Dialog: Khóa tiêu điểm (focus trap), đóng bằng phím Escape, đóng bằng backdrop an toàn, và hoàn trả tiêu điểm về nút kích hoạt.
  - Liên kết bỏ qua (Skip Links) `#main-content` và `#contact`.
  - Reflow tại 320 CSS px không tràn viền ngang; vùng chạm tương tác di động tối thiểu >= 44x44 CSS px.
- **Bảo mật và Tôn trọng quyền riêng tư (Privacy-First Telemetry):**
  - Không nhúng SDK phân tích bên thứ ba, không cookie theo dõi, không lưu dữ liệu cá nhân.
  - Production sink mặc định là no-op; các sự kiện tuân thủ chặt chẽ canonical bus và khử trùng lặp click/dwell.
- **Không thông tin giả lập (Zero Fake Claims):**
  - Ở chế độ preview, các kênh liên hệ chưa có URL thật được giữ `null` và hiển thị trạng thái "Chưa cấu hình" trung thực. Cổng phát hành sản xuất (Release Gate) khóa chặt việc xuất xưởng khi chưa có thông tin chính thức từ chủ sở hữu.

---

## 2. Công nghệ cốt lõi (Tech Stack)

| Thành phần | Công nghệ / Thư viện | Vai trò |
|---|---|---|
| **Framework** | Next.js 15 (App Router, SSG `output: 'export'`) | Xuất bản tĩnh 100%, routing song ngữ `/vi`, `/en`, SEO |
| **Giao diện** | React 19, TypeScript 5.7, Tailwind CSS 3.4 | Giao diện responsive, theme nhiệt đới tối giản, tokens chuẩn |
| **Đồ họa 3D** | Three.js 0.174, @react-three/fiber 9 | Dựng hình villa nhiệt đới, vật liệu PBR, ánh sáng hoàng hôn $\to$ chạng vạng |
| **Động học cuộn** | GSAP 3.12, Custom Spline Rail Engine | Nội suy Catmull-Rom/PCHIP, kẹp vận tốc mượt mà, triệt tiêu roll |
| **Âm thanh** | Web Audio API (createAudioController) | Bật theo chủ ý (opt-in), crossfade công suất bằng nhau (`cos² + sin² = 1`) |
| **Kiểm thử** | Vitest 3, Playwright 1.51 | 25+ bộ unit test (200+ test cases), 9 bộ E2E matrix |

---

## 3. Khởi chạy nhanh (Quick Start)

Chi tiết quy trình vận hành và lệnh quản trị xem tại [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

### Yêu cầu
- Node.js >= 22.14.0 (xem `.node-version`)
- npm >= 10.0.0

### Các lệnh thông dụng
```bash
# 1. Cài đặt thư viện
npm ci

# 2. Khởi chạy môi trường phát triển (http://localhost:3000)
npm run dev

# 3. Kiểm tra TypeScript & ESLint
npm run typecheck
npm run lint

# 4. Chạy toàn bộ kiểm thử đơn vị
npm test

# 5. Đóng gói sản phẩm tĩnh (Static Export ra thư mục out/)
npm run build

# 6. Chạy toàn bộ kiểm thử E2E trên trình duyệt
npm run test:e2e

# 7. Kiểm tra nguồn gốc tài sản & Giấy phép
node scripts/validate-assets.mjs

# 8. Đo lường ngân sách tải trang
node scripts/measure-payload.mjs

# 9. Kiểm tra cổng phát hành sản xuất (Release Gate)
node scripts/validate-release.mjs
```

---

## 4. Cấu trúc thư mục dự án

```text
havenart.space/
├── docs/                        # Toàn bộ đặc tả kỹ thuật, thiết kế và quản trị
│   ├── RUNBOOK.md               # Sổ tay vận hành (Run, Edit, Extend, Build, Check, Rollback)
│   ├── ACCEPTANCE_CRITERIA.md   # 18 tiêu chí nghiệm thu Phase 1 & ma trận môi trường
│   ├── PERFORMANCE_BUDGET.md    # Ngân sách payload, draw calls, triangles & FPS
│   ├── ACCESSIBILITY_SPEC.md    # Đặc tả tiếp cận WCAG 2.2 AA & APG Modal Dialog
│   ├── agents/                  # Hệ thống quản trị multi-agent, contracts và nhật ký thực thi
│   └── superpowers/             # Bộ kế hoạch và đặc tả chuyên sâu
├── public/                      # Tài nguyên tĩnh xuất xưởng
│   ├── audio/                   # 3 tệp âm thanh không gian (outdoor, interior, garden.ogg)
│   ├── images/story/            # 12 ảnh poster chương (WebP cho desktop và mobile)
│   └── images/og-havenart.jpg   # Ảnh OpenGraph chia sẻ mạng xã hội (1200x630)
├── scripts/                     # Kịch bản kiểm tra tự động
│   ├── validate-assets.mjs      # Kiểm định nguồn gốc tài sản & mã băm SHA-256
│   ├── validate-release.mjs     # Kiểm tra điều kiện xuất xưởng sản xuất
│   ├── validate-runtime-resources.mjs # Xác thực cấu trúc tài nguyên runtime
│   └── measure-payload.mjs      # Phân tích kích thước tài nguyên và ngân sách
├── src/
│   ├── app/                     # Next.js App Router (entry redirect, /[locale], sitemap, robots)
│   ├── components/              # React components (story, scene, hotspots, ui)
│   ├── config/                  # Cấu hình câu chuyện, camera, zones, quality, contacts, site
│   ├── content/                 # Từ điển dữ liệu song ngữ (/vi/messages.ts, /en/messages.ts)
│   ├── hooks/                   # Custom hooks (analytics, hotspot projection, story runtime)
│   ├── lib/                     # Thư viện thuần (three, audio, i18n, performance, story, contact)
│   ├── stores/                  # Trạng thái trải nghiệm (experienceStore)
│   └── styles/                  # Token giao diện và CSS toàn cục
├── tests/
│   ├── e2e/                     # 9 bộ kịch bản kiểm thử E2E Playwright
│   ├── fixtures/                # Dữ liệu mẫu và bộ tiêm lỗi trình duyệt
│   ├── helpers/                 # Máy chủ tĩnh cục bộ (serve-static.mjs)
│   └── unit/                    # 25 bộ kiểm thử đơn vị Vitest
├── ASSET_LICENSES.md            # Sổ đăng ký nguồn gốc và giấy phép tài sản
├── package.json                 # Cấu hình gói và kịch bản thực thi
└── tsconfig.json                # Cấu hình phân kiểu TypeScript nghiêm ngặt
```

---

## 5. Tài liệu tham khảo chính

- **Sổ tay vận hành:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md)
- **Quy tắc cộng tác & Quản trị:** [`AGENTS.md`](AGENTS.md)
- **Hợp đồng giao diện & Module:** [`docs/agents/CONTRACTS.md`](docs/agents/CONTRACTS.md)
- **Sổ giấy phép tài sản:** [`ASSET_LICENSES.md`](ASSET_LICENSES.md)
- **Nhật ký tích hợp hệ thống:** [`docs/agents/RUN_LEDGER.md`](docs/agents/RUN_LEDGER.md)

---

## 6. Giấy phép & Bản quyền

- **Mã nguồn:** Bản quyền thuộc dự án HavenArt. Phát triển theo kiến trúc mở, độc lập với các dịch vụ trả phí.
- **Tài nguyên nghệ thuật:** Toàn bộ âm thanh và hình ảnh poster được phát hành theo giấy phép **CC0-1.0 / Public Domain Dedication**. Chi tiết xem tại [`ASSET_LICENSES.md`](ASSET_LICENSES.md).
