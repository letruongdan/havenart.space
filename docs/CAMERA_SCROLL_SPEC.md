# Đặc tả camera và cuộn

## Nguyên tắc bắt buộc

- Đây là đặc tả dự kiến; mọi điểm rail, góc nhìn, tốc độ và ngưỡng cần kiểm chứng trực quan.
- Native scroll điều khiển một hành trình liên tục; không hard cut khi tiến, lùi hoặc đổi chapter.
- Không teleport camera khi menu chapter, Home/End, scroll restoration hoặc thao tác chạm tạo bước nhảy lớn.
- Không chặn wheel, trackpad hoặc touch để ép người dùng đi hết hoạt cảnh.
- Một `renderedStoryProgress` duy nhất cấp dữ liệu cho camera, lighting, chapter, UI và hotspot.
- Cấu trúc thế giới tuân theo [scene architecture](SCENE_ARCHITECTURE.md).

## Hệ quy chiếu và rail

- 1 unit = 1 mét; Y-up; ngưỡng cửa chính là `(0, 0, 0)`; +Z hướng về vườn sau.
- Rail là đường cong liên tục qua khoảng mở thật, tách biệt khỏi danh sách chapter.
- Ưu tiên spline Catmull–Rom theo tham số centripetal hoặc spline tương đương có kiểm soát overshoot.
- Tạo bảng tra chiều dài cung; story progress ánh xạ sang khoảng cách dọc rail qua speed profile đơn điệu.
- Không cho raw spline parameter quyết định tốc độ vì các control point có khoảng cách khác nhau.
- Bố trí thêm control point tiếp tuyến ở hai phía ngưỡng cửa để đường cong không quệt góc tường.
- Rail cần liên tục vị trí và tiếp tuyến; việc nối đoạn không được đổi hướng tức thời.
- Không cần camera free-fly, orbit control hoặc điều khiển tự do trong trải nghiệm chính.

## Các mốc bố cục Phase 1 đề xuất

| Progress | Vị trí world `(x,y,z)` | Ý đồ |
| --- | --- | --- |
| 0,00 | `(0, 1.65, -18)` | Nhìn thấy mảng kiến trúc và cây; poster khớp bố cục đầu |
| 0,15 | `(0, 1.65, -7)` | Đã vào lối tiếp cận, ngưỡng cửa còn ở phía trước |
| 0,27 | `(0, 1.65, -0.8)` | Chuẩn bị qua khoảng mở cửa chính |
| 0,39 | `(0, 1.65, 4.4)` | Mở góc nhìn từ sảnh sang phòng khách |
| 0,54 | `(2.8, 1.60, 7.7)` | Điểm chậm nhìn chất liệu, sofa và quan hệ với vườn |
| 0,68 | `(2, 1.65, 14.6)` | Tiến vào khoảng mở cửa kính sau |
| 0,76 | `(2, 1.65, 19)` | Ra khỏi hiên, vẫn còn nhìn được ánh sáng trong nhà |
| 0,87 | `(0, 2.00, 23)` | Vườn chiếm ưu thế; chuẩn bị pullback |
| 1,00 | `(0, 6.00, 29)` | Nâng dần ngoài mái, nhìn lại toàn bộ nhà và vườn |

- Đây là mốc review bố cục, không phải hàng loạt tween vị trí camera độc lập.
- Look-at hướng vào cửa ở đầu, chi tiết kiến trúc trong living, rồi xoay dần nhìn lại nhà ngoài vườn.
- Không quay 180° đột ngột tại 0,76; phân bố chuyển hướng trên một đoạn vườn đủ dài.
- Mái và cây phải được kiểm tra trong frustum final; không nâng camera xuyên mái để đạt góc rộng.
- Phase 2 bổ sung rail qua các cổng kết nối rồi tính lại toàn bộ mốc progress theo độ dài kể chuyện.

## Từ cuộn tới progress

