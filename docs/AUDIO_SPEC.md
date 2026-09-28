# Đặc tả âm thanh HavenArt

Trạng thái: quyết định thiết kế cho Phase 1; chưa có trình phát hoặc tệp âm thanh được nhập.
Mục tiêu: tạo cảm giác không gian yên tĩnh, không cung cấp thông tin bắt buộc qua âm thanh.
Chủ trì: kỹ sư frontend; duyệt cảm nhận: thiết kế trải nghiệm; duyệt nguồn: phụ trách tài sản.

## Phạm vi và nguyên tắc

- Phase 1 có sáu chương: `exterior`, `approach`, `entrance`, `living`, `garden`, `finale`.
- Ưu tiên một bộ sample ambient CC0 có nguồn và giấy phép kiểm tra được.
- Không yêu cầu nhạc nền, dịch vụ audio, spatial engine hoặc tài sản trả phí.
- Bản đầu dùng stereo ambient đơn giản; panning theo vật thể là nâng cấp sau khi có lý do rõ ràng.
- Mặc định luôn OFF khi mở tài liệu mới, kể cả lần truy cập trước từng bật âm thanh.
- Không lưu lựa chọn để tự phát trong lần truy cập tiếp theo.
- Không tải, preload, giải mã hoặc tạo AudioContext trước thao tác bật âm thanh trực tiếp.
- Mọi câu chuyện, hotspot và CTA phải hoàn chỉnh khi âm thanh tắt hoặc hỏng.

## Trạng thái và quyền điều khiển

| Trạng thái | Hành vi | Nhãn điều khiển VI / EN |
| --- | --- | --- |
| `off` | Không phát; chưa tải nếu chưa từng bật | Bật âm thanh / Enable sound |
| `loading` | Người dùng đã bật; tải và giải mã | Đang tải âm thanh / Loading sound |
| `playing` | Context đang chạy, master gain cho phép phát | Tắt âm thanh / Mute sound |
| `suspended` | Tab ẩn hoặc context bị trình duyệt ngắt | Âm thanh tạm dừng / Sound paused |
| `unavailable` | Lỗi tải, giải mã hoặc API | Âm thanh chưa khả dụng / Sound unavailable |

- Dùng button DOM có tên truy cập được; `aria-pressed` phản ánh ý định bật, không trạng thái tải.
- Enter, Space, chuột và chạm đều tạo thao tác bật hợp lệ.
- Trong handler thao tác bật, tạo hoặc lấy context rồi gọi `AudioContext.resume()` trực tiếp.
- Chỉ báo `playing` sau khi context thực sự chạy và buffer tối thiểu sẵn sàng.
- Nếu `resume()` thất bại, chuyển về trạng thái không phát, thông báo ngắn và cho phép thử lại.
- Tắt trong lúc tải phải hủy tải khi có thể và vô hiệu kết quả cũ bằng request token.
- Tắt khi đang phát hạ master gain mềm trong khoảng 50 ms rồi dừng hoặc suspend context.
- Chuyển ngôn ngữ tắt tiếng/cleanup nguồn cũ, giữ tiến độ câu chuyện; cần opt-in để bật lại ở route mới. Không có hai nguồn phát chồng nhau.

## Mix theo câu chuyện

| Chương | Lớp chủ đạo | Ý đồ |
| --- | --- | --- |
| `exterior` | Gió nhẹ, lá; chim xa nếu sample phù hợp | Không gian ngoài nhà, không lấn át nội dung |
| `approach` | Cùng lớp ngoài trời, giảm dần mức nền | Giữ liên tục khi đi vào nhà |
| `entrance` | Ngoài trời chuyển sang room tone | Cảm giác qua ngưỡng cửa |
| `living` | Room tone rất nhẹ, vườn ở xa | Sự tĩnh lặng của không gian sống |
| `garden` | Gió và lá trở lại; nước chỉ khi cảnh có nước | Kết nối với cảnh quan thực sự được dựng |
| `finale` | Giữ ambience vườn, tiết chế ở CTA | Kết thúc êm, không fanfare |

