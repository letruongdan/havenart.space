# HavenArt — Sổ tay vận hành (RUNBOOK)

Tài liệu hướng dẫn vận hành toàn diện cho dự án HavenArt landing page.
**Nguyên tắc cốt lõi:** 100% mã nguồn mở, không phụ thuộc bất kỳ dịch vụ hay API trả phí nào, quy trình khôi phục an toàn bảo toàn toàn bộ dữ liệu và mã nguồn.

---

## 1. Run (Khởi chạy và Môi trường)

### Yêu cầu hệ thống
- **Node.js:** Phiên bản `v22.14.0+` (khóa trong `.node-version`).
- **Trình quản lý gói:** `npm v10+` (khóa trong `package-lock.json`).
- **Hệ điều hành:** Hỗ trợ đầy đủ Windows (pwsh/cmd), macOS (zsh), Linux (bash).
- **Phần mềm bên ngoài:** Hoàn toàn KHÔNG cần Docker, Redis, cơ sở dữ liệu backend, hay API keys bên ngoài.

### Cài đặt và chạy môi trường phát triển
```bash
# 1. Cài đặt các gói phụ thuộc (exact versions từ lockfile)
npm ci

# 2. Khởi chạy máy chủ phát triển cục bộ
npm run dev
# Truy cập: http://localhost:3000 (tự động chuyển hướng sang /vi hoặc /en)

# 3. Chạy kiểm tra đơn vị cục bộ
npm test

# 4. Chạy kiểm tra E2E đầy đủ trên trình duyệt Chromium
npm run test:e2e
```

---

## 2. Edit (Chỉnh sửa nội dung & Cấu hình)

Mọi nội dung và tham số của HavenArt đều được tách biệt rõ ràng thành các mô-đun cấu hình hướng dữ liệu (data-driven):

