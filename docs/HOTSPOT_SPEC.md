# HAVENART — Đặc tả hotspot

Trạng thái: đặc tả đề xuất, chưa có tọa độ mô hình hoặc kết quả kiểm thử.
Hotspot giải thích tư duy kiến trúc; không hiển thị giá, nút mua hoặc thông số sản phẩm không được xác minh.
Phase 1 cần ít nhất ba chi tiết có nội dung hữu ích và cách truy cập tương đương trong HTML.

## 1. Danh mục Phase 1

| ID ổn định | Chương | Nhóm | Tên VI | Tên EN |
| --- | --- | --- | --- | --- |
| travertine-wall | living | material | Tường đá travertine | Travertine wall |
| sliding-glass | living | architecture | Hệ cửa kính trượt | Sliding glass system |
| garden-tree | garden | landscape | Cây trong vườn | Garden tree |

`garden-tree` thuộc vườn Phase 1; không dùng tên `courtyard-tree` khiến phụ thuộc phòng courtyard của Phase 2.
Mỗi chi tiết có tên, nhóm, mô tả ngắn, lý do lựa chọn và một lưu ý thiết kế nếu hữu ích.
Nội dung phải phù hợp geometry hiện có; nếu mô hình chưa thể hiện chi tiết thì chưa bật dấu hotspot của chi tiết đó.
Không dùng nhãn vật liệu thật cho một vật thể mô phỏng không có khả năng đọc được đặc trưng tương ứng.

## 2. Nội dung nháp để biên tập

**travertine-wall — Tường đá travertine**
VI mô tả: “Bề mặt đá sắc ấm tạo chiều sâu cho góc sinh hoạt dưới ánh sáng gián tiếp.”
VI lý do: “Trong concept này, kết cấu vật liệu giữ cho mảng tường có sức gợi mà không cần nhiều đồ trang trí.”
EN description: “Warm stone gives the living space depth under indirect light.”
EN rationale: “In this concept, texture brings character to the wall with little added decoration.”
Lưu ý: lựa chọn đá, hoàn thiện và bảo trì cần kiểm tra theo vị trí sử dụng; chưa nêu thương hiệu hoặc nguồn cung.

**sliding-glass — Hệ cửa kính trượt**
VI mô tả: “Khoảng mở rộng nối chỗ ngồi trong nhà với hiên và khu vườn.”
VI lý do: “Nhịp cửa giúp giữ tầm nhìn ra cây xanh và cho thấy một lối đi trực tiếp giữa trong và ngoài.”
EN description: “A generous opening connects indoor seating with the terrace and garden.”
EN rationale: “The sliding panels frame greenery and reveal a direct route between inside and outside.”
Lưu ý: chi tiết chống nước, an toàn kính và vận hành thuộc bước thiết kế thực tế; không khẳng định hiệu suất chưa đo.

**garden-tree — Cây trong vườn**
VI mô tả: “Tán cây tạo một lớp bóng râm và điểm nhìn từ phòng khách.”
VI lý do: “Cây được đặt để kết nối trải nghiệm trong nhà với khoảng nghỉ ngoài trời trong concept.”
EN description: “The canopy offers shade and a focal point from the living room.”
EN rationale: “Its position connects the indoor experience with an outdoor place to pause in this concept.”
Lưu ý: loài cây, kích thước trưởng thành và khoảng cách tới nhà cần xác nhận; không tự điền tên loài.

## 3. Hợp đồng dữ liệu cần có

Tên trường theo [hợp đồng tích hợp chuẩn](superpowers/specs/2026-09-27-havenart-design.md); không tạo một schema Hotspot thứ hai.

| Trường | Ý nghĩa và kiểm tra |
| --- | --- |
| id | Duy nhất, ổn định giữa locale và chất lượng render |
| room | ID chương tồn tại trong cấu hình story |
| position | Vec3 trong hệ world chung, Y-up, 1 unit = 1 mét; chỉ chốt sau khi duyệt mô hình |
| category | Giá trị nhóm ổn định, nhãn hiển thị qua từ điển |
| copyKey | Khóa nội dung có đủ VI/EN, không chép văn bản vào renderer |
| activationRange | Khoảng trong tiến độ cục bộ của chương, phải nằm trong [0,1] |
| maxDistanceM | Khoảng cách camera tính bằng mét; cấu hình theo kích thước đối tượng |

