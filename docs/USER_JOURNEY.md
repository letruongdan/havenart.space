# HAVENART — Hành trình người dùng

Trạng thái: đề xuất cho Phase 1, chưa được kiểm thử với người dùng hoặc triển khai.
Nguyên tắc: mọi đường đi đều giữ quyền đọc nội dung và đến liên hệ; 3D là lớp bổ sung.
Tham chiếu: [PROJECT_VISION.md](PROJECT_VISION.md), [UX_STORYBOARD.md](UX_STORYBOARD.md), [ACCESSIBILITY_SPEC.md](ACCESSIBILITY_SPEC.md).

## 1. Nhu cầu và điểm kết thúc

Hành trình chính: tìm hiểu HavenArt → nhận ra cách thiết kế phù hợp → chọn một kênh để trao đổi nhu cầu.
Hành trình nhanh: mở trang → xem định vị/dịch vụ → đến liên hệ mà không cần khởi động 3D.
Hành trình đọc sâu: xem câu chuyện phòng → mở chi tiết kiến trúc → quay lại đúng chỗ → liên hệ khi sẵn sàng.
Hành trình hỗ trợ tiếp cận: đọc cùng nội dung bằng HTML tĩnh, bàn phím hoặc trình đọc màn hình.
Điểm kết thúc trong phạm vi website là tới vùng liên hệ hoặc mở một kênh đã xác minh.
Chưa thể biết cuộc trao đổi có diễn ra trong Zalo/Messenger/WhatsApp; không tự gắn nhãn “lead thành công”.

## 2. Luồng mặc định từ lần truy cập đầu

| Bước | Người xem nhận được | Hành động khả dụng | Phản hồi cần có |
| --- | --- | --- | --- |
| Mở /vi hoặc /en | Hero, poster, định vị và định hướng dịch vụ trong HTML | Đọc, cuộn, đổi ngôn ngữ, đến liên hệ | Nội dung hiện trước canvas |
| Bắt đầu khám phá | Gợi ý cuộn ngắn và tùy chọn nội dung tĩnh | Cuộn tự nhiên hoặc dùng liên kết chương | Không khóa trang vì tải asset |
| Đi qua exterior/approach | Hiểu quan hệ cảnh quan và ngưỡng cửa | Tiến/lùi tùy ý | Camera liên tục nếu đã sẵn sàng |
| Vào entrance/living | Hiểu sự chuyển tiếp, ánh sáng và sinh hoạt | Đọc câu chuyện hoặc mở hotspot | Tiêu đề và chi tiết có bản DOM |
| Mở chi tiết | Tên, nhóm và lý do lựa chọn | Đọc, đóng, đến liên hệ | Focus vào panel, giữ vị trí hành trình |
| Ra garden/finale | Nhìn lại quan hệ nhà–vườn và nhu cầu riêng | Đến liên hệ hoặc quay về chương | Không có popup chặn cảnh |
| Chọn kênh | Zalo, Messenger, WhatsApp có nhãn rõ | Mở kênh hợp lệ | Trạng thái được giải thích nếu chưa cấu hình |

Không tự dịch chuyển người xem về đầu khi 3D vừa tải xong.
Nếu người xem đã cuộn xa khi 3D tải xong, giữ bản tĩnh tại vị trí đang đọc và cung cấp lựa chọn chủ động bắt đầu 3D từ đầu; không tự khởi tạo camera ở giữa hành trình.
Nếu vị trí đang ở liên hệ, tiếp tục giữ vùng liên hệ; không kéo người xem vào hành trình.
Không chặn cuộn để ép chờ từng chương hoặc ép người xem đọc trước khi tiếp tục.

## 3. Mạch nội dung Phase 1

| ID ổn định | Khoảng tiến độ đề xuất | Câu hỏi được trả lời | Điểm chú ý |
| --- | --- | --- | --- |
| exterior | [0,.15) | HavenArt bắt đầu một ngôi nhà từ đâu? | Nhu cầu sống, khối nhà và cây |
| approach | [.15,.27) | Vì sao lối đến nhà quan trọng? | Bóng râm, khuôn nhìn, nhịp di chuyển |
| entrance | [.27,.39) | Ngưỡng cửa thay đổi cảm giác thế nào? | Từ ngoài vào trong, từ mở đến riêng tư |
| living | [.39,.68) | Ánh sáng và vật liệu nâng đỡ sinh hoạt ra sao? | Cửa kính, đá ấm, không gian gặp gỡ |
| garden | [.68,.87) | Thiên nhiên có vai trò gì trong cuộc sống ở nhà? | Cây, bóng mát, góc ngồi và ánh sáng trong nhà |
| finale | [.87,1] | Tôi có thể bắt đầu câu chuyện nhà mình thế nào? | Lời mời trao đổi và ba kênh liên hệ |

Ranh giới thuộc chương sau, riêng tiến độ 1 thuộc finale; không có khoảng trống hoặc hai chương cùng active.
Phase 2 thêm kitchen, courtyard, bedroom, bathroom, workspace, balcony giữa living và garden.
Việc thêm chương phải tính lại timeline từ cấu hình; không đổi ý nghĩa các ID đã dùng cho nội dung và đo lường.

## 4. Người xem có ý định liên hệ ngay

