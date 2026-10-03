# Haven Art — trạng thái bản sửa 03/10/2026

Trạng thái: **đã sửa và kiểm chứng local; chưa deploy**.

Review ngày 03/10 thay thế sign-off của commit cũ ngày 30/09. 24 mục đã xử lý trong [báo cáo sửa lỗi](../reviews/2026-10-03-remediation.vi.md).

Ứng dụng dùng Astro 7/Svelte 5, Node adapter và SQLite. Đồng bộ tài khoản là tùy chọn; dữ liệu không E2EE. Cần credential bootstrap riêng, persistent volume, HTTPS và kiểm tra staging trước rollout. Không triển khai bằng static hosting đơn thuần.

Các gate local gồm framework typecheck, Vitest, production build, HTTP smoke, SEO và dependency audit. Xem docs/release/verification-report.md và README.md để chạy lại.
