# Review toàn dự án Haven Art

Ngày review: 03/10/2026 (Asia/Saigon). Commit: `420d314`. Phiên bản: `0.1.0`.

**Kết luận: chưa đủ điều kiện đưa bản hiện tại lên production với dữ liệu nhật ký thật.** Có lỗi vượt qua xác thực quản trị đã tái hiện trên bản build, lỗi cách ly tài khoản, lỗi đồng bộ/xóa và các cam kết bảo mật không khớp với triển khai.

## Phạm vi và bằng chứng

Rà soát cấu trúc `src` (69 file), cấu hình Astro/Vite/TypeScript, API, các luồng Svelte chính, IndexedDB/SQLite, crypto, đồng bộ, backup, audio/WebGL, i18n, PWA, SEO, tài nguyên media, 34 file test và CI. Kiểm tra giao diện trên build local ở 1280×720 và 375×812. Các probe dùng IndexedDB và SQLite riêng trong `tests/reports/review`; không dùng CSDL vận hành để tái hiện lỗi.

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| `npm run typecheck` | Qua; lệnh hiện tại chỉ là `tsc --noEmit`, chưa kiểm tra type bên trong Astro/Svelte |
| `npm test` | 310/311 test qua; 33/34 file test qua |
| Test lỗi | `tests/pwa/offline-policy.spec.ts:106`, tìm theme-color trực tiếp trong source trang |
| `npm run build` | Qua; tạo cả `dist/client` và server Node trong `dist/server` |
| `npm run seo:audit` | 13/13 qua; chủ yếu kiểm tra sự tồn tại của metadata |
| `npm audit` | 8 package bị gắn cảnh báo: 1 critical, 3 high, 1 moderate, 3 low |
| HTTP build local | `/`, `/index.html`, `/admin` trả 200; `/api/admin/stats` cũng trả 200 với token wildcard |
| Giao diện mobile | 375px không có tràn ngang trong màn hình chính và bảng viết đã kiểm tra |
| Probe xác thực/đồng bộ | Xác nhận bypass, token không bị thu hồi, khôi phục bài đã xóa, gửi dữ liệu sai tài khoản, báo sync thành công khi pull lỗi |
| Probe phục hồi | Báo nhập 1 feedback nhưng phục hồi 0; phiên truy cập cũng không được phục hồi |
| Probe media/PWA | Audio báo playing sau khi play bị từ chối; chế độ WebGL báo sai; HTML cache cũ không được kiểm tra lại qua mạng |

Lỗi test theme-color là lỗi kỳ vọng của test sau khi metadata được chuyển vào `SEO.astro`: HTML build thực tế vẫn có theme-color. Vì vậy không nên sửa sản phẩm bằng cách thêm metadata trùng chỉ để làm test xanh.

Chưa thực hiện audit live production, Lighthouse/Core Web Vitals, tải đồng thời, trải nghiệm offline trên trình duyệt thật, Safari/iOS, hay ma trận đầy đủ các ngôn ngữ và thiết bị. Các kết luận hiệu năng bên dưới dựa trên kiến trúc và kích thước build, không phải số đo tải production.

## Kiến trúc và phần đang làm tốt

Ứng dụng hiện là Astro prerender hai trang `/` và `/admin`, kết hợp các API Node động và Svelte cho phần tương tác. Nhật ký được lưu vào IndexedDB; khi đăng nhập, client gửi nhật ký lên SQLite. SQLite còn lưu tài khoản, feedback, phiên truy cập và metadata thiết bị; nhiều thao tác ghi tạo thêm bản JSON toàn CSDL.

Các điểm tốt có thể giữ lại:

- Repository IndexedDB tách khỏi UI; có soft delete, undo và backup JSON.
- Import backup cục bộ được validate bằng Ajv trước transaction; thao tác nhập entries/drafts nằm chung transaction.
- Nội dung nhật ký được render bằng binding văn bản Svelte; không thấy luồng render body bằng `{@html}`.
- SQLite sử dụng prepared statements và transaction cho upsert nhật ký; phần update có điều kiện `user_id`.
- Token được sinh bằng `crypto.randomBytes`; password server có salt và PBKDF2; khóa trong CryptoVault là non-extractable.
- Audio có bước mở khóa từ thao tác người dùng; WebGL có xử lý context loss, giới hạn DPR và reduced motion.
- Có ảnh fallback cục bộ, font tự host, manifest, sitemap, canonical, noindex admin và test cho nhiều subsystem.

Các cơ chế này cần kiểm chứng ở cấp luồng người dùng: module crypto tốt không đồng nghĩa dữ liệu trong sản phẩm đã được mã hóa.

## Danh sách phát hiện

