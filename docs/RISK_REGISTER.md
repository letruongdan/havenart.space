# Sổ đăng ký rủi ro và điều kiện phát hành

Trạng thái: đánh giá lập kế hoạch, chưa có benchmark, tài sản nhập hoặc bản triển khai để chứng minh kết quả.
Phạm vi: Phase 1 gồm exterior → approach → entrance → living → garden → finale.
Chủ trì điều phối: người phụ trách kỹ thuật; chủ thương hiệu duyệt các sự thật kinh doanh và thay đổi phạm vi.

## Cách đọc và cập nhật

- Xác suất: Thấp / Vừa / Cao là đánh giá ban đầu, không phải xác suất thống kê đã đo.
- Tác động: Vừa = giảm chất lượng có đường thay thế; Cao = hỏng hành trình, chuyển đổi hoặc phát hành.
- Owner là vai trò chịu trách nhiệm; phải gán người cụ thể khi bắt đầu triển khai.
- Mỗi risk có trigger quan sát được, giảm thiểu và gate; chưa có bằng chứng thì không đánh dấu đã đóng.
- Rà soát sau mỗi milestone và sau mọi thay đổi camera, asset, hosting hoặc dữ liệu liên hệ.
- Ghi bằng chứng, ngày kiểm tra và quyết định còn mở vào hồ sơ nghiệm thu; tài liệu này không giả báo đã đạt.

## Rủi ro sản phẩm và quyền sử dụng

| ID | Rủi ro / xác suất / tác động | Owner | Trigger | Giảm thiểu / gate |
| --- | --- | --- | --- | --- |
| R01 | Chưa có liên hệ thật / Cao / Cao | Chủ thương hiệu | Còn kênh `null`, link sai người hoặc không mở được | Preview vô hiệu và ghi rõ; production cần đủ Zalo, Messenger, WhatsApp đã xác minh hoặc chấp thuận thay đổi phạm vi |
| R02 | Thông tin doanh nghiệp bịa hoặc suy diễn / Vừa / Cao | Biên tập + chủ thương hiệu | Có địa chỉ, giải thưởng, công trình, số khách hoặc schema không có nguồn | Chỉ dùng nội dung được xác nhận; gate duyệt copy và JSON-LD cả VI/EN |
| R03 | Tài sản thiếu quyền dùng / Vừa / Cao | Phụ trách tài sản | Tệp thiếu nguồn, giấy phép không rõ hoặc điều khoản xung đột | Ưu tiên procedural/CC0; cách ly tệp chưa rõ; gate đủ sổ license và thông báo bắt buộc |
| R04 | Prototype bị hiểu là dự án đã xây / Vừa / Cao | Thiết kế + biên tập | Copy gọi villa minh họa là công trình khách hàng | Ghi đúng tính chất hình minh họa ở nơi cần; không tạo portfolio giả |
| R05 | Click được báo thành lead đủ điều kiện / Vừa / Cao | Chủ sản phẩm | Dashboard cộng click hoặc completed thành qualified lead | Tách tương tác khỏi kết quả kinh doanh; gate định nghĩa chỉ số và taxonomy |
| R06 | Phạm vi sáu chương bị mở rộng quá sớm / Cao / Cao | Kỹ thuật + thiết kế | Thêm phòng Phase 2 trước khi đường đi Phase 1 đạt gate | Khóa vertical slice; chỉ mở rộng khi camera, story, fallback và ngân sách đã ổn định |

## Rủi ro kỹ thuật và trải nghiệm

