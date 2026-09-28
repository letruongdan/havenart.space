# HAVENART — Storyboard UX trước giao diện

Trạng thái: storyboard đề xuất; chưa có concept kiến trúc, đường camera hoặc copy được duyệt cuối.
Thứ tự thực hiện: sơ đồ nhà → nhịp kể chuyện → thumbnail cảnh → rail thử → khung chữ → UI chi tiết.
Không dựng các cảnh độc lập rồi dùng camera teleport để nối chúng.

## 1. Không gian và quy ước chung

Một nhà minh họa có đường liên tục: sân trước → lối tiếp cận → cửa mở → phòng khách → cửa trượt → hiên/vườn.
Vườn nhìn thấy từ phòng khách là cùng khu vườn camera sẽ đi vào; không đổi địa hình giữa hai cảnh.
Giả định ban đầu là nhà thấp tầng; hình học lối đi và cao độ cần người phụ trách kiến trúc duyệt.
Chưa có công trình xác thực: đề tên “Không gian minh họa ý tưởng thiết kế”, không gắn địa chỉ hoặc chủ nhà.
Mỗi thumbnail phải đánh dấu vị trí camera, hướng nhìn, nguồn sáng, vùng chữ an toàn và cửa đi tiếp.
Vùng chữ an toàn kiểm tra bằng cả bản VI và EN; không đặt lên chi tiết chính của ngôi nhà.
Tiến độ toàn cục p chạy từ 0 đến 1; khoảng bắt đầu có hiệu lực, khoảng kết thúc thuộc chương sau trừ p=1.
Các khoảng và điểm nhấn dưới đây là khuyến nghị để thử, chưa phải thông số khóa.

## 2. Nhịp tổng thể Phase 1

| Chương | Tiến độ | Nhịp camera | Ý chính | Lớp DOM luôn có |
| --- | --- | --- | --- | --- |
| exterior | [0,.15) | Chậm, hướng vào khối nhà qua cây | Bắt đầu từ cách muốn sống | Hero, định vị, giới thiệu dịch vụ |
| approach | [.15,.27) | Tiến rõ hơn, giữ đường chân trời | Trải nghiệm bắt đầu trước cửa | Câu chuyện lối tiếp cận |
| entrance | [.27,.39) | Hạ nhịp khi đi qua khoảng mở | Ngưỡng cửa chuyển cảm xúc | Câu chuyện riêng tư và chuyển tiếp |
| living | [.39,.68) | Chậm nhất, xoay nhẹ về vườn | Kiến trúc nâng đỡ gặp gỡ | Câu chuyện phòng và hai chi tiết |
| garden | [.68,.87) | Đi qua cửa trượt rồi mở tầm nhìn | Trả lại chỗ cho thiên nhiên | Câu chuyện vườn và chi tiết cây |
| finale | [.87,1] | Lùi hoặc nâng nhẹ, ổn định cuối | Ngôi nhà kể câu chuyện chủ nhân | Lời mời trao đổi và ba kênh |

Không dùng độ dài cuộn để giữ người xem lâu; sau bản thử, điều chỉnh để đọc được mà không phải cuộn quá nhiều.
Thời lượng không chạy tự động: người xem dừng cuộn thì hành trình dừng; hiệu ứng môi trường có thể tắt.
Đảo chiều cuộn phải đi lại cùng đường và trạng thái ánh sáng tương ứng.

## 3. Khung 01 — Exterior

Mở bằng khối nhà sau tán lá thưa, nền trời dịu và lối đi có thể nhận ra.
VI: “HavenArt — Kiến tạo nơi bạn thuộc về.”
EN: “HavenArt — Designing the place you belong.”
Copy hỗ trợ đề xuất: “Ngôi nhà bắt đầu từ cách bạn muốn sống.”
Nội dung dịch vụ DOM ngay sau hero giải thích định hướng thiết kế nhà ở theo nhu cầu sinh hoạt; phạm vi cuối cần xác nhận.
CTA “Liên hệ kiến trúc sư” hiện từ đây; gợi ý cuộn chỉ là hỗ trợ, không che CTA.
Poster tĩnh phải dùng cùng hướng kiến trúc; khi WebGL tải, không thay đổi bố cục chữ.
Kết cảnh: camera tiến vào lối tiếp cận, cửa nhà dần trở thành điểm nhìn.

## 4. Khung 02 — Approach

Khung nhìn thu nhẹ giữa mảng cây và tường, dùng bóng đổ để dẫn hướng.
VI: “Kiến trúc bắt đầu trước ngưỡng cửa.”
EN: “Architecture begins before the threshold.”
Ý đồ: lối đến nhà tạo nhịp chậm và chuẩn bị khoảng riêng tư.
Không để cây che đường nhìn đột ngột hoặc camera chạm lá gần gây khó chịu.
Đề xuất không đặt hotspot tại đoạn di chuyển này để tránh phân tán.
Kết cảnh: cửa mở vẫn nhìn được; tỷ lệ cửa đủ để tin rằng camera đi qua thật.

## 5. Khung 03 — Entrance

