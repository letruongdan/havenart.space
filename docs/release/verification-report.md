# Haven Art — verification ngày 03/10/2026

Sign-off của commit 0f480db ngày 30/09 đã lỗi thời. Báo cáo này thay thế kết luận “ready for production” của bản static trước khi account/sync/telemetry được thêm.

Bản sửa hiện có session server được hash và thu hồi, SQLite backup đủ bảng, IndexedDB cách ly tài khoản, sync tombstone, draft flush, modal focus, media nguyên bản có ledger và service worker sinh sau build.

## Các lệnh kiểm chứng

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run verify:build
npm run seo:audit
npm audit
```

TypeScript/Astro/Svelte checker, 326/326 test trong 39 file, production build/HTTP smoke và SEO 13/13 đã qua ở local. Dependency audit không còn lỗ hổng. HTTP smoke dùng CSDL riêng; không chạm dữ liệu vận hành.

Chi tiết từng mục và giới hạn kiểm chứng: [remediation](../reviews/2026-10-03-remediation.vi.md).

## Giới hạn

Chưa deploy, chưa load test, chưa thử offline bằng network emulation của trình duyệt thật, chưa kiểm tra toàn bộ Safari/iOS. Vì vậy kết quả này là xác nhận local, không phải chứng nhận production. Mô hình cloud là plaintext có sự đồng ý rõ ràng, không E2EE.

## Triển khai và rollback

Chạy Node production entry qua npm start; cấu hình .env theo .env.example và persistent SQLite volume. Giữ worker và client chunks cùng release. Trước rollout, sao lưu SQLite đúng cách (online backup hoặc dừng server), thử restore ở đường dẫn khác, rồi kiểm tra staging. Rollback frontend phải giữ dữ liệu và xem xét schema/namespace mới; không dùng hướng dẫn static-only trước đây.