### Chỉnh sửa văn bản song ngữ (VI / EN)
- **Tiếng Việt:** [`src/content/vi/messages.ts`](file:///d:/LandingPage/havenart.space/src/content/vi/messages.ts)
- **Tiếng Anh:** [`src/content/en/messages.ts`](file:///d:/LandingPage/havenart.space/src/content/en/messages.ts)
- *Lưu ý:* Luôn duy trì tính đối xứng 100% key giữa hai ngôn ngữ (được kiểm chứng tự động bởi `tests/unit/locale.test.ts` và `tests/unit/dictionary.test.ts`).

### Cấu hình hành trình câu chuyện (Chapters & Hotspots)
- **Chương câu chuyện:** [`src/config/story.ts`](file:///d:/LandingPage/havenart.space/src/config/story.ts) định nghĩa dải tiến độ cuộn `[pStart, pEnd]`, camera waypoints và danh sách điểm neo hotspot cho từng không gian.
- **Điểm tương tác kiến trúc (Hotspots):** [`src/config/hotspots.ts`](file:///d:/LandingPage/havenart.space/src/config/hotspots.ts) định nghĩa tọa độ 3D `[x, y, z]`, tầm nhìn và bán kính kích hoạt.

### Cấu hình thông tin liên hệ chính thức (Production Launch)
- [`src/config/contacts.ts`](file:///d:/LandingPage/havenart.space/src/config/contacts.ts):
  - Khi ở môi trường preview/phát triển: Giữ nguyên `null` cho các kênh chưa cấu hình. Hệ thống sẽ hiển thị trạng thái "Chưa cấu hình" trung thực.
  - Khi phát hành chính thức: Cập nhật URL thật do chủ sở hữu cung cấp (ví dụ: `https://zalo.me/...`, `https://m.me/...`, `https://wa.me/...`).
- [`src/config/site.ts`](file:///d:/LandingPage/havenart.space/src/config/site.ts):
  - Cập nhật `publicOrigin` thành tên miền chính thức (ví dụ: `https://havenart.space`).

---

## 3. Extend (Mở rộng tài sản & Kiến trúc mới)

### Thêm tài sản âm thanh hoặc ảnh mới
1. **Kiểm tra bản quyền:** Tài sản BẮT BUỘC phải là do dự án tự tổng hợp, hoặc thuộc giấy phép CC0-1.0 / Public Domain. Tuyệt đối không nhập tài sản có phí hoặc giấy phép mơ hồ.
2. **Tối ưu hóa dung lượng:**
   - Âm thanh Ogg Vorbis: Tần số lấy mẫu 44.1kHz, bitrate 64-96kbps, loopable mượt mà.
   - Hình ảnh: Định dạng WebP hoặc JPEG nén tối ưu, không vượt quá ngân sách trong `docs/PERFORMANCE_BUDGET.md`.
3. **Đăng ký vào sổ giấy phép:**
   - Thêm bản ghi chi tiết vào [`ASSET_LICENSES.md`](file:///d:/LandingPage/havenart.space/ASSET_LICENSES.md) gồm: `name`, `source`, `creator`, `license`, `file`, `checksum` (SHA-256).
4. **Kiểm định:** Chạy `node scripts/validate-assets.mjs` và `node scripts/validate-runtime-resources.mjs`.

### Thêm không gian hoặc chương mới (Phase 2)
- Tham khảo cấu trúc hợp đồng C03 trong `docs/agents/CONTRACTS.md` và các gói công việc từ W31 đến W36.
- Đăng ký zone ID mới trong `src/config/zones.ts`, tạo component hình học 3D trong `src/components/scene/`, và cập nhật `CHAPTERS` trong `src/config/story.ts`.

---

## 4. Build & Static Host (Đóng gói xuất bản và Máy chủ tĩnh)

Dự án xuất xưởng hoàn toàn dưới dạng trang tĩnh thuần túy (Static Site Generation — SSG), sẵn sàng lưu trữ trên bất kỳ máy chủ tĩnh nào mà không cần Node.js runtime khi vận hành:

### Đóng gói xuất bản tĩnh
```bash
npm run build
```
Lệnh trên tạo thư mục `out/` chứa toàn bộ HTML, CSS, JavaScript, hình ảnh và âm thanh đã tối ưu hóa.

### Chạy thử nghiệm máy chủ tĩnh cục bộ (Zero-dependency)
Dự án cung cấp sẵn một máy chủ tĩnh nội bộ viết bằng Node.js thuần (không cần cài thêm serve/http-server bên thứ ba):
```bash
node tests/helpers/serve-static.mjs 3000 out/
```
Mở trình duyệt tại `http://localhost:3000` để nghiệm thu giao diện giống hệt môi trường máy chủ sản xuất.

### Triển khai lên máy chủ tĩnh sản xuất
Toàn bộ nội dung trong thư mục `out/` có thể được sao chép trực tiếp lên:
- **Nginx:** Cấu hình thư mục gốc `root /path/to/havenart/out; index index.html;` và hỗ trợ rewrite 404 về `/404.html`.
- **Apache / Caddy / GitHub Pages / Cloudflare Pages / AWS S3 + CloudFront:** Tải lên toàn bộ thư mục `out/`.

---

## 5. Check (Kiểm định chất lượng toàn diện trước phát hành)

Trước khi nghiệm thu hoặc xuất bản phiên bản mới, thực hiện toàn bộ chuỗi kiểm định nghiêm ngặt sau:

```bash
# 1. Kiểm tra tính hợp lệ của hệ thống phân kiểu TypeScript
npm run typecheck

# 2. Kiểm tra chất lượng mã nguồn với ESLint
npm run lint

# 3. Chạy toàn bộ 25+ bộ kiểm thử đơn vị với Vitest
npm test

# 4. Kiểm tra toàn bộ nguồn gốc tài sản và mã băm SHA-256
node scripts/validate-assets.mjs

# 5. Kiểm tra tính hợp lệ của tài nguyên runtime
node scripts/validate-runtime-resources.mjs

# 6. Đo lường ngân sách tải và kích thước tài nguyên xuất xưởng
node scripts/measure-payload.mjs

# 7. Kiểm định điều kiện sẵn sàng xuất xưởng (Release Gate)
node scripts/validate-release.mjs

# 8. Đóng gói sản xuất và chạy toàn bộ kiểm thử E2E Playwright
npm run test:e2e
```

---

## 6. Rollback & Recovery (Khôi phục an toàn không xóa mã nguồn)

Quy trình khôi phục được thiết kế tuyệt đối an toàn, bảo vệ toàn vẹn lịch sử git và mã nguồn:

### Khôi phục khi gặp lỗi bộ nhớ đệm hoặc build hỏng
Nếu xảy ra xung đột bộ nhớ đệm biên dịch:
```bash
# Chỉ xóa các thư mục artifacts tạm thời được sinh tự động
# Tuyệt đối KHÔNG xóa src/, public/, docs/, hay các file cấu hình
rm -rf .next out node_modules/.cache
npm run build
```

### Khôi phục phiên bản phát hành ổn định trước đó (Git Tag / Release)
Mỗi bản tích hợp và phát hành thành công đều được đánh dấu bằng SHA ổn định trong `docs/agents/RUN_LEDGER.md`:
```bash
# Xem các mốc tích hợp chính thức trong nhật ký thực thi
git log --oneline -n 10

# Khôi phục an toàn bằng cách tạo nhánh hoặc chuyển commit mà không làm mất lịch sử
git checkout <TAG_HOẶC_COMMIT_SHA>
npm ci
npm run build
```

### Bảo toàn dữ liệu
- Dự án không duy trì cơ sở dữ liệu người dùng nên không có rủi ro mất mát dữ liệu khách hàng khi rollback.
- Nhật ký thực thi `docs/agents/RUN_LEDGER.md` và các báo cáo `docs/agents/reports/` luôn được lưu trữ trong Git làm bằng chứng lịch sử bất biến.