Binding registry theo hotspot ID giữ tham chiếu DOM/scene ở lớp tích hợp, nằm ngoài interface Hotspot.
`anchorId` nếu asset có điểm gắn mang tên chỉ là metadata của binding runtime; `position` vẫn là tọa độ dữ liệu chuẩn.
`fallbackAnchor` được suy ra nhất quán là `detail-{id}` khi dựng HTML và được binding runtime tìm lại; không thêm trường bắt buộc vào Hotspot.
Đề xuất thử activationRange cục bộ: travertine-wall [.15,.60], sliding-glass [.42,.92], garden-tree [.20,.75].
Các khoảng này chưa được đo; cần chỉnh sau khi camera và bố cục có thể xem thử.
Không hardcode khoảng tiến độ toàn trang cho hotspot; Phase 2 phải chèn chương mà không đổi logic.
Local progress được lấy từ chapter và `renderedStoryProgress` của cùng frame; không dùng raw scroll target để hiện dấu sớm.

## 4. Điều kiện hiện dấu trong cảnh

Dấu hiện khi đúng chương active, nằm trong activationRange, camera đủ gần và anchor ở trong viewport.
Kiểm tra che khuất: không đặt dấu lên mặt trước khi chi tiết đang nằm sau tường hoặc bị vật khác che hoàn toàn.
Đề xuất khoảng an toàn quanh header, CTA và mép màn hình để dấu có vùng chạm đủ rộng.
Ưu tiên dấu gần tâm nhìn nhưng không che điểm chính; khi xung đột, giảm số dấu thay vì chồng chúng.
Đề xuất giới hạn hai dấu đồng thời trên desktop và một trên mobile; danh sách DOM vẫn có đủ ba chi tiết.
Thêm vùng trễ nhỏ khi vào/ra activationRange để tránh nhấp nháy do sai số tiến độ; cần thử bằng cuộn chậm.
Dấu có focus không bị tháo khỏi DOM đột ngột; nếu rời cảnh, chuyển focus có chủ đích tới liên kết chi tiết DOM tương ứng.
Chi tiết đã mở vẫn đọc được đến khi người xem đóng; việc thay đổi chất lượng render không tự đóng nội dung.

## 5. Tương tác và trạng thái

| Trạng thái | Sự kiện | Kết quả |
| --- | --- | --- |
| Sẵn sàng | Hover hoặc focus | Highlight nhẹ và tên ngắn, không tự mở panel |
| Sẵn sàng | Click, Enter hoặc Space trên button | Mở cùng một panel với nội dung đúng ID |
| Panel mở | Escape hoặc nút đóng | Đóng và trả focus về nguồn mở còn khả dụng |
| Panel mở | Click thật trên backdrop | Đóng; click trong panel không đóng |
| Panel mở | CTA liên hệ | Đóng panel rồi chuyển tới vùng liên hệ DOM |
| Mọi trạng thái | Lỗi WebGL/chuyển sang tĩnh | Giữ nội dung trong HTML và focus tại vị trí có ý nghĩa |

Backdrop chỉ nhận đóng khi cả bắt đầu và kết thúc thao tác nằm trên backdrop; tránh đóng khi chọn văn bản kéo ra ngoài.
Không dùng thao tác hover để cung cấp thông tin duy nhất; thiết bị cảm ứng nhận cùng nội dung khi chạm.
Không tự phát âm thanh, không xoay camera về vật thể và không cuộn tới đầu chương khi mở chi tiết.
Nếu một tương tác mới yêu cầu nội dung khác khi panel đang mở, thay nội dung trong cùng panel; không mở modal lồng nhau.

## 6. Panel và focus