| ID | Rủi ro / xác suất / tác động | Owner | Trigger | Giảm thiểu / gate |
| --- | --- | --- | --- | --- |
| R07 | Camera xuyên tường hoặc giật khi cuộn lùi / Cao / Cao | Kỹ sư 3D | Va chạm hình học, đổi quaternion đột ngột, look-at bất liên tục | Duyệt rail bằng view debug và các mẫu progress; gate đi tiến/lùi, nhảy vị trí và resize |
| R08 | GPU mobile quá tải / Cao / Cao | Kỹ sư hiệu năng | FPS thấp kéo dài, context lost, nhiệt hoặc tab reload | Tier LOW, DPR thấp, giảm shadow/texture và fallback; gate benchmark thiết bị thật đã nêu cấu hình |
| R09 | Payload chặn nội dung / Cao / Cao | Frontend + tài sản | Hero/CTA chờ GLB hoặc vượt ngân sách asset đã thống nhất | DOM prerender tại build và poster trước, progressive load theo zone; gate waterfall trên mạng bị giới hạn |
| R10 | Rò rỉ GPU/audio/listener / Vừa / Cao | Frontend | Bộ nhớ tăng sau đổi locale, zone hoặc mount lại | Ownership rõ, dispose theo reference, cleanup listener/source; gate vòng lặp điều hướng có quan sát bộ nhớ |
| R11 | Trạng thái camera, light, audio lệch nhau / Vừa / Vừa | Kỹ sư story | Cuộn nhanh/lùi làm state khác tại cùng progress | Chung `renderedStoryProgress`, mapping thuần; gate so sánh cùng điểm từ hai hướng |
| R12 | Chóng mặt hoặc mất truy cập nội dung / Vừa / Cao | UX + frontend | Không có reduced motion đầy đủ, focus bị mất hoặc scroll bị khóa | Native scroll, hành trình tĩnh và DOM thay thế; gate bàn phím, reduced motion và WebGL off |
| R13 | Audio autoplay, tải thừa hoặc phát muộn / Vừa / Vừa | Frontend | Có request trước bật, tiếng khi vào trang hoặc sau khi tắt lúc đang tải | Gesture/resume, request token, suspend tab; gate Network và chuỗi bật/tắt ở mạng chậm |
| R14 | Hotspot bị che hoặc chỉ dùng được bằng chuột / Vừa / Cao | UX + 3D | Sprite ngoài màn, xuyên vật thể, thiếu DOM/focus/Escape | Culling và visibility, control DOM tương đương; gate 3 hotspot cả bàn phím và touch |
| R15 | Một asset lỗi làm trắng cả trang / Vừa / Cao | Frontend | GLB/texture lỗi khiến ErrorBoundary nuốt DOM | Fallback theo asset/zone, giữ HTML dựng sẵn và CTA; gate cố ý chặn request và giả WebGL failure |
| R16 | Hành vi browser khác nhau / Vừa / Cao | QA + frontend | Autoplay, WebGL, viewport mobile hoặc restore scroll khác bản phát triển | Chọn ma trận browser/device thực tế, đo bản build; gate smoke test trên các mục tiêu đã cam kết |

## Rủi ro xuất bản và vận hành

| ID | Rủi ro / xác suất / tác động | Owner | Trigger | Giảm thiểu / gate |
| --- | --- | --- | --- | --- |
| R17 | Canonical/OG trỏ domain giả hoặc preview bị index / Vừa / Cao | Frontend + người triển khai | Origin chưa xác nhận, ảnh 404 hoặc thiếu noindex preview | Origin nullable, metadata theo môi trường; gate kiểm tra HTTP/HTML trên URL deploy thật |
| R18 | SEO chỉ có chữ trong canvas / Vừa / Cao | Frontend + biên tập | HTML response thiếu dịch vụ, câu chuyện hoặc contact | Prerender nội dung đầy đủ theo locale tại build; gate đọc HTML khi tắt JS/WebGL |
| R19 | Song ngữ thiếu hoặc diễn đạt sai / Vừa / Vừa | Biên tập VI/EN | Fallback chuỗi tùy tiện, nhãn a11y hoặc metadata chưa dịch | Dictionary cấu trúc chung và kiểm tra key; gate duyệt ngôn ngữ cả UI lẫn nội dung |
| R20 | Hosting/quota tạo chi phí bất ngờ / Vừa / Cao | Người triển khai | Gói không cho mục đích sử dụng, vượt bandwidth/build quota hoặc tự tính phí | Xác minh điều khoản hiện hành và tắt chi trả tự động nếu có; gate quyết định hosting có ước tính tải |
| R21 | Analytics làm lộ dữ liệu / Vừa / Cao | Frontend + chủ dữ liệu | URL/query, contact text hoặc SDK ngoài allowlist được gửi | Typed allowlist, no-op mặc định, kiểm tra Network/Storage; thu nhận thật cần quyết định riêng |
| R22 | Thay thế asset phá story / Vừa / Cao | Kỹ sư 3D + tài sản | GLB mới đổi origin, scale, bounding box hoặc vị trí cửa | Contract zone, 1 unit = 1 m, proxy validation; gate camera đi xuyên cùng tuyến trước khi merge |

