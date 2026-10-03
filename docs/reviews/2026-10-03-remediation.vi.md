# Kết quả sửa lỗi review Haven Art

Ngày: 03/10/2026. Báo cáo gốc: `2026-10-03-project-review.vi.md` (commit `420d314`).

Đã xử lý 24 mục bằng thay đổi mã nguồn, cấu hình, nội dung và kiểm tra hồi quy. Mô hình riêng tư được chọn là nhật ký cục bộ với đồng bộ máy chủ tùy chọn, **không phải E2EE**. Khi bật đồng bộ, người dùng được thông báo quản trị viên có thể đọc nội dung. Không tuyên bố đã tích hợp CryptoVault vào sản phẩm.

| Mục | Thay đổi |
| --- | --- |
| R01 | Bỏ LIKE cho token; so sánh SHA-256 token chính xác trong bảng session, kiểm tra định dạng và expires_at |
| R02 | Bỏ credential công khai và autofill; bootstrap bằng biến server; khóa credential mặc định cũ; rate limit trên server |
| R03 | Bỏ cam kết E2EE/“chỉ bạn có thể xem”; cloud mặc định tắt, có thông báo rõ và nút bật/tắt; analytics mạng tắt mặc định |
| R04 | IndexedDB/draft riêng theo tài khoản; không tự chuyển/upload guest; sync giữ owner/token và dừng khi đổi tài khoản; khóa server theo user_id + entry id |
| R05 | Push/pull tombstone, merge timestamp gốc; giữ tombstone để thiết bị offline nhận thao tác xóa; maintenance server xóa nội dung, giữ record xóa |
| R06 | Session 24 giờ; logout/reset password thu hồi session; legacy token không còn dùng được; cookie HTTPS có Secure |
| R07 | Form đổi mật khẩu gọi API server, xác minh password hiện tại, đổi hash và thu hồi session; bỏ fallback local |
| R08 | Flush draft khi đóng/unmount; xử lý draft rỗng, draft edit riêng và cleanup listener; lỗi persist giữ panel mở |
| R09 | Validate trước transaction; restore users/entries/feedback/sessions/settings; map user ID theo email, không phục hồi bearer session |
| R10 | 27 bản nhạc tổng hợp nguyên bản độc lập, đủ checksum/ledger; media cũ/Hasui cách ly ngoài public; 4 tranh có nguồn Commons; bỏ hotlink chưa kiểm chứng khỏi catalog đang chạy; lọc license Wikimedia và hiện attribution |
| R11 | Pull lỗi làm full sync thất bại; không ghi thời điểm sync thành công; bảo toàn timestamp merge và kiểm tra account change |
| R12 | Worker sinh sau build với release hash + precache JS/CSS/font/ảnh; HTML network-first, fallback root; giới hạn cache ảnh, không cache API/admin/audio; update chờ đóng trang cũ |
| R13 | Gate callback/event language thống nhất với Shell; test chọn English → vào Haven |
| R14 | URL ?lang=en thực sự render English; lang/canonical/meta phù hợp; OG đúng 1280×864; sitemap có root và English |
| R15 | Dialog chuyển/giữ/khôi phục focus, trap Tab, inert nền, Escape đóng lớp trên cùng; giữ focus khi nội dung thay đổi |
| R16 | Normalize guest name, identity từ token server, kiểm tra HTTP response; UI báo lỗi khi gửi thất bại |
| R17 | Contract Pexels test thống nhất; kiểm tra key qua server |
| R18 | Key lưu server, API không trả key; proxy có cache/timeout dùng chung cho visitor; bỏ PUBLIC/VITE key fallback |
| R19 | Bỏ snapshot toàn CSDL trên mutation/heartbeat; admin có phân trang API/UI; retention log/session 90 ngày |
| R20 | Thêm astro check/svelte-check và test boundary; sửa hàm export backup; CI build/smoke/SEO/test; mock network |
| R21 | Nâng Astro/adapter/Svelte integration/Vite/Ajv tương thích; giữ Tailwind 3 qua PostCSS |
| R22 | Play lỗi không báo playing; crossfade lỗi giữ track cũ, pause hủy play chờ; UI báo lỗi và chỉ đổi metadata khi thành công |
| R23 | npm start chạy Node entry và đọc .env; README/env example/tài liệu release mô tả SQLite, backup/rollback thực tế |
| R24 | Callback WebGL trả mode thực tế sau fallback; regression test context init thất bại |

## Kiểm chứng

- TypeScript, Astro và Svelte checker qua; Svelte không có lỗi/warning.
- 326/326 test qua trong 39 file Vitest, có regression cho auth, logout/reset, rate limit, owner isolation, tombstone, pull error, backup round-trip, draft close, language, feedback, audio và WebGL.
- Production build/HTTP smoke qua: token wildcard bị từ chối, logout thu hồi, guest feedback HTTP 201, English HTML khác Vietnamese và worker chứa client chunks.
- SEO audit 13/13 qua trên HTML lấy từ production server local.
- npm audit cả dependency/devDependency trả 0 vulnerabilities.
- Browser 375px không tràn ngang; focus nằm trong modal và trở về nút mở; draft giữ được khi đóng ngay; tài khoản mới không thấy draft guest; cloud chưa bật sau đăng ký.
- Ledger kiểm tra tất cả media vật lý/checksum; audio có checksum khác nhau.

Ảnh đã kiểm tra: [2026-10-03-fixed-journal.png](D:/LandingPage/havenart.space/docs/reviews/2026-10-03-fixed-journal.png).

## Khi triển khai

Điền credential bootstrap riêng trong `.env`. Session cũ cần đăng nhập lại. Dữ liệu cũ chưa có owner được giữ trong guest database, không tự gán cho tài khoản; xuất/import cần chủ động trên thiết bị tin cậy.

Bản ghi cũ nằm trong `data/media-quarantine/2026-10-03` ở workspace và không được copy vào dist. Bộ phát hành dùng 27 soundscape/piano tổng hợp nguyên bản và 4 tranh cục bộ có nguồn.

Các kiểm tra dùng CSDL riêng, không migration/thay credential trên CSDL vận hành của workspace. Chưa deploy, chưa chạy browser network emulation cho offline, load test hoặc ma trận Safari/iOS. Đã kiểm tra chính sách offline/cập nhật bằng unit tests và artifact build; cần staging trước rollout.