Camera qua ngưỡng, trần hoặc mái tạo cảm giác nén nhẹ rồi mở ra phòng khách.
VI đề xuất: “Bước vào một nhịp sống khác.”
EN đề xuất: “Step into a calmer rhythm.”
Ý đồ: diễn tả chuyển tiếp ngoài–trong, công cộng–riêng tư qua bố cục và ánh sáng.
Mức sáng thay đổi từ từ; tránh chớp exposure khi camera vượt mặt phẳng cửa.
Không bắt buộc nhấn “mở cửa”; lối đi sẵn sàng để cuộn tiếp.
Kết cảnh: tầm nhìn chạm vườn xuyên qua phòng khách trước khi vào điểm dừng chính.

## 6. Khung 04 — Living

Camera chậm lại, nhìn từ góc phòng qua chỗ ngồi đến hệ cửa và khu vườn.
VI: “Một không gian cho những cuộc gặp gỡ.”
EN: “A space designed for connection.”
Ý đồ: ánh sáng, khoảng cách ngồi và vật liệu tạo sự gần gũi, không trưng bày nội thất như catalog.
Hotspot `travertine-wall` xuất hiện khi mặt đá dễ nhận biết; giải thích sắc ấm và chiều sâu bề mặt.
Hotspot `sliding-glass` xuất hiện khi hệ cửa đọc rõ; giải thích quan hệ giữa phòng và hiên/vườn.
Câu chuyện phòng có ý định, nguyên tắc, vật liệu và ánh sáng trong DOM; người xem có thể bỏ qua panel.
Đề xuất tối đa hai dấu hotspot nhìn thấy cùng lúc trên desktop, một trên mobile; nội dung DOM không bị cắt.
CTA giữa hành trình chỉ là một liên kết nhỏ sau câu chuyện, không phủ sofa hoặc khung vườn.
Kết cảnh: hệ cửa trượt đã có khoảng mở, camera đi ra cùng một vị trí có thể hiểu được.

## 7. Khung 05 — Garden

Từ phòng khách đi qua ngưỡng ra hiên rồi vườn; vật liệu nền và ánh sáng giữ tính liên tục.
VI: “Kiến trúc trả lại chỗ cho thiên nhiên.”
EN: “Architecture gives space back to nature.”
Ý đồ: cây và chỗ ngồi tạo một nhịp sống ngoài trời gắn với căn nhà.
Hotspot `garden-tree` giải thích vai trò che nắng, khoảng nhìn và trải nghiệm theo mùa như ý đồ concept.
Không tự chọn tên loài cây hoặc hứa hiệu quả vi khí hậu khi chưa xác minh địa điểm và thiết kế.
Màu trời chuyển về chạng vạng nhẹ; ánh sáng ấm từ phòng khách tạo liên hệ với nơi vừa đi qua.
Mặt nước là tùy chọn sau kiểm tra chi phí render và thiết kế; không phải điều kiện kể chuyện.
Kết cảnh: camera nhìn lại khối nhà và khung cửa phòng khách trong một chuyển động liền mạch.

## 8. Khung 06 — Finale

Camera lùi/nâng nhẹ để thấy nhà, nội thất và vườn chung một bố cục; không biến thành fly-through tốc độ cao.
VI: “Ngôi nhà của bạn nên kể câu chuyện của chính bạn.”
EN: “Your home should tell your story.”
Vùng liên hệ DOM có khoảng nền yên, tiêu đề rõ, CTA chính và Zalo/Messenger/WhatsApp.
Đến p=1, camera ổn định; người xem vẫn cuộn tới nội dung liên hệ tự nhiên và có thể cuộn lùi.
Preview ghi “Chưa cấu hình” tại kênh chưa có; production chặn phát hành khi chưa hoàn tất ba kênh hoặc đổi phạm vi được duyệt.

## 9. Chế độ thay thế và Phase 2

Mỗi khung có một ảnh tĩnh đủ ý nghĩa, mô tả ảnh cần thiết và cùng nội dung DOM; không chỉ dùng ảnh hero cho cả trang.
Reduced-motion không import/khởi tạo WebGL, không rail, không âm thanh tự bật; các khung thành section đọc thông thường.
Fallback WebGL giữ thứ tự câu chuyện, ba chi tiết và vùng liên hệ; không thay bằng thông báo lỗi duy nhất.
Phase 2 chèn lần lượt kitchen, courtyard, bedroom, bathroom, workspace, balcony giữa living và garden.
Mỗi chương thêm phải xác nhận đường đi/độ cao thực trước khi cập nhật rail; balcony không đồng nghĩa được teleport lên tầng.
Các chương thêm kế thừa mẫu: một ý chính, điểm nhìn, ngưỡng chuyển, câu chuyện DOM, poster và tiêu chí bàn phím.

## 10. Gói duyệt và kiểm tra trước dựng UI

Chuẩn bị sơ đồ nhà một trang, sáu thumbnail Phase 1 và contact sheet cả bản chữ VI/EN ở desktop/mobile.
Review đường camera ở các mốc 0, .15, .27, .39, .50, .68, .87, 1 và khi cuộn ngược qua từng cửa.
Kiểm tra cửa đi có thật, không xuyên vật thể, chữ không phủ chi tiết, không mất định hướng và CTA luôn tới HTML.
Cho người chưa đọc brief kể lại quan hệ phòng khách–vườn và tìm liên hệ; ghi điều hiểu sai để sửa storyboard.
Chỉ khóa nhịp/chữ sau vòng review; chưa coi storyboard này là tài sản marketing hoặc công trình đã được phê duyệt.
