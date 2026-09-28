# HavenArt — Báo cáo Hiệu năng và Đo lường Tài nguyên (Gate G4)

- **Thời điểm đo:** 28/09/2026
- **Candidate Commit:** `fa147748ab563e6c5d5760198f86fcdbd1096e8e`
- **Phiên bản hợp đồng:** `havenart-contracts-1.1`
- **Đặc tả căn cứ:** [`docs/PERFORMANCE_BUDGET.md`](file:///d:/LandingPage/havenart.space/docs/PERFORMANCE_BUDGET.md)

---

## 1. Kết quả đo lường Ngân sách Tải (Payload Measurements)

Đo lường tự động qua công cụ [`scripts/measure-payload.mjs`](file:///d:/LandingPage/havenart.space/scripts/measure-payload.mjs):

| Hạng mục tài nguyên | Kích thước thực tế | Ngân sách tối đa | Chênh lệch (Dư địa) | Đánh giá |
|---|:---:|:---:|:---:|:---:|
| **Core 3D compressed (Gzip/Brotli)** | **0.0 KB** | $\le 8.0\text{ MB}$ | $-8.0\text{ MB}$ ($100\%$) | **PASS** |
| **Initial Scene (Tải lần đầu)** | **0.0 KB** | $\le 15.0\text{ MB}$ | $-15.0\text{ MB}$ ($100\%$) | **PASS** |
| **Tổng tài nguyên âm thanh (3 tệp Ogg)** | **220.8 KB** | $\le 1.5\text{ MB}$ | $-1.28\text{ MB}$ ($85.3\%$) | **PASS** |
| **Ảnh poster mobile lớn nhất (WebP)** | **6.5 KB** | $\le 250.0\text{ KB}$ | $-243.5\text{ KB}$ ($97.4\%$) | **PASS** |
| **Ảnh poster desktop lớn nhất (WebP)** | **14.6 KB** | $\le 500.0\text{ KB}$ | $-485.4\text{ KB}$ ($97.1\%$) | **PASS** |
| **Ảnh OpenGraph chia sẻ mạng xã hội (JPEG)** | **32.2 KB** | $\le 400.0\text{ KB}$ | $-367.8\text{ KB}$ ($91.9\%$) | **PASS** |
| **JavaScript first-load shared bundle** | **54.4 KB** | $\le 200.0\text{ KB}$ | $-145.6\text{ KB}$ ($72.8\%$) | **PASS** |
| **Chi phí bản quyền tài sản bên thứ ba** | **0 USD** | $0\text{ USD}$ | $0\text{ USD}$ | **PASS** |

*Ghi chú về Core 3D 0 KB:* Toàn bộ hình học biệt thự nhiệt đới trong Phase 1 được kiến tạo bằng hình học thủ tục (procedural code-based geometry trong Three.js), do đó không tiêu tốn băng thông tải các tệp nhị phân GLB tĩnh cồng kềnh qua mạng.

---

## 2. Cấu hình phân tầng chất lượng thích ứng (Adaptive Quality Policy)

Hệ thống quản lý chất lượng theo 3 tầng (High / Medium / Low) định nghĩa tại [`src/config/quality.ts`](file:///d:/LandingPage/havenart.space/src/config/quality.ts):

| Tham số kỹ thuật | High (Mặc định Desktop) | Medium (Tablet / Di động cao) | Low (Di động yếu / Tiết kiệm pin) |
|---|:---:|:---:|:---:|
| **Trần tỷ lệ điểm ảnh thiết bị (DPR cap)** | $\le 1.5$ | $\le 1.25$ | $\le 1.0$ |
| **Trần điểm ảnh khung hình (Pixel cap)** | $4.0\text{ Mpx}$ | $2.5\text{ Mpx}$ | $1.5\text{ Mpx}$ |
| **Kích thước bản đồ bóng (Shadow Map)** | $2048 \times 2048$ | $1024 \times 1024$ | Tắt bóng ($0$) |
| **Ngân sách lệnh vẽ (Max draw calls)** | $\le 200$ | $\le 120$ | $\le 60$ |
| **Ngân sách đa giác (Max triangles)** | $\le 1.5\text{ M}$ | $\le 800\text{ K}$ | $\le 300\text{ K}$ |
| **Chất lượng hình học cây cối (LOD)** | Đầy đủ tán lá | Giảm $50\%$ mật độ | Proxy cơ bản |

### Cơ chế giám sát khung hình (`FrameMonitor`)
- **Khởi động an toàn (Warm-up):** Bỏ qua $3000\text{ ms}$ đầu tiên để tránh tính toán sai trong giai đoạn nạp ban đầu.
- **Quy tắc hạ bậc:** Yêu cầu $2\text{ cửa sổ}$ chậm liên tiếp ($5000\text{ ms/cửa sổ}$) với thời gian khung hình trung vị $> 16.6\text{ ms}$ (cho 60fps) mới hạ 1 bậc chất lượng.
- **Thời gian hồi phục (Cooldown):** Duy trì $10000\text{ ms}$ ổn định trước khi xem xét tiếp; không bao giờ tự động nâng bậc để triệt tiêu hiện tượng dao động (oscillation).
- **Tạm dừng khi ẩn tab:** Tự động gọi `setSuspended(true)` khi tài liệu bị ẩn để không đo các frame bị đóng băng.
- **Bỏ qua khi đổi kích thước (Resize reflow):** Bỏ qua khung hình trong $1000\text{ ms}$ sau khi thay đổi kích thước cửa sổ.
- **Chuyển đổi tĩnh khi suy thoái kéo dài:** Khi ở tầng Low mà khung hình vẫn tiếp tục tụt dốc, phát tín hiệu `onFallbackRequest` để chuyển toàn bộ giao diện sang bản đọc tĩnh thuần túy mượt mà.

---

## 3. Telemetry nội bộ và Kiểm thử thiết bị

- **Lớp phủ chẩn đoán (Debug Overlay):** Tích hợp tại `src/lib/performance/debugOverlay.tsx`, chỉ xuất hiện khi có cờ `?debug=perf` hoặc `NEXT_PUBLIC_DEBUG_PERF=true`. Giám sát thời gian thực: FPS, P95 frame time, active tier, effective DPR, draw calls, triangles, memory heaps. Hoàn toàn sạch và không gây ô nhiễm DOM của người dùng cuối.
- **Nghĩa vụ kiểm chứng phần cứng vật lý (Hardware Verification):**
  - Môi trường kiểm thử tự động (Vitest, Playwright Chromium headless) đã xác nhận tính chính xác của các thuật toán thích ứng, kẹp DPR, quản lý bộ nhớ đệm vòng bounded ring buffer $\le 600$ mẫu.
  - Phù hợp với quy định tại [`AGENTS.md`](file:///d:/LandingPage/havenart.space/AGENTS.md), các thông số đo đạc trên phần cứng di động thực tế (thermal throttling, độ mượt xúc giác trên máy Android/iOS tầm trung) được xếp vào nghĩa vụ kiểm thử sau tích hợp của Gate G4 khi chủ dự án tiến hành thử nghiệm nghiệm thu người dùng (UAT).