1. Đo khoảng cuộn story bằng top và chiều cao nội dung, trừ chiều cao viewport khả dụng.
2. Mỗi frame đọc native scroll position một lần; clamp target progress vào `[0, 1]`.
3. Resize, font ready và thay nội dung chỉ cập nhật phép đo; không tạo timeline khác.
4. Bộ tiến độ tính `renderedStoryProgress` bằng delta-time, vận tốc và gia tốc có giới hạn.
5. Các bộ lấy mẫu đọc cùng progress và frame ID; không giữ các bản eased progress riêng.
6. Sau khi snapshot hoàn tất, cập nhật camera rồi projected hotspot và cuối cùng render.
- Không dùng `scroll-behavior: smooth` cộng với scrub tween và camera damping thành ba tầng trễ.
- ScrollTrigger nếu có chỉ báo đo lường; GSAP không trực tiếp tween transform camera.
- Khi tab bị ẩn, dừng render; khi quay lại, giới hạn delta-time và tiếp tục từ pose đang giữ.
- Khi không có scroll mới và camera đã hội tụ, cho phép render-on-demand nếu không có motion khác.

## Speed profile và cảm giác chuyển động

- Speed profile là hàm đơn điệu từ progress sang normalized rail distance, có đạo hàm liên tục.
- Living nhận tỷ lệ progress lớn hơn khoảng cách thực để người dùng có thời gian nhìn.
- Sảnh và hiên nhanh hơn các điểm kể chuyện nhưng vẫn giữ đủ khoảng đệm trước cửa.
- Đề xuất quán tính tương đương 120–220 ms ở thao tác nhỏ; kiểm thử cả touch và trackpad.
- Đề xuất giới hạn vận tốc camera 3 m/s trong nhà và 5 m/s ngoài vườn; có thể phải giảm.
- Đề xuất giới hạn quay 30°/s và gia tốc 6 m/s²; đây là ngưỡng review, không bảo đảm hết say chuyển động.
- Bước nhảy cuộn lớn vẫn đi qua các pose trung gian; không snap khi sai số lớn.
- Dùng đảo dấu vận tốc có gia tốc hữu hạn khi người dùng cuộn ngược; không khựng theo biên chapter.
- Độ trễ lớn do jump phải hiển thị nội dung DOM đích ngay; người dùng vẫn tiếp cận được CTA.
- Camera và overlay 3D bám rendered progress trong lúc DOM native đã đến phần khác; không gán chapter theo DOM.
- Nếu độ trễ ảnh hưởng khả năng sử dụng, ưu tiên nút đọc bản tĩnh đầy đủ và hiệu chỉnh rail ngắn hơn.
- Không khóa bàn phím hoặc vô hiệu hóa liên kết CTA để chờ camera đuổi kịp.

## Hướng nhìn và ống kính

- Look-at rail là dữ liệu độc lập; tránh target trùng hoặc sát vị trí camera.
- Dựng orientation từ forward và world-up; nội suy quaternion theo đường ngắn nhất.
- Tiền xử lý dấu quaternion để các key cùng bán cầu; không đảo hướng khi scrub ngược.
- Tránh look-at thẳng lên trục Y gây mất ổn định; tăng chiều cao target cùng final reveal khi cần.
- Roll mục tiêu bằng 0; mọi lệch roll ngoại lệ phải có lý do bố cục và kiểm chứng comfort.
- Thẩm mỹ mục tiêu tương đương 35–55 mm full-frame; tính góc nhìn theo sensor/aspect đã chọn.
- Không gán con số 35–55 trực tiếp vào thuộc tính FOV tính bằng độ.
- `CameraPose.focalLengthMm` khởi đầu đề xuất 42 mm, sensor width 36 mm; renderer suy ra FOV theo aspect.
- Portrait mobile ưu tiên target/framing variant trong cùng hành lang an toàn; tránh FOV quá rộng.
- Variant mobile vẫn cần đường liên tục, cùng chapter ID và semantic progress; không đổi variant giữa frame.
- Đề xuất near plane 0,08 m và far plane 100 m; điều chỉnh theo kích thước cảnh và depth precision.