Shortcut liên hệ có mặt từ header và hero; vùng cuối nhắc lại cùng nhãn CTA chính.
CTA là liên kết tới vùng liên hệ HTML trong locale hiện tại, không chờ một animation hoàn thành.
Điều hướng tới liên hệ bằng anchor; reduced-motion dùng cuộn tức thời, không có chuyến bay camera dài.
Khi có JavaScript, focus tiêu đề liên hệ sau thao tác chủ động để bàn phím tiếp tục đúng chỗ.
Không có JavaScript, anchor vẫn đến vùng có tiêu đề và liên kết kênh thật.
Nếu đang mở panel chi tiết, CTA đóng panel trước rồi mới chuyển focus tới liên hệ.
Vùng liên hệ nói người xem có thể trao đổi loại nhà, địa điểm dự kiến và nhu cầu sinh hoạt, không bắt buộc nhập.
Không yêu cầu ngân sách, số điện thoại hoặc dữ liệu nhạy cảm để xem thông tin.

## 5. Trạng thái tải và lỗi

| Trạng thái | Nội dung hiện | Cách phục hồi |
| --- | --- | --- |
| HTML sẵn sàng, 3D chưa tải | Toàn bộ trang tĩnh, poster và CTA | Có thể đọc/đến liên hệ ngay |
| Đang tải asset | Trạng thái ngắn trong vùng dành sẵn | Chỉ hiện phần trăm khi đo được tổng tải đáng tin cậy |
| 3D sẵn sàng | Ở hero thì chuyển nhẹ sang góc mở đầu; đã cuộn xa thì giữ static | Không đổi focus hoặc vị trí đọc; bắt đầu lại chỉ khi người xem chọn |
| Thiếu WebGL/lỗi lặp lại | Trang tĩnh hoàn chỉnh và lời giải thích ngắn | “Tiếp tục xem nội dung” luôn hoạt động |
| Một asset trang trí lỗi | Không gian giản lược hoặc poster của chương | Không làm mất dịch vụ, chi tiết hoặc liên hệ |
| Âm thanh lỗi | Trải nghiệm hình ảnh và nội dung vẫn đầy đủ | Tắt điều khiển có giải thích, không lặp cảnh báo |

Không dùng màn hình đen, loader toàn trang hoặc nút “Thử lại” làm lối đi duy nhất.
Chuyển fallback giữ chapter anchor gần nhất và focus hợp lý; không khởi động lại toàn bộ trang.
Retry nếu có là chủ động, hữu hạn và không tự chuyển người đã chọn chế độ tĩnh về 3D.

## 6. Chế độ tĩnh, bàn phím và thiết bị nhỏ

Với prefers-reduced-motion, không import hoặc khởi tạo module WebGL; âm thanh giữ tắt.
Nội dung tĩnh có thương hiệu, dịch vụ, câu chuyện từng chương Phase 1, ít nhất ba chi tiết và vùng liên hệ.
Thứ tự tab đi theo thứ tự đọc, không đi qua từng đối tượng 3D vô nghĩa.
Các liên kết “Bỏ qua đến nội dung” và “Đến phần liên hệ” xuất hiện khi focus ngay đầu trang.
PageDown, PageUp, Space, Home, End và thao tác cảm ứng giữ hành vi cuộn quen thuộc khi không mở modal.
Ở màn hình nhỏ, giảm mật độ dấu chấm hotspot; danh sách chi tiết DOM vẫn đầy đủ.
Panel không che nút đóng hoặc vùng điều khiển trình duyệt; không yêu cầu cử chỉ kéo chính xác.

## 7. Ngôn ngữ và quay lại hành trình

VI là mặc định; mỗi locale có URL và HTML hoàn chỉnh riêng tại /vi và /en.
Khi đổi ngôn ngữ trong chế độ nâng cao, lưu ID chương + tiến độ cục bộ của trạng thái đang hiển thị.
Sau đổi locale, chờ layout mới ổn định rồi khôi phục cùng điểm ý nghĩa; không dùng lại pixel cuộn tuyệt đối.
Nếu modal đang mở, đóng modal, giữ chương và trả focus tới điều khiển đổi ngôn ngữ tại trang mới.
Trong chế độ tĩnh, liên kết locale giữ anchor chương nếu có; nếu không có, mở đầu trang có nội dung đầy đủ.
Các trạng thái tải, lỗi và chưa cấu hình được dịch cùng nội dung chính.

## 8. Liên hệ chưa cấu hình và đo lường

Trong preview, hiện đủ Zalo/Messenger/WhatsApp nhưng đánh dấu “Chưa cấu hình” và không tạo href giả.
Vùng liên hệ vẫn nhận CTA và focus; nội dung không nói “Đã gửi” hoặc “Sắp kết nối” khi chưa thể liên lạc.
Production bị chặn cho tới khi ba kênh được cung cấp, xác minh hoặc có thay đổi phạm vi được duyệt rõ ràng.
Chỉ ghi sự kiện kênh khi người xem kích hoạt liên kết hợp lệ; nhãn unavailable không tính là conversion.
Sự kiện đề xuất: experience_started, chapter_entered, hotspot_opened, language_changed, cta_clicked và các kênh.
Không ghi nội dung chat, số điện thoại, vị trí cụ thể hoặc văn bản tự do của người xem vào sự kiện.

## 9. Kịch bản xác nhận thiết kế

Thử với người có nhu cầu xây/cải tạo nhà: yêu cầu họ mô tả dịch vụ, tìm chi tiết ánh sáng và tìm liên hệ.
Chạy cùng nhiệm vụ bằng desktop, điện thoại, bàn phím và chế độ reduced-motion; ghi điểm khó hiểu và ngõ cụt.
Kiểm tra mạng chậm, lỗi WebGL, cuộn lùi và đổi locale giữa living; CTA phải còn dùng được trong mọi trường hợp.
Chưa có kết quả usability: ghi quan sát thực tế trước khi đặt mục tiêu thời gian hoặc tỷ lệ hoàn thành.