## Bất định về công sức và chi phí

- “0 USD” là ràng buộc không bắt buộc mua asset, font, thư viện hoặc dịch vụ; không phải tổng chi phí vận hành bằng 0.
- Nhân công thiết kế, code, dịch thuật, QA và bảo trì vẫn là công sức thực; chưa có đơn giá để quy tiền.
- Domain, băng thông, lưu trữ, build và hỗ trợ thiết bị phải kiểm tra riêng trước khi cam kết vận hành.
- Chưa có kiểm kê thiết bị hoặc benchmark nên không hứa mọi máy đạt 60 FPS/30 FPS.
- Không coi giới hạn 8 MB/15 MB hoặc draw-call target là kết quả đã đạt trước khi có build đo được.
- Biến số lớn nhất: độ thuyết phục kiến trúc, sửa rail xuyên cửa, tối ưu mobile và xác minh liên hệ/tài sản.
- Lập ước lượng công sức theo khoảng thấp/cơ sở/cao cho mỗi milestone sau thử nghiệm kỹ thuật tối thiểu.
- Tách thời gian chủ động triển khai khỏi thời gian chờ duyệt copy, giấy phép, domain và tài khoản liên hệ.
- Sau vertical slice exterior–living, đo công sức thực rồi cập nhật phần còn lại; không nhân tuyến tính theo số phòng.
- Nếu vượt ngân sách tải hoặc thời gian, giảm fidelity và asset trước khi cắt fallback, a11y hoặc tính đúng liên hệ.

## Các gate tối thiểu

| Gate | Bằng chứng để qua | Ai quyết định |
| --- | --- | --- |
| G0 — Đủ cơ sở triển khai | Phạm vi sáu chương, mặt bằng/rail concept, route VI/EN, state contract, giả định có owner | Phụ trách kỹ thuật + chủ dự án |
| G1 — Chứng minh camera | Qua cửa thật, tiến/lùi và nhảy cuộn liên tục, không xuyên tường hoặc teleport | Kỹ thuật + kiến trúc sư |
| G2 — Câu chuyện đầy đủ | Đến garden/finale, ba hotspot, VI/EN, DOM truy cập được, liên hệ preview và lỗi có fallback | Kỹ thuật + UX |
| G3 — Chạy được trong điều kiện xấu | Payload, draw call, FPS/bộ nhớ có điều kiện đo rõ; mobile, downgrade, reduced motion và recovery | Kỹ sư hiệu năng + QA |
| G4 — Sẵn sàng phát hành | VI/EN, license, origin/OG thật, ba kênh hoặc phạm vi thay đổi đã duyệt, SEO, hosting, runbook và rollback | Chủ thương hiệu + lead + QA |

- Bản preview có contact chưa cấu hình là hợp lệ để review kỹ thuật, chưa đủ điều kiện G4. Tên/mã gate thống nhất với IMPLEMENTATION_PLAN và TASKS.
- Không chuyển risk sang “đã giải quyết” chỉ vì có phương án trên giấy; cần kết quả quan sát được.
- Khi gate không đạt, giữ bản preview có nhãn đúng, ghi hạng mục thiếu và tiếp tục phần việc độc lập.
