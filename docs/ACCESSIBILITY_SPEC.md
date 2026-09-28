# HAVENART — Khả năng tiếp cận

Trạng thái: mục tiêu và kế hoạch kiểm chứng, chưa có tuyên bố đạt chuẩn.
Mục tiêu đề xuất: WCAG 2.2 mức AA cho giao diện và nội dung được triển khai; cần kiểm tra tự động lẫn thủ công.
Tham khảo: [W3C WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/) và [W3C APG Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), truy cập 27/09/2026.
Các lựa chọn riêng cho HavenArt dưới đây bổ sung vào chuẩn; không coi thư viện hoặc điểm số tự động là chứng nhận.

## 1. Hợp đồng nội dung nền

HTML được dựng lúc build cho /vi và /en, gồm thương hiệu, định vị, dịch vụ, câu chuyện phòng, chi tiết và liên hệ.
Không để nội dung kinh doanh quan trọng chỉ xuất hiện trong canvas, hình có chữ hoặc âm thanh.
Tắt JavaScript vẫn đọc đủ Phase 1, dùng details/summary gốc nếu có và đến vùng liên hệ được.
Thứ tự DOM theo hành trình: hero → dịch vụ/triết lý → các chương → liên hệ → footer.
Một h1 mô tả trang; h2 cho các chương và liên hệ; h3 cho chi tiết khi cần, không chọn heading theo cỡ chữ.
Dùng landmark header, nav có tên, main và footer rõ ràng; tránh nhiều vùng không có nhãn.
Canvas không được đưa mesh vào thứ tự tab; nếu thông tin đã được diễn đạt tương đương trong DOM, ẩn canvas khỏi cây hỗ trợ.
Ảnh poster có alt ngắn khi truyền tải bố cục; alt rỗng nếu ảnh chỉ trang trí và mô tả đã trùng ngay bên cạnh.
Không thêm aria-label làm thay đổi ý nghĩa so với nhãn nhìn thấy của nút.

## 2. Chuyển động và âm thanh

Đọc prefers-reduced-motion trước khi tải lớp cảnh; khi reduce, không import hoặc khởi tạo WebGL. Audio không tải/khởi tạo trước opt-in; nếu người dùng chủ động bật trong bản tĩnh, chỉ tải module audio độc lập.
Chế độ này dùng section và ảnh tĩnh đầy đủ; không có rail dài, parallax hoặc animation môi trường tự chạy.
Không nhập sớm module Three/R3F/GSAP ở đường dẫn cần thiết cho trang tĩnh; xác nhận qua network và runtime.
Nút “Xem nội dung tĩnh” có sẵn từ đầu trong bản nâng cao, giữ người xem ở chương có ý nghĩa khi chuyển chế độ.
Nếu hệ điều hành đổi sang reduce khi đang chạy, dừng animation/audio, giải phóng cảnh và chuyển về nội dung tĩnh.
Không tự bật lại 3D hoặc âm thanh khi hệ điều hành đổi về no-preference; cần thao tác chủ động để vào lại.
Chỉ cho phép vào lại 3D bằng thao tác chủ động khi no-preference; khi reduce còn hiệu lực, giữ toàn bộ đường đi tĩnh.
Không dùng chớp sáng, rung, camera roll mạnh hoặc chuyển hướng đột ngột để nhấn nội dung.
Âm thanh tắt mặc định; nút bật/tắt có nhãn trạng thái và không phải điều kiện để hiểu câu chuyện.
Nếu có âm thanh, khi tab bị ẩn thì suspend; khi quay lại chỉ tiếp tục nếu người dùng đã bật trong cùng phiên và chưa tắt. Chuyển sang chế độ tĩnh chủ động hoặc do reduced motion thì tắt tiếng và cần bật lại rõ ràng.
Môi trường chuyển động liên tục cần có cách dừng; lựa chọn nội dung tĩnh đáp ứng đường đi đơn giản này.

## 3. Cuộn và bàn phím

Ưu tiên cuộn gốc, không chiếm wheel/touch để ép tiến độ từng cảnh.
Tab đi theo thứ tự DOM; Shift+Tab đảo ngược hợp lý; không có tabindex dương.
PageUp/PageDown, Space, Home, End hoạt động tự nhiên khi không mở dialog.
Liên kết bỏ qua “Đến nội dung” và “Đến phần liên hệ” hiện rõ khi nhận focus ở đầu trang.
Liên kết chương nếu có dùng anchor ổn định, với scroll margin để tiêu đề không bị header che.
Không di chuyển focus khi chương active đổi do người xem cuộn.
CTA chính luôn tới vùng liên hệ DOM; khi có enhancement, focus tiêu đề vùng sau thao tác chủ động.
Hotspot có nút/đường đọc DOM tương đương; không bắt buộc ngắm và click đúng điểm 3D.
Không chỉ dùng drag hoặc cử chỉ nhiều ngón để thao tác; mọi chức năng có cách bấm thông thường.

## 4. Dialog chi tiết

Theo mẫu APG: dialog có tên, focus vào nội dung khi mở, giữ Tab trong dialog và đóng bằng Escape.
Khi đóng, trả focus về nguồn mở phù hợp; nền ngoài dialog không nhận tương tác khi modal còn mở.
Nút đóng nhìn thấy và luôn dùng được; click backdrop là cách bổ sung, không phải cách duy nhất.
Chỉ cho một dialog mở; chuyển từ room story sang chi tiết không tạo dialog lồng nhau.
Nếu trigger trong cảnh biến mất, trả focus về bản chi tiết DOM hoặc tiêu đề chương tương ứng.
CTA trong dialog đóng modal trước rồi tới liên hệ; không để focus ở phần nền đang inert.
Khi lỗi WebGL xuất hiện lúc đọc, giữ nội dung có thể đọc và chuyển focus hợp lý, không thông báo dồn dập.
Chi tiết thao tác và trường hợp backdrop xem [HOTSPOT_SPEC.md](HOTSPOT_SPEC.md).