P0: cần xử lý ngay. P1: chặn phát hành. P2: cần sửa trong đợt ổn định. Tổng cộng **24 phát hiện: 1 P0, 10 P1, 13 P2**. Mức ưu tiên của cảnh báo dependency không đồng nghĩa mức khai thác đã được chứng minh.

### R01 — P0 — Token wildcard vượt qua xác thực

Vị trí: [db.ts:792](D:/LandingPage/havenart.space/src/lib/server/db.ts:792), [admin-auth.ts:31](D:/LandingPage/havenart.space/src/lib/server/admin-auth.ts:31).

`findUserByToken()` so sánh `tokens LIKE ?` với pattern chứa nguyên token đầu vào. `%` và `_` vẫn có ý nghĩa wildcard dù truy vấn đã bind parameter. Trên CSDL mới có root admin được seed, `findUserByToken('%')` trả về admin; `verifyAdminRequest()` chấp nhận request đó. Đã xác nhận `GET /api/admin/stats` trên build local trả HTTP 200 với `Authorization: Bearer %`.

Các API admin dùng cùng verifier nên lỗi ảnh hưởng cả dữ liệu quản trị và thao tác thay đổi dữ liệu. Đổi mật khẩu riêng không giải quyết được lỗi này. Sửa bằng bảng session riêng với so sánh token/hash chính xác, validate format và hạn dùng; thêm regression test cho `%`, `_`, token ngắn và chuỗi không hợp lệ. Cơ chế wildcard được mô tả trong [tài liệu SQLite](https://www.sqlite.org/lang_expr.html#like).

### R02 — P1 — Root admin được seed bằng mật khẩu công khai

Vị trí: [db.ts:136](D:/LandingPage/havenart.space/src/lib/server/db.ts:136), [db.ts:279](D:/LandingPage/havenart.space/src/lib/server/db.ts:279), [AdminLoginGate.svelte:212](D:/LandingPage/havenart.space/src/components/admin/AdminLoginGate.svelte:212).

CSDL mới tự tạo root với mật khẩu cố định; trang login còn hiển thị và cho tự điền thông tin đó. Vì `/admin` là trang công khai, bất kỳ ai cũng có thể đọc credential mặc định. Đã xác nhận credential này đăng nhập được vào CSDL thử mới. Server login không có rate limit; lockout trong localStorage không bảo vệ API.

Bỏ credential production khỏi client, tạo admin bằng bước bootstrap server có secret cấu hình hoặc công cụ thiết lập riêng, buộc đổi credential ban đầu và kiểm soát số lần đăng nhập ở server.

### R03 — P1 — Cam kết E2EE và “chỉ bạn có thể xem” không đúng với luồng dữ liệu

Vị trí: [WritePanel.svelte:325](D:/LandingPage/havenart.space/src/components/WritePanel.svelte:325), [WritePanel.svelte:270](D:/LandingPage/havenart.space/src/components/WritePanel.svelte:270), [repository.ts:72](D:/LandingPage/havenart.space/src/lib/db/repository.ts:72), [cloud-sync.ts:67](D:/LandingPage/havenart.space/src/lib/sync/cloud-sync.ts:67).

UI nói dữ liệu mã hóa đầu cuối và không bị thu thập. Trong thực tế, repository ghi `body` dạng plaintext, cloud sync gửi nguyên entries qua JSON và server lưu body đọc được. Admin có API đọc nội dung nhật ký của mọi tài khoản. Không có import/call CryptoVault trong đường ghi, đọc, sync hoặc backup đang dùng. Ngoài ra `recordVisit()` gửi heartbeat analytics từ khi mở trang.

Cần quyết định và triển khai mô hình riêng tư rõ ràng: nếu giữ E2EE, tích hợp mã hóa vào storage, sync và export, có luồng quản lý khóa/khôi phục; nếu dùng cloud đọc được ở server, sửa cam kết sản phẩm và công bố đúng dữ liệu được lưu, quyền truy cập và analytics. HTTPS không thay thế E2EE.

### R04 — P1 — Nhật ký không được cách ly theo tài khoản ở client

Vị trí: [schema.ts:82](D:/LandingPage/havenart.space/src/lib/db/schema.ts:82), [HavenShell.svelte:164](D:/LandingPage/havenart.space/src/components/HavenShell.svelte:164), [UserAuthModal.svelte:104](D:/LandingPage/havenart.space/src/components/UserAuthModal.svelte:104), [user-client.ts:86](D:/LandingPage/havenart.space/src/lib/auth/user-client.ts:86).

Tất cả người dùng cùng origin dùng `haven_db` và draft `current`; entry không có owner. Logout chỉ bỏ session. Login/đăng ký tài khoản mới lập tức sync toàn bộ repository hiện có. Probe đã xác nhận một bài offline của A được upload thành bài của B sau khi A logout và B login. Nhật ký cũ vẫn hiển thị trên máy dùng chung.

Dùng database/partition và draft theo owner, xác định rõ việc chuyển nhật ký guest vào tài khoản, và gắn owner/token cố định cho từng lần sync. Ngoài ra server dùng `id` làm khóa duy nhất toàn bảng: cùng entry ID gửi bởi tài khoản khác gây lỗi UNIQUE; nên xác định namespace `(user_id, id)` phù hợp với chiến lược import/sync.

### R05 — P1 — Xóa bài không đồng bộ và có thể bị phục hồi

Vị trí: [JournalList.svelte:141](D:/LandingPage/havenart.space/src/components/JournalList.svelte:141), [cloud-sync.ts:168](D:/LandingPage/havenart.space/src/lib/sync/cloud-sync.ts:168), [db.ts:1280](D:/LandingPage/havenart.space/src/lib/server/db.ts:1280).

Delete chỉ soft-delete/purge cục bộ. Full sync lấy `listActiveEntries()`, không đẩy tombstone, rồi pull bản còn active trên server. Local map không có bản đã xóa nên `createEntry()` ghi đè nó với `deletedAt: null`. Probe đã tái hiện bài đã xóa xuất hiện lại ngay sau sync. Pull server cũng lọc hết tombstone, nên xóa ở một thiết bị không lan sang thiết bị khác.

Thiết kế version/tombstone hai chiều, giữ tombstone đến khi đã xác nhận sync; không purge sau 10 giây nếu chưa truyền được thao tác xóa. Thêm test delete → offline → sync và delete giữa hai thiết bị.

### R06 — P1 — Logout/reset password không thu hồi token; token không có hạn dùng server

Vị trí: [api/admin/auth.ts:81](D:/LandingPage/havenart.space/src/pages/api/admin/auth.ts:81), [db.ts:1006](D:/LandingPage/havenart.space/src/lib/server/db.ts:1006), [db.ts:1175](D:/LandingPage/havenart.space/src/lib/server/db.ts:1175), [admin/auth.ts:292](D:/LandingPage/havenart.space/src/lib/admin/auth.ts:292).

Admin DELETE chỉ xóa cookie; token vẫn ở SQLite. Reset password chỉ đổi hash/salt. Client user logout chỉ xóa localStorage. Server không kiểm tra expiresAt; client admin còn chỉ kiểm tra token dài hơn 5 ký tự để coi là authenticated. Probe xác nhận token vẫn dùng được sau logout và reset password. Hạn cookie không làm bearer token hết hạn.

Lưu session có expiresAt/revokedAt ở server, logout thu hồi session đang dùng, reset password thu hồi các session liên quan; UI cần kiểm tra session server. Cookie production nên có Secure và credential cần được quản lý thống nhất.

### R07 — P1 — Nút đổi mật khẩu admin chỉ đổi localStorage

Vị trí: [AdminDashboard.svelte:1014](D:/LandingPage/havenart.space/src/components/admin/AdminDashboard.svelte:1014), [admin/auth.ts:359](D:/LandingPage/havenart.space/src/lib/admin/auth.ts:359).

Form đổi mật khẩu gọi `changeAdminPassword()` trong module client; hàm chỉ cập nhật `haven_admin_cred_v1`. Mật khẩu server không thay đổi nhưng UI báo thành công. Do đó người quản trị có thể nghĩ đã vô hiệu hóa mật khẩu mặc định trong khi server vẫn chấp nhận nó. Hàm cũng xác minh mật khẩu cũ theo credential local, không theo tài khoản server đang login.

Thay bằng endpoint server xác minh password hiện tại, đổi hash/salt trong transaction và thu hồi session theo chính sách. Bỏ hệ thống credential client và fallback đăng nhập local khi API lỗi.

### R08 — P1 — Đóng bảng viết trước autosave làm mất phần vừa nhập

Vị trí: [WritePanel.svelte:157](D:/LandingPage/havenart.space/src/components/WritePanel.svelte:157), [WritePanel.svelte:172](D:/LandingPage/havenart.space/src/components/WritePanel.svelte:172), [HavenShell.svelte:528](D:/LandingPage/havenart.space/src/components/HavenShell.svelte:528).

Autosave đợi 2 giây; khi unmount, onDestroy hủy timer nhưng không flush. Đã nhập chuỗi thử, bấm Escape ngay, mở lại và xác nhận textarea rỗng. Nếu có draft cũ, thay đổi mới nhất cũng có thể bị mất. Xóa sạch nội dung rồi đóng không xóa draft cũ vì nhánh autosave empty chỉ return.

Cho close/navigation chờ persist phần chưa lưu, flush draft an toàn và xử lý draft rỗng; kiểm tra reload/đổi panel và lỗi storage. Lưu ý `onMount(async () => ... return cleanup)` hiện không đăng ký cleanup listener trong WritePanel vì trả Promise; sửa thành callback đồng bộ. Quy tắc này có trong [tài liệu Svelte](https://svelte.dev/docs/svelte/lifecycle-hooks).

### R09 — P1 — Backup server báo khôi phục thành công nhưng bỏ dữ liệu

Vị trí: [db.ts:648](D:/LandingPage/havenart.space/src/lib/server/db.ts:648), [db.ts:1637](D:/LandingPage/havenart.space/src/lib/server/db.ts:1637), [api/admin/backup.ts:46](D:/LandingPage/havenart.space/src/pages/api/admin/backup.ts:46).

Export có users, entries, feedbacks, sessions, settings. Import đếm và merge feedbacks vào object RAM, nhưng `writeServerDatabase()` chỉ upsert users/entries. Sessions/settings cũng không được import. Probe phục hồi sang CSDL thử mới: báo `feedbacksImported: 1`, thực tế feedbacks bằng 0 và sessions bằng 0.

Triển khai restore tất cả bảng đã export trong transaction với schema version và validation đầy đủ. Kiểm tra round-trip sang CSDL rỗng và xác nhận nội dung, không chỉ success/count trả về. Phải xác định semantics merge/replace và mapping user ID khi email đã tồn tại.

### R10 — P1 — Sổ nguồn gốc media thiếu phần lớn audio và chưa chứng minh quyền sử dụng

Vị trí: [ambient-catalog.ts:19](D:/LandingPage/havenart.space/src/lib/audio/ambient-catalog.ts:19), [download_official_piano.mjs:10](D:/LandingPage/havenart.space/scripts/download_official_piano.mjs:10), [credits.json](D:/LandingPage/havenart.space/public/credits.json), [credits.spec.ts:10](D:/LandingPage/havenart.space/tests/content/credits.spec.ts:10).

Có 27 file MP3 nhưng ledger chỉ ghi 3; 24 file không có record. Test coverage media chỉ dùng DEFAULT_TRACKS/CURATED_ARTWORKS, nên không bao phủ catalog đang chạy. Catalog gán “Promotional / Archival Studio Solo” cho bản ghi Yiruma; đây không phải bằng chứng cấp phép. [Trang nguồn Yiruma SOLO](https://archive.org/details/yiruma-solo) ghi nguồn Qobuz và © 2021 Mind Tailor Music. Không tìm thấy bằng chứng quyền tái sử dụng của dự án trong repo đã rà soát; đây là thiếu bằng chứng, chưa phải kết luận pháp lý về một giấy phép ngoài repo.

Trước phát hành, bổ sung quyền sử dụng bản ghi cụ thể hoặc thay bằng media có quyền rõ ràng. Đối chiếu ledger với toàn bộ file/catalog thực tế, không chỉ catalog mặc định. `Wikimedia` cũng đang default thiếu license thành Public Domain và chưa lọc license; cần kiểm tra metadata cấp phép trước đưa asset vào thư viện.

### R11 — P2 — Full sync trả success khi pull thất bại

Vị trí: [cloud-sync.ts:180](D:/LandingPage/havenart.space/src/lib/sync/cloud-sync.ts:180), [cloud-sync.ts:212](D:/LandingPage/havenart.space/src/lib/sync/cloud-sync.ts:212).

Sau push thành công, pull lỗi bị bỏ qua; code vẫn cập nhật lastSyncedAt và trả success. Probe với pull HTTP 500 xác nhận success bằng true. Người dùng nhận “đồng bộ hoàn tất” dù dữ liệu ở máy khác chưa tải về.

Phân biệt trạng thái push/pull và chỉ báo full sync thành công khi cả hai hoàn tất. Giữ lỗi cho UI, có retry; timestamp đã tải từ server nên được bảo toàn khi merge, thay vì luôn đổi thành Date.now() qua updateEntry.

### R12 — P1 — Cache PWA không cập nhật theo release và chưa precache đủ shell

Vị trí: [sw-policy.ts:10](D:/LandingPage/havenart.space/src/sw-policy.ts:10), [sw-policy.ts:13](D:/LandingPage/havenart.space/src/sw-policy.ts:13), [sw.ts:117](D:/LandingPage/havenart.space/src/sw.ts:117), [index.astro:31](D:/LandingPage/havenart.space/src/pages/index.astro:31).

Tên cache cố định `haven-shell-v1`; HTML dùng cache-first không revalidate. Khi build mới chỉ thay client chunk/HTML, nội dung worker có thể không đổi, nên browser vẫn dùng HTML cũ và URL chunk cũ. Probe xác nhận root trả HTML cũ với 0 network call. Nếu các chunk release cũ bị bỏ khỏi hosting, trang có thể không hydrate.

CORE_SHELL_ASSETS chỉ chứa 5 tài nguyên, không chứa CSS, JS hydrate và font cần cho trải nghiệm. Worker đăng ký sau load nên các tài nguyên tải trước khi worker kiểm soát trang không được runtime-cache ở lần truy cập đầu. Probe đối chiếu HTML build xác nhận CSS/HavenShell/client renderer đều không nằm trong precache. Chưa tái hiện offline bằng network emulation của trình duyệt thật.

Cần manifest precache sinh từ build, version theo release, chiến lược cập nhật HTML và cache bounded. Kiểm tra cài mới → offline và nâng cấp giữa hai build. Xem [vòng đời/cập nhật service worker trên MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

### R13 — P2 — Ngôn ngữ chọn ở Gate không truyền sang Shell

Vị trí: [HavenShell.svelte:245](D:/LandingPage/havenart.space/src/components/HavenShell.svelte:245), [HavenShell.svelte:618](D:/LandingPage/havenart.space/src/components/HavenShell.svelte:618), [i18n/store.ts:85](D:/LandingPage/havenart.space/src/lib/i18n/store.ts:85).

Gate có callback onLanguageChange nhưng Shell không truyền callback. Event lưu preference gửi detail là chuỗi `lang`; listener Shell lại đọc `detail.lang`. Đã chọn English ở Gate, thấy subtitle tiếng Anh, vào Haven thấy dock/form tiếng Việt trong khi document.lang là en.

Thống nhất payload event hoặc dùng state/store ngôn ngữ chung, truyền callback đầy đủ vào Gate. Thêm test chọn ngôn ngữ ở Gate → vào Shell → mở form; kiểm tra reload và các label trợ năng.

### R14 — P2 — Hreflang tiếng Anh trỏ tới URL không thực thi ngôn ngữ

Vị trí: [SEO.astro:114](D:/LandingPage/havenart.space/src/components/SEO.astro:114), [index.astro:7](D:/LandingPage/havenart.space/src/pages/index.astro:7), [i18n/store.ts:39](D:/LandingPage/havenart.space/src/lib/i18n/store.ts:39).

SEO khai báo `/?lang=en`, nhưng page không đọc query và language detector chỉ đọc storage/navigator. HTTP `/` và `/?lang=en` trả HTML giống hệt; metadata/lang SSR là tiếng Việt. Tag tồn tại chưa chứng minh một trang English có thể truy cập theo URL đó. OG còn khai báo ảnh 1200×630 trong khi file dùng thực tế là 1280×864.

Tạo URL ngôn ngữ có nội dung/meta phù hợp hoặc bỏ alternate chưa được triển khai. Chuẩn hóa canonical cho từng route và tạo OG image đúng kích thước. [Google hướng dẫn hreflang cho các phiên bản ngôn ngữ thực tế](https://developers.google.com/search/docs/specialty/international/localized-versions).

### R15 — P2 — Modal chưa quản lý keyboard focus

Vị trí: [HavenShell.svelte:795](D:/LandingPage/havenart.space/src/components/HavenShell.svelte:795), [UserAuthModal.svelte:165](D:/LandingPage/havenart.space/src/components/UserAuthModal.svelte:165), [ShareModal.svelte:104](D:/LandingPage/havenart.space/src/components/ShareModal.svelte:104).

Có role dialog/aria-modal nhưng không có move focus, trap Tab, inert nền hoặc restore focus thống nhất. Trong browser, sau mở bảng viết, activeElement vẫn là nút mở nằm phía sau modal; các nút nền còn trong accessibility tree. Điều này gây khó điều hướng bàn phím và không khớp ngữ nghĩa modal.

Dùng primitive dialog có quản lý focus hoặc triển khai đầy đủ cùng xử lý modal lồng nhau. Escape chỉ nên đóng lớp trên cùng. Yêu cầu tương tác được mô tả trong [WAI-ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### R16 — P2 — Feedback khách trả 500 nhưng UI báo đã gửi

Vị trí: [FeedbackModal.svelte:52](D:/LandingPage/havenart.space/src/components/FeedbackModal.svelte:52), [db.ts:1370](D:/LandingPage/havenart.space/src/lib/server/db.ts:1370), [api/feedback.ts:21](D:/LandingPage/havenart.space/src/pages/api/feedback.ts:21).

Modal gửi userName null khi guest; server gọi `input.userName.trim()`. Đã xác nhận request guest trả HTTP 500 với lỗi đọc trim của null. Modal không kiểm tra response.ok và luôn đặt isSubmitted=true nên feedback mất trên server dù thông báo cảm ơn xuất hiện.

Normalize payload bằng schema runtime và default guest name. Chỉ báo gửi thành công khi API xác nhận; có trạng thái lưu cục bộ/chờ gửi nếu cần. Identity feedback và analytics hiện cũng nhận userId từ body chưa xác minh; nên lấy identity từ session server khi có.

### R17 — P2 — Kiểm tra Pexels key dùng sai contract

Vị trí: [AdminDashboard.svelte:303](D:/LandingPage/havenart.space/src/components/admin/AdminDashboard.svelte:303), [pexels-api.ts:194](D:/LandingPage/havenart.space/src/lib/visuals/pexels-api.ts:194).

Hàm trả `{ success, message, photographer }` nhưng caller kiểm tra `res.valid`, `res.error`, `res.samplePhotographer`. Với key hợp lệ và HTTP 200, UI vẫn vào nhánh báo invalid vì res.valid là undefined. Đây là lỗi type đáng lẽ công cụ kiểm tra Svelte phải bắt.

Thống nhất type response cho provider và caller; thêm integration test UI với response thành công/thất bại đã mock, không cần dùng key thật.

### R18 — P2 — “Cấu hình” photo API trong admin chỉ có tác dụng trên máy admin

Vị trí: [AdminDashboard.svelte:325](D:/LandingPage/havenart.space/src/components/admin/AdminDashboard.svelte:325), [pexels-api.ts:20](D:/LandingPage/havenart.space/src/lib/visuals/pexels-api.ts:20), [unsplash-api.ts:18](D:/LandingPage/havenart.space/src/lib/visuals/unsplash-api.ts:18).

Nút save key ghi localStorage và phát event trên cùng window. Không có API lưu settings tương ứng cho visitor; browser khác không nhận cấu hình. Các biến PUBLIC/VITE key được đọc trong client cũng đưa key vào bundle nếu cấu hình khi build.

Nếu đây là cấu hình toàn website, lưu ở server và dùng proxy có cache/rate limit; visitor nhận ảnh, không cần biết key. Nếu cố ý là key riêng từng người, đổi UI để mô tả đúng phạm vi. Event giữa hai trang/tab cũng cần cơ chế truyền phù hợp.

### R19 — P2 — Mỗi heartbeat ghi lại toàn bộ CSDL bằng I/O đồng bộ

Vị trí: [db.ts:480](D:/LandingPage/havenart.space/src/lib/server/db.ts:480), [db.ts:1494](D:/LandingPage/havenart.space/src/lib/server/db.ts:1494), [user-analytics.ts:146](D:/LandingPage/havenart.space/src/lib/telemetry/user-analytics.ts:146).

Mỗi session heartbeat, login, feedback, sync và nhiều thao tác khác gọi syncToJsonBackup. Hàm SELECT toàn bộ users/entries/feedbacks/sessions, stringify và writeFileSync. Chi phí tăng theo toàn bộ CSDL trên từng request; I/O này chặn event loop Node. Client heartbeat khoảng 30 giây tạo tải liên tục ngay cả khi người dùng chỉ xem nền.

Tách backup khỏi request bằng snapshot định kỳ/SQLite backup, giới hạn retention telemetry và paginate API admin. Benchmark trước xác định ngưỡng tải; chưa có số đo tải thực tế để kết luận mức throughput cụ thể.

### R20 — P2 — Quality gate bỏ sót component type và các luồng rủi ro

Vị trí: [package.json:12](D:/LandingPage/havenart.space/package.json:12), [ci.yml](D:/LandingPage/havenart.space/.github/workflows/ci.yml), [privacy-and-leak.spec.ts:44](D:/LandingPage/havenart.space/tests/adversarial/privacy-and-leak.spec.ts:44), [server-db.spec.ts:283](D:/LandingPage/havenart.space/tests/server/server-db.spec.ts:283).

`tsc` không kiểm tra Astro/Svelte; thiếu astro check/svelte-check trong scripts. Build transpile thành công không xác nhận type an toàn. Test privacy chỉ gọi repository/vault riêng, không đi qua WritePanel đã login nên không thấy plaintext cloud sync. Test restore import lại vào CSDL đã có dữ liệu và chỉ kiểm tra success/users; không phát hiện thiếu feedback/sessions. Test SEO có nhánh bỏ qua assertion khi dist chưa tồn tại, trong khi CI test/build chạy job riêng. CI hiện thất bại do test theme-color source đã lỗi thời.

Thêm checker đúng framework và test ở cấp luồng: token malformed, logout/revoke, account switch, offline delete, draft close, restore sang CSDL rỗng, API guest feedback, English URL và modal focus. Test network cần mock rõ ràng: lần chạy hiện tại có ECONNREFUSED localhost:3000 và các abort từ happy-dom. [Astro giải thích khác biệt build và type checking](https://docs.astro.build/en/guides/typescript/#type-checking).

### R21 — P2 — Dependency đang nằm trong dải có security advisory

Vị trí: [package.json:19](D:/LandingPage/havenart.space/package.json:19), [package-lock.json](D:/LandingPage/havenart.space/package-lock.json).

Audit ngày review báo 8 package: Astro (critical), @astrojs/node/Sharp/Vite (high), Ajv (moderate), @astrojs/svelte/@astrojs/tailwind/esbuild (low). Đây là phân loại của audit theo dải phiên bản, không phải 8 đường khai thác đã tái hiện trên dự án.

[Advisory Astro AVIF](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2) đòi hỏi xử lý ảnh AVIF không tin cậy; chưa thấy input từ attacker đi qua optimizer trong các luồng được kiểm tra. [Advisory Host header Node adapter](https://github.com/withastro/astro/security/advisories/GHSA-qh8j-hqjv-7m4x) phân biệt standalone mặc định với staticHeaders; cấu hình hiện dùng standalone mặc định, nên không nên diễn giải nó là crash process chắc chắn. Ajv advisory được báo phụ thuộc option $data, hiện không được bật trong validator backup.

Lập kế hoạch nâng bộ Astro/adapter/integration tương thích, nâng Vite theo bản vá phù hợp, chạy lại test/build và kiểm tra runtime/native SQLite. Không dùng audit fix --force tự động vì đề xuất có thay đổi major và có thể đổi integration không phù hợp.

### R22 — P2 — Audio báo playing kể cả khi playback thất bại

Vị trí: [audio/engine.ts:327](D:/LandingPage/havenart.space/src/lib/audio/engine.ts:327), [audio/engine.ts:337](D:/LandingPage/havenart.space/src/lib/audio/engine.ts:337).

`audio.play()` bị catch và bỏ qua; sau đó engine vẫn đặt isPlayingState=true và Media Session=playing. Probe dùng Audio có play trả Promise.reject xác nhận engine báo playing dù không phát. Luồng crossfade cũng bỏ qua lỗi tương tự và có thể tắt bản đang phát để chuyển sang bản không phát được.

Chỉ cập nhật trạng thái sau khi playback thành công, báo lỗi phù hợp hoặc chọn track fallback; giữ bản cũ nếu bản mới không bắt đầu được. Thêm test missing asset, network error và autoplay rejection.

### R23 — P2 — Hướng dẫn release và lệnh start không khớp kiến trúc hiện tại

Vị trí: [package.json:8](D:/LandingPage/havenart.space/package.json:8), [astro.config.mjs:10](D:/LandingPage/havenart.space/astro.config.mjs:10), [verification-report.md](D:/LandingPage/havenart.space/docs/release/verification-report.md), [release-status.md](D:/LandingPage/havenart.space/docs/status/release-status.md).

`npm start` chạy astro dev. Tài liệu release vẫn mô tả site hoàn toàn static, không account/sync/telemetry, 160/160 test và zero P0/P1. Commit hiện có Node APIs/SQLite, 311 test với 1 lỗi và các lỗi kể trên. Upload riêng dist/client lên hosting static khiến API account/sync/admin không chạy.

Cập nhật start production cho entry Node, tài liệu môi trường/credential bootstrap, volume dữ liệu SQLite, backup/restore, reverse proxy và rollback. Chỉ ký release lại sau khi kiểm chứng bản hiện tại; không dùng sign-off của commit cũ làm chứng nhận hiện trạng.

### R24 — P2 — WebGL fallback phát callback mode sai, có thể làm nền trống

Vị trí: [visuals/controller.ts:259](D:/LandingPage/havenart.space/src/lib/visuals/controller.ts:259), [visuals/controller.ts:265](D:/LandingPage/havenart.space/src/lib/visuals/controller.ts:265), [HavenShell.svelte:146](D:/LandingPage/havenart.space/src/components/HavenShell.svelte:146).

`setMode('shader')` gọi init khi chưa có gl. Nếu init thất bại, fallbackToStatic đổi mode/callback sang static, nhưng setMode tiếp tục phát onModeChange('shader') vô điều kiện. Probe ép getContext trả null: controller thực tế ở static, callback cuối cùng là shader. Shell dùng callback này để quyết định opacity nên có thể ẩn ảnh static và hiển thị canvas không render.

Phát callback theo mode thực tế sau init, hoặc để init/fallback quản lý trạng thái duy nhất. Thêm integration test controller → shell khi WebGL context/compile thất bại, thay vì chỉ kiểm tra state bên trong controller.

## Đánh giá UI, hiệu năng và khả năng bảo trì

Giao diện có hướng thị giác nhất quán: nền toàn màn hình, font serif cho tiêu đề, dock và panel trong suốt. Luồng vào Haven, mở/đóng bảng viết, chọn ngôn ngữ và điều khiển audio đã chạy trên build local; mobile 375px không tràn ngang trong các view thử.

Các vấn đề UX cần ưu tiên là tính trung thực của thông điệp riêng tư, giữ nội dung khi đóng panel, báo lỗi sync/feedback và điều hướng bàn phím. Mobile có các control nhỏ và độ tương phản phụ thuộc ảnh nền; token màu có test không đảm bảo mọi lớp glass trên ảnh đạt contrast. Cần đo contrast theo nền thực tế và kiểm tra keyboard/screen reader thay vì kết luận WCAG AA chỉ từ token. Chưa có số đo contrast đầy đủ trong lần review này.

Build báo HavenShell 171.90 KB (52.28 KB gzip), chunk dùng chung user-analytics 242.12 KB (74.48 KB gzip), renderer 13.15 KB gzip, client 0.63 KB gzip. Nhóm JS cho trang chính khoảng 140.5 KB gzip trước CSS/font. Đây chưa phải một kết luận tải chậm, nhưng vượt mô tả dưới 75 KB trong report cũ. Toàn bộ audio khoảng 86.75 MB dạng thập phân; worker có chủ ý không precache MP3. Font vừa tự host TTF vừa tải Google Fonts trong head: có thể loại tải trùng, cân nhắc WOFF2 và lazy-load các modal/thư viện sau khi xử lý lỗi chức năng.

AdminDashboard có 3.520 dòng, db.ts 1.696 dòng, HavenShell 862 dòng. Admin gộp auth, quản lý user, nhật ký, media, settings, telemetry và maintenance; db.ts gộp schema, migration, auth, domain CRUD, thống kê và backup. Nên tách các boundary này cùng contract rõ ràng để tránh tái diễn lỗi password client/server, Pexels response và backup table thiếu. Việc refactor nên đi sau các bản sửa rủi ro cao và test hành vi tương ứng.

## Thứ tự xử lý đề xuất

1. **Khóa đường xác thực:** sửa R01, loại root credential công khai, thống nhất server auth/password/session; xác nhận các API quản trị từ chối token không hợp lệ.
2. **Bảo vệ dữ liệu:** sửa cách ly tài khoản, quyết định mô hình mã hóa/thông điệp riêng tư, đồng bộ tombstone, flush draft, restore đầy đủ; viết test tái hiện trước khi sửa.
3. **Chuẩn bị phát hành:** xác nhận quyền media, sửa cập nhật PWA, nâng dependency có kế hoạch, đồng bộ tài liệu/start với Node + persistent SQLite.
4. **Ổn định trải nghiệm:** sửa lỗi i18n/SEO, feedback, modal focus, Pexels settings/contract, audio và WebGL; tối ưu snapshot/bundle sau khi có số đo.

Điều kiện review lại: regression test cho R01–R12, toàn bộ checker/test/build qua, backup round-trip sang CSDL rỗng, test hai tài khoản/hai thiết bị, và kiểm tra install/upgrade/offline PWA trên browser thật. Kết quả test xanh cần đi kèm bằng chứng ở các boundary này.

## Tệp chứng cứ thử nghiệm

Các probe riêng nằm trong đường dẫn đang được gitignore, không phải code sản phẩm:

- [probe.ts](D:/LandingPage/havenart.space/tests/reports/review/probe.ts): xác thực, thu hồi token, đồng bộ/xóa/cách ly tài khoản.
- [backup-probe.ts](D:/LandingPage/havenart.space/tests/reports/review/backup-probe.ts): phục hồi feedback/session sang CSDL mới.
- [media-pwa-probe.mjs](D:/LandingPage/havenart.space/tests/reports/review/media-pwa-probe.mjs): cache-first, precache, audio error, WebGL callback và đối chiếu ledger.

Các file SQLite/JSON trong thư mục thử có dữ liệu tổng hợp. Probe có side effect vào các CSDL thử này; khi chạy lại cần dùng đường dẫn thử mới để không bị ảnh hưởng bởi lần chạy trước.
