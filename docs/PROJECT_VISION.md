# HAVENART — Tầm nhìn sản phẩm

Trạng thái: đề xuất kế hoạch ngày 27/09/2026; chưa phải thiết kế được duyệt hoặc sản phẩm đã triển khai.
Nguồn yêu cầu: brief “HAVENART — MASTER BUILD PROMPT”; phạm vi hiện tại chỉ tạo tài liệu.
Các chỉ tiêu trong bộ tài liệu là mục tiêu cần kiểm chứng khi thực hiện, không phải kết quả đã đạt.

## 1. Mục đích và lời hứa

HavenArt giới thiệu tư duy thiết kế nhà ở bằng một hành trình qua một ngôi nhà có cấu trúc không gian hợp lý.
Mục tiêu kinh doanh là giúp chủ nhà hiểu cách tiếp cận và chủ động trao đổi với kiến trúc sư về nhu cầu thật.
Định vị VI theo brief: **Kiến tạo nơi bạn thuộc về.**
Định vị EN theo brief: **Designing the place you belong.**
Trải nghiệm gợi cảm giác bình tĩnh, gần gũi, riêng tư và chất lượng lâu dài.
Mỗi cảnh giải thích một lựa chọn sống hoặc thiết kế; vẻ đẹp thị giác phải phục vụ ý nghĩa đó.
Không đưa số khách hàng, giải thưởng, dự án đã làm, đánh giá hoặc kết quả kinh doanh chưa có bằng chứng.

## 2. Người xem và nhu cầu

| Nhóm nhu cầu | Điều họ muốn hiểu | Nội dung đáp ứng |
| --- | --- | --- |
| Chuẩn bị xây nhà ở hoặc nhà phố | Thiết kế có bắt đầu từ sinh hoạt gia đình không? | Triết lý, lối vào, tổ chức không gian |
| Chuẩn bị biệt thự hoặc nhà vườn | Nhà và thiên nhiên có quan hệ thế nào? | Phòng khách, cửa kính, vườn |
| Cải tạo đáng kể ngôi nhà | Kiến trúc sư có hiểu ánh sáng, riêng tư và công năng? | Câu chuyện phòng, chi tiết vật liệu |
| Người xem nhanh trên điện thoại | Có phù hợp với nhu cầu của mình và liên hệ ở đâu? | Nội dung DOM, dịch vụ, CTA dễ tìm |

Đây là giả thuyết nhóm người dùng từ brief, chưa phải kết quả nghiên cứu khách hàng.
Nội dung nói về chất lượng sử dụng, ánh sáng, thông gió, riêng tư và vật liệu bằng ví dụ cụ thể.
Không mặc định người xem biết thuật ngữ kiến trúc hoặc có thời gian đi hết hành trình.

## 3. Cấu trúc sản phẩm

Lớp nền là trang HTML hoàn chỉnh: thương hiệu, triết lý, dịch vụ, câu chuyện phòng, chi tiết và liên hệ.
Lớp nâng cao là hành trình 3D đồng bộ với cuộn trang gốc, chỉ kích hoạt khi phù hợp với thiết bị và tùy chọn chuyển động.
Nội dung quan trọng không phụ thuộc canvas, âm thanh, đăng nhập hay việc hoàn tất tải mô hình.
Người xem được chọn “Xem nội dung tĩnh” và “Đến phần liên hệ” từ đầu.
Không có yêu cầu bắt buộc xem hết phim, mở hotspot hoặc điền biểu mẫu trước khi liên hệ.
Âm thanh luôn tắt lúc khởi đầu và chỉ được bật bằng thao tác rõ ràng.

## 4. Phạm vi nội dung

| Giai đoạn | Chuỗi chương | Điều kiện |
| --- | --- | --- |
| Phase 1 | exterior → approach → entrance → living → garden → finale | Hoàn chỉnh đường chuyển đổi, ba hotspot, VI/EN và mọi chế độ thay thế |
| Phase 2 | Thêm kitchen → courtyard → bedroom → bathroom → workspace → balcony giữa living và garden | Chỉ mở rộng sau khi nền tảng Phase 1 ổn định |

Phase 1 dùng các khoảng đề xuất: exterior [0,.15), approach [.15,.27), entrance [.27,.39), living [.39,.68), garden [.68,.87), finale [.87,1].
ID chương ổn định; số thứ tự hiển thị hoặc phạm vi tiến độ được phép thay đổi khi thêm phòng.
Không hiển thị phòng Phase 2 như một khu vực đã hoàn thành hoặc một nút hỏng trong bản Phase 1.
Không dựng backend biểu mẫu, CRM, tài khoản người dùng hay danh mục bán nội thất trong Phase 1.
Khả năng thêm biểu mẫu tư vấn chỉ là yêu cầu mở rộng; chưa thu thập dữ liệu cá nhân.

## 5. Hướng kiến trúc và mỹ thuật