- `audioPreset` là dữ liệu tham chiếu lớp, gain giới hạn và cửa sổ chuyển, không chứa side effect.
- Mix đọc cùng `renderedStoryProgress` đã dùng cho camera và ánh sáng; không tự đọc raw scroll.
- Hàm `weightsAt(progress)` thuần, kẹp progress trong `[0, 1]`; cùng progress cho cùng gain mục tiêu.
- Trong vùng chuyển `t`, hai lớp dùng equal-power `cos(t * π/2)` và `sin(t * π/2)`.
- Giới hạn tổng mức phát tại master; không giả định equal-power loại trừ clipping của sample tương quan.
- Áp dụng ramp gain ngắn khoảng 50 ms để tránh click; không xếp hàng tween mỗi frame.
- Cuộn ngược tính lại trọng số từ progress hiện tại, không đảo bằng lịch sử sự kiện chương.
- Trong cinematic, raw scroll nhảy vẫn mix theo rendered progress đang đi liên tục qua rail. Trong static, đổi chương đọc thì crossfade trực tiếp sang mix đích, không phát chuỗi chương đã bỏ qua.
- Các loop chạy liên tục khi bật; không restart sample tại ranh giới chương.
- Kiểm tra đường nối loop; xử lý fade đầu/cuối trong khâu chuẩn bị nếu cần và ghi vào giấy phép.

## Vòng đời và chế độ thay thế

- `visibilitychange` sang hidden phải hạ gain và suspend context; không tiếp tục phát ở nền.
- Khi tab hiện lại, chỉ thử resume nếu trước đó người dùng đã bật; nếu bị chặn, chờ thao tác tiếp theo.
- Không tự bật do tab hiện, đổi locale, khôi phục WebGL hoặc thay đổi quality tier.
- Chuyển sang static do người dùng/reduced motion/lỗi renderer đưa audio về off; bản static vẫn có quyền chủ động bật lại, chỉ tải module audio độc lập và mix theo chương nội dung đang đọc.
- Lỗi một lớp loại lớp đó khỏi mix; lỗi bộ tối thiểu chuyển `unavailable`, giữ toàn bộ trang hoạt động.
- Không retry vô hạn; lần thử lại phải do người dùng yêu cầu sau lỗi mạng.
- Unmount phải dừng nguồn, tháo listener, hủy fetch còn chờ và đóng context do module sở hữu.
- Buffer chỉ giữ trong RAM khi còn phiên trang; không tạo cache ngoại tuyến trong Phase 1.

## Ngân sách và kiểm chứng

- Đích lập kế hoạch: bộ ambient nén tổng không quá 1,5 MB, nạp sau thao tác bật; đo lại với sample thật.
- Ưu tiên tối đa hai lớp phát đồng thời; phòng ở trong nhà không cần sample riêng cho từng chương.
- Báo cáo riêng byte tải và bộ nhớ PCM đã giải mã; tệp nén nhỏ không đồng nghĩa RAM nhỏ.
- Mức master mặc định phải đủ nhẹ trên tai nghe và loa điện thoại; duyệt bằng nghe thực tế.
- Xác minh không có request `/audio/` trước gesture bằng Network ở lần tải sạch.
- Xác minh không có âm thanh khi tải trang, đổi locale, quay lại tab hoặc phục hồi lỗi mà chưa từng bật.
- Xác minh bật/tắt nhanh khi mạng chậm không gây phát muộn sau khi đã tắt.
- Xác minh tiến/lùi qua entrance và garden không click, giật mức âm hoặc tạo loop chồng nhau.
- Xác minh quyền autoplay bị từ chối, thiếu sample và decode lỗi đều giữ CTA sử dụng được.
- Chỉ nghiệm thu âm thanh production sau khi mọi sample có bản ghi trong `ASSET_LICENSES.md`.

## Ngoài phạm vi

Không có lời đọc, sound effect cho hotspot, hiệu ứng thưởng hoàn thành, âm thanh bắt buộc hoặc thu microphone.
Không dùng sự kiện `audio_enabled` để suy ra người dùng đã nghe nội dung hay đánh giá mức quan tâm.