Chọn một dialog modal DOM dùng chung: panel bên cạnh trên desktop, panel rộng phù hợp trên mobile.
Dialog có tiêu đề được liên kết với tên truy cập và nút “Đóng chi tiết”/“Close details” dễ tìm.
Khi mở, focus tiêu đề nội dung hoặc nút đóng theo thứ tự đọc; Tab/Shift+Tab được giữ trong dialog.
Khi mở, chụp native scroll position, rawScrollProgress và renderedStoryProgress; khóa cuộn nền và giữ rendered p cho camera/light/hotspot.
Cuộn bên trong dialog không thay đổi raw target hoặc rail; nền ngoài dialog không nhận tương tác.
Khi đóng thông thường, tạm ngừng đọc scroll event, khôi phục native position/raw target đã lưu rồi đặt lại rendered p đúng frame mở.
Không gán rendered p bằng raw target khi phục hồi; xóa delta-time tích lũy và vận tốc cũ trước khi mở khóa, tiếp tục theo speed limit từ pose đang giữ.
Nếu raw đã đi trước rendered lúc mở, khoảng còn lại chỉ được bắt kịp liên tục sau khi đóng; không teleport hoặc tính toàn bộ thời gian mở dialog thành một frame.
Đóng để đến liên hệ hoặc đổi locale dùng luồng điều hướng riêng: hủy restore cũ sau chuyển trang để không kéo ngược CTA/context mới.
Ưu tiên trả focus về đúng button mở; nếu không còn hiển thị, trả về liên kết chi tiết trong chương hoặc tiêu đề chương.
Nút đóng luôn hiển thị khi zoom hoặc trên màn hình nhỏ; panel cuộn nội dung bên trong, không cắt cuối văn bản.
Không mở một room-story dialog phía sau hotspot dialog; câu chuyện phòng dùng nội dung/section có sẵn.

## 7. Tương đương HTML và lỗi

Mỗi chi tiết có phần văn bản semantic trong chương, có thể dùng details/summary gốc để thu gọn bằng thao tác người xem.
Nội dung chi tiết nằm sẵn trong HTML build; tắt JavaScript vẫn đọc/mở được và đến liên hệ được.
Overlay lấy cùng khóa nội dung với bản HTML; không tạo hai bản copy biên tập độc lập.
Canvas được coi là lớp hình ảnh khi có mô tả/câu chuyện tương đương; không ép trình đọc màn hình điều hướng mesh.
Nếu dialog không được nâng cao thành công, liên kết chi tiết dẫn tới fallbackAnchor; không để button chết.
Nếu mất asset, ẩn dấu trong cảnh nhưng giữ bản văn bản và mô tả phù hợp concept trong DOM.

## 8. Xác nhận trước nghiệm thu

Kiểm tra config: ID duy nhất, room tồn tại, copyKey đủ VI/EN, local range hợp lệ và maxDistanceM hữu hạn dương.
Kiểm tra binding riêng: DOM `detail-{id}` có thật; anchor asset nếu được khai báo phải có trong registry, không làm mất bản đọc HTML khi asset lỗi.
Chạy mở/đóng cả ba chi tiết bằng chuột, cảm ứng và bàn phím; kiểm tra Escape, backdrop và focus restore.
Thử modal ở 200%/400% zoom, viewport hẹp, nội dung EN dài và cuộn ngược qua ranh giới chương.
Mở modal khi raw target đang cách xa rendered p, cuộn nội dung rồi đóng: pose frame đầu sau đóng phải giữ liên tục, không phát sinh cú nhảy do restore.
Tắt JavaScript, giả lập WebGL lỗi và reduced-motion: cả ba giải thích vẫn có thể đọc trong HTML.
Thử bấm CTA trong panel: chỉ có một lần điều hướng tới liên hệ, không còn overlay hoặc khóa cuộn tồn dư.
Chỉ ghi hotspot_opened khi một nội dung thực sự mở, với ID/chương/locale; không ghi vị trí con trỏ hoặc dữ liệu cá nhân.
Các test và ngưỡng trong tài liệu là yêu cầu triển khai, chưa phải bằng chứng hệ thống đã hoạt động.