## Ràng buộc không xuyên tường

- Hành lang camera dùng bán kính đề xuất 0,30 m và khoảng hở thêm cho near plane.
- Kiểm tra mọi mẫu rail, không chỉ các control point, với shell collision proxy đơn giản.
- Lấy mẫu đề xuất mỗi 0,05 m rail, đồng thời kiểm tra sweep giữa hai mẫu liên tiếp.
- Kiểm tra cả thể tích near-plane ở mọi hướng nhìn quan trọng để tránh nhìn xuyên góc tường.
- Ngưỡng cửa phải là lỗ thật trong shell; không giải quyết bằng cách tắt vật liệu tường khi camera tới gần.
- Không thay đường rail ngẫu nhiên theo runtime collision; sửa dữ liệu offline khi validator báo vi phạm.
- Nếu cấu hình rail không hợp lệ ở runtime, vào full static DOM thay vì chạy camera xuyên vật thể.

## Chapter, hotspot và thao tác trực tiếp

- Chapter dùng half-open intervals trong [chapter spec](STORY_CHAPTER_SPEC.md); chỉ finale bao gồm 1.
- Menu chapter đổi native scroll target theo anchor semantic; camera vẫn tiến trên rail liên tục.
- Hotspot click mở panel DOM; không tự bay camera tới vật thể trong Phase 1.
- Dialog khóa native scroll nền và giữ nguyên `renderedStoryProgress` tại frame mở cho toàn bộ camera/light/hotspot.
- Cuộn nội dung dialog không cập nhật rail; đóng dialog trả focus và tiếp tục từ cùng progress với speed limit.
- Panel không có camera pose riêng; hành vi chi tiết theo [hotspot spec](HOTSPOT_SPEC.md), canvas không hijack scroll.
- Ngôn ngữ đổi giữ chapter và local progress; đo lại chiều cao DOM trước khi restore scroll tương ứng.
- Khi resize, giữ semantic chapter + local progress thay vì giữ số pixel cuộn cũ.
- Deep link hoặc tải xong sau khi đã cuộn xa giữ section DOM tương ứng; cung cấp lựa chọn bắt đầu 3D từ đầu.
- Không tự bật canvas ở pose lạ hoặc chạy catch-up sau màn hình tải; [thiết kế tích hợp](superpowers/specs/2026-09-27-havenart-design.md) chốt API.
- Sau khi canvas đã hiển thị, mọi chuyển chapter bắt buộc liên tục; không dùng fade để che teleport.

## Reduced motion và chế độ đọc

- Kiểm tra reduced-motion trước dynamic import của toàn bộ runtime WebGL.
- Chế độ tĩnh trình bày mọi chapter trong scope theo HTML thông thường, ảnh và CTA.
- Không giữ vùng scroll giả dài hoặc sticky canvas trống trong chế độ tĩnh.
- Khi người dùng đổi sang reduced motion, hủy camera update và trả điều hướng về các section DOM.
- Xem [accessibility](ACCESSIBILITY_SPEC.md) cho focus, bàn phím và cấu trúc nội dung tương đương.

## Kịch bản kiểm chứng

- Cuộn liên tục rồi đảo hướng tại 0,15 / 0,27 / 0,39 / 0,68 / 0,87 không có cut hoặc đổi pose đột ngột.
- Giữ nguyên progress cho kết quả pose/light/hotspot giống nhau bất kể đã đi tới đó từ hướng nào.
- Kiểm tra jump 0 → 1, 1 → 0, resize portrait, tab background và restore từ history.
- Quay video debug có overlay progress/frame ID để phát hiện lệch nhịp camera với UI hoặc ánh sáng.
- Review bằng mắt và kiểm tra clearances; validation toán học không thay thế review cảm giác chuyển động.