## 5. Chữ, tương phản và bố cục

Áp dụng kiểm tra AA: tương phản chữ thông thường tối thiểu 4.5:1, chữ lớn 3:1; thành phần cần nhận biết 3:1.
Kiểm tra reflow ở bề rộng tương đương 320 CSS px, phóng chữ 200% và nội dung khi zoom 400%.
Không dựa riêng vào màu để biểu thị chương active, lỗi, âm thanh hoặc trạng thái kênh liên hệ.
Quyết định thiết kế đề xuất: vùng chạm ưu tiên ít nhất 44×44 CSS px và khoảng cách dễ chạm trên điện thoại.
Focus ring có tương phản rõ trên nền sáng/tối và không bị header, modal hoặc panel che.
Đặt chữ trên vùng nền ổn định; kiểm tra các mốc sáng nhất/tối nhất của scene, không chỉ screenshot hero.
Không dùng hiệu ứng fade khiến văn bản đang focus biến mất hoặc tương phản giảm trong lúc đọc.
Copy không bị cắt theo số dòng cứng; thử dấu tiếng Việt, chữ EN dài và thay đổi khoảng cách chữ/dòng.
Panel mobile hỗ trợ portrait/landscape và safe area; không khóa hướng thiết bị.
Không giấu CTA sau toolbar trình duyệt hoặc chỉ hiện khi hover.

## 6. Trạng thái và thông báo

Loader không chặn nội dung; thông báo “Đang chuẩn bị trải nghiệm” ngắn, không cập nhật live mỗi frame.
Chỉ dùng phần trăm nếu tiến độ có thể tính thật; không trình bày thời gian giả như phần trăm tải.
Thông báo lỗi cảnh dùng vùng status nhẹ khi cần; không giành focus nếu người xem đang đọc nội dung hợp lệ.
Progress chương có tên dễ hiểu; không đọc liên tục giá trị p hoặc từng biến đổi camera cho screen reader.
Kênh chưa cấu hình hiện tên và chữ “Chưa cấu hình”; không có href giả hoặc biểu tượng đơn độc gây hiểu nhầm.
Preview vẫn đủ ba kênh; launch production bị chặn đến khi các kênh được kiểm chứng hoặc phạm vi được duyệt lại.
Ngôn ngữ HTML đúng vi/en; nhãn điều khiển, thông báo lỗi và tên dialog đều thuộc từ điển.
Trạng thái tĩnh, loading và fallback phải có cùng tiêu đề trang và các vùng điều hướng có ý nghĩa.

## 7. Ma trận kiểm thử thủ công

| Tình huống | Thao tác | Bằng chứng cần lưu |
| --- | --- | --- |
| Chỉ bàn phím | Từ đầu trang, mở ba chi tiết, đóng, đổi locale, đến liên hệ | Thứ tự focus, không mắc kẹt, ảnh focus rõ |
| Trình đọc màn hình | NVDA với trình duyệt Windows; VoiceOver trên thiết bị Apple khi có | Cấu trúc heading, tên điều khiển, thứ tự đọc |
| Reduced-motion từ đầu | Mở trực tiếp /vi và /en khi reduce | Không request module cảnh; không request audio trước opt-in; DOM đầy đủ |
| Đổi tùy chọn lúc chạy | Bật reduce ở giữa living khi đang có cảnh | Cảnh/audio dừng, đọc tiếp đúng chương |
| Không JavaScript | Tải hai locale và mở chi tiết native | Nội dung, anchor và kênh thật vẫn hoạt động |
| WebGL thất bại | Giả lập mất context/lỗi tải và tiếp tục đọc | Fallback đầy đủ, không mất focus/CTA |
| Zoom và màn hình hẹp | 200%, 400%, 320 CSS px, hai hướng điện thoại | Không cắt chữ, không cuộn ngang nội dung chính |
| Dialog | Escape, backdrop, Tab vòng, đóng sau mất trigger | Focus restore và không còn khóa cuộn |

Không ghi “đã kiểm tra VoiceOver” nếu chưa có thiết bị; ghi rõ thiết bị, trình duyệt và phiên bản thực đã dùng.
Kiểm tra thêm bằng người dùng thực nếu có điều kiện, nhất là cảm giác chóng mặt và khả năng đọc trong cảnh tối.

## 8. Kiểm tra tự động và điều kiện chấp nhận

Khi triển khai, thêm smoke test cho vai trò/names, đường CTA, dialog, locale và reduced-motion không khởi tạo cảnh.
Dùng công cụ audit truy cập để phát hiện lỗi semantic/tương phản có thể đo; review thủ công các overlay động.
Không chỉ dựa screenshot: xác nhận network không tải cảnh ở reduce, cây DOM có nội dung và focus thực chuyển đúng.
Lỗi nghiêm trọng: mất nội dung khi tắt JS, CTA không tới được, keyboard trap, auto sound hoặc reduce vẫn bay camera.
Các lỗi nghiêm trọng trên chặn nghiệm thu Phase 1; các vấn đề còn lại có chủ sở hữu và kế hoạch sửa cụ thể.
Đầu vào cần bổ sung: thiết bị kiểm thử thực tế, hỗ trợ trình duyệt mục tiêu và bản copy VI/EN đã duyệt.
Chưa có các đầu vào vẫn có thể review semantic HTML, flow focus và xây kịch bản test theo tài liệu này.