Chọn một concept nhà ở **Contemporary Tropical Minimalism**: hình khối rõ, bóng đổ mềm, tỷ lệ tin cậy.
Ngôn ngữ vật liệu gồm gỗ ấm, đá travertine hoặc limestone, vữa có kết cấu, kính trong, vải tự nhiên và cây xanh.
Mô hình phải có cửa đi, khoảng thông tầng nếu có, bề dày tường và quan hệ trong–ngoài hợp lý.
Camera đi qua khoảng mở có thật; không xuyên tường để nối các cảnh không liên quan.
Ánh sáng chuyển nhẹ từ cuối chiều sang hoàng hôn rồi chạng vạng; không biểu diễn tua nhanh thời gian.
Không dùng vàng kim phô trương, neon, UI trò chơi, bloom dày hoặc nhiều lớp kính giao diện.
Chưa có hồ sơ công trình thật: ghi rõ đây là **không gian minh họa ý tưởng thiết kế** ở phần giới thiệu concept.
Không gắn concept với chủ nhà, địa chỉ, năm hoàn thành hoặc ảnh “dự án thực tế” chưa được cung cấp.
Các giải thích thông gió, cách âm hoặc vật liệu là ý đồ thiết kế, không phải chứng nhận hiệu suất.

## 6. Quy tắc biên tập và giao diện

Thiết kế storyboard và sơ đồ không gian trước khi quyết định UI hoặc dựng mô hình chi tiết.
Mỗi cảnh có một ý chính, một tiêu đề ngắn và một đoạn bổ sung; phần đọc sâu nằm trong DOM.
Đề xuất tối đa hai họ chữ miễn phí có đủ dấu tiếng Việt; cần thử trên thiết bị trước khi chọn.
Khoảng trắng và phân cấp chữ tạo cảm giác cao cấp; không dùng nhiều thẻ nổi để thay thế nội dung.
Header ưu tiên logo, ngôn ngữ và liên hệ; điều khiển âm thanh/chuyển động chỉ xuất hiện khi có tác dụng.
CTA sớm nhẹ, CTA cuối rõ ràng; không bật popup thu lead hoặc đếm ngược tạo áp lực.

## 7. Hợp đồng liên hệ và tính trung thực

CTA chính VI: **Liên hệ kiến trúc sư**; EN: **Talk to an Architect**.
CTA chính luôn dẫn tới vùng liên hệ DOM của locale hiện tại, kể cả khi 3D đang tải hoặc thất bại.
Ba kênh yêu cầu theo brief là Zalo, Messenger và WhatsApp; không chọn thay người dùng một kênh mặc định.
Cấu hình chưa có dữ liệu dùng giá trị `null`; placeholder rõ nghĩa chỉ xuất hiện trong tài liệu cấu hình mẫu.
Bản preview hiển thị tên cả ba kênh cùng trạng thái “Chưa cấu hình”; không dùng liên kết giả hoặc nút bấm không phản hồi.
Chặn phát hành production cho đến khi cả ba kênh được cung cấp và kiểm tra, hoặc chủ dự án chấp thuận đổi phạm vi rõ ràng.
Không suy đoán số điện thoại, tên tài khoản, đường dẫn Messenger, địa chỉ studio hoặc thời gian phản hồi.
Không hứa báo giá miễn phí, lịch tư vấn hay vùng phục vụ khi chưa được xác nhận.

## 8. Định nghĩa thành công cần kiểm chứng

- Người mới hiểu HavenArt cung cấp định hướng thiết kế nhà ở và tìm được liên hệ ngay từ trang đầu.
- Người muốn khám phá hiểu ít nhất một ý đồ về ánh sáng, vật liệu hoặc quan hệ với vườn.
- Người dùng bàn phím, công nghệ hỗ trợ và reduced-motion nhận đầy đủ nội dung như người dùng 3D.
- Hành trình tiến/lùi liên tục, có điểm dừng đọc và không gây khó chịu trong thử nghiệm.
- Ba kênh liên hệ thật hoạt động trong kiểm thử trên desktop và điện thoại trước khi phát hành.
- Không có dữ liệu doanh nghiệp giả, asset không rõ giấy phép hoặc phụ thuộc trả phí bắt buộc.

Đo quan tâm bằng sự kiện vô danh như chương đã xem, chi tiết đã mở và lượt chọn liên hệ.
Lượt bấm một kênh chỉ là tín hiệu ý định; không được báo cáo thành lead đủ điều kiện hoặc hợp đồng thành công.
Chưa có baseline: không đặt tỷ lệ chuyển đổi như một cam kết; xác lập mục tiêu sau khi có dữ liệu hợp lệ.

## 9. Đầu vào cần bổ sung và cách tiếp tục

Chủ dự án cần xác nhận phạm vi dịch vụ, ba kênh liên hệ, logo, miền production và nội dung có thể công bố.
Cần người phụ trách kiến trúc duyệt concept, tỷ lệ, lối di chuyển và các mô tả kỹ thuật trước khi gọi là thiết kế cuối.
Nhóm vẫn có thể hoàn tất storyboard, cấu trúc DOM, từ điển song ngữ và mô hình khối mà chưa có các đầu vào này.
Kiểm tra tài liệu cùng [USER_JOURNEY.md](USER_JOURNEY.md), [UX_STORYBOARD.md](UX_STORYBOARD.md) và [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md).
Khi thay đổi phạm vi, cập nhật đồng thời hành trình, chương, tiêu chí nghiệm thu và backlog; tránh giữ các quyết định mâu thuẫn.
