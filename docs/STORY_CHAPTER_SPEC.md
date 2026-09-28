# Đặc tả dữ liệu chương kể chuyện

## Trạng thái và mục đích

- Tài liệu này mô tả hợp đồng dữ liệu dự kiến; các khoảng chia và trọng số chưa được kiểm chứng UX.
- Chapter giải thích kiến trúc; camera đi trong một thế giới liên tục, không chuyển scene theo chapter.
- Nội dung VI/EN được quản lý bằng dictionary key, không lặp nguyên văn trong renderer.
- Một `renderedStoryProgress` điều khiển chapter, camera, lighting, hotspot và audio mix khi đã bật âm thanh.
- Chapter không giữ tween, timer hoặc scroll listener riêng.
- Đối chiếu [storyboard](UX_STORYBOARD.md), [camera](CAMERA_SCROLL_SPEC.md), [i18n](I18N_SPEC.md).
- Schema API chuẩn nằm tại [thiết kế tích hợp](superpowers/specs/2026-09-27-havenart-design.md); bảng này mô tả ý nghĩa dữ liệu.

## Timeline Phase 1 đề xuất

| ID ổn định | Khoảng progress | Detail zone | Ý chính |
| --- | --- | --- | --- |
| `exterior` | `[0.00, 0.15)` | `exterior` | HavenArt — Kiến tạo nơi bạn thuộc về. |
| `approach` | `[0.15, 0.27)` | `exterior` | Kiến trúc bắt đầu trước ngưỡng cửa. |
| `entrance` | `[0.27, 0.39)` | `entrance` | Từ chuyển động bên ngoài tới sự riêng tư bên trong. |
| `living` | `[0.39, 0.68)` | `living` | Một không gian cho những cuộc gặp gỡ. |
| `garden` | `[0.68, 0.87)` | `garden` | Kiến trúc trả lại chỗ cho thiên nhiên. |
| `finale` | `[0.87, 1.00]` | `garden` | Ngôi nhà của bạn nên kể câu chuyện của chính bạn. |

- Biên đầu bao gồm, biên cuối không bao gồm; riêng chapter cuối chứa cả progress bằng 1.
- Ví dụ 0,39 thuộc `living`, 0,68 thuộc `garden`; không có hai active chapter tại một biên.
- Độ dài story DOM được đề xuất khoảng 8–12 chiều cao viewport cho Phase 1, cần kiểm thử thực tế.
- Các khoảng này là một cấu hình Phase 1, không phải API cố định cho các phase sau.
- Transition không phải chapter phụ; ánh sáng và camera được nội suy xuyên qua biên.

## Trách nhiệm kể chuyện theo chapter

| Chapter | Bố cục và nội dung | Hành động phụ |
| --- | --- | --- |
| Exterior | Công trình giữa cây; định vị VI/EN; lời dẫn ngắn về cách sống | Liên hệ luôn có trong DOM |
| Approach | Bóng đổ, nén không gian và khung nhìn dẫn đến cửa | Cho phép bỏ qua phần chữ |
| Entrance | Qua khoảng mở thật; vật liệu chuyển từ sân vào nhà | Mở câu chuyện ngưỡng cửa |
| Living | Mở góc vườn, ánh sáng có kiểm soát, tỷ lệ đồ nội thất | Khám phá hai hotspot kiến trúc |
| Garden | Cây và không khí chiếm ưu thế; nhà ấm phía sau | Gợi ý tư vấn nhỏ, không popup |
| Finale | Camera lùi/nâng khi đã ngoài mái, thấy quan hệ nhà–vườn | CTA chính và kênh liên hệ hợp lệ |

- Supporting copy là đề xuất sáng tác, không là lời chứng thực hoặc công bố hiệu suất công trình.
- Câu chuyện dịch vụ và CTA có trong DOM dù người dùng không chạy hành trình 3D.
- Room panel gồm ý đồ, nguyên tắc, vật liệu và chiến lược ánh sáng với nội dung ngắn.
- Không đưa giá, mã SKU, nút mua hàng hoặc liên kết shop vào hotspot.

## Hợp đồng `StoryChapter`

| Trường | Quy tắc |
| --- | --- |
| `id` | Định danh ổn định, duy nhất, dùng cho event và cấu hình |
| `slug` | Anchor thân thiện; locale route xử lý ở tầng i18n |
| `progressStart`, `progressEnd` | Kết quả timeline builder; dùng number 0–1 |
| `cameraRange` | Tuple readonly `[number, number]` tham chiếu rail liên tục, không chứa lệnh teleport |
| `copyKey` | Key gốc nhóm tiêu đề, mô tả, room panel, a11y trong VI/EN |
| `lightingPreset` | Tham chiếu keyframe; chuyển tiếp lấy từ lighting track toàn cục |
| `audioPreset` | Mix mục tiêu; chỉ có tác dụng khi người dùng bật âm thanh |
| `hotspotIds` | Các hotspot hợp lệ của chapter; anchor không phụ thuộc tên mesh |
| `qualityHints` | `{ preferredTier: 'high' \| 'medium' \| 'low' }`; không ép vượt ngân sách thực tế |

- Nội dung không lưu JSX, import component hoặc callback tạo cảnh trong config chapter.
- `order`, `weight`, `zoneIds`, `posterKey` là metadata ở cấu hình soạn nội dung/manifest, không thêm tùy tiện vào API chuẩn.
- Story config có version schema; cache asset dùng content hash riêng, không gộp chung version.
- Bộ render nhận dữ liệu đã validate; runtime không tự đoán chapter thiếu.
- `sampleChapter(chapters, p)` trả một `StoryChapter`; `sampleRail(p)` trả `CameraPose` theo schema tích hợp.

## Tính progress và snapshot

- Active chapter được tìm bằng interval trên `renderedStoryProgress`, không dựa vào intersection của đoạn DOM.
- `localProgress = (renderedStoryProgress - start) / (end - start)`, clamp vào `[0,1]`.
- Copy có thể fade theo local progress; fade không tạo chapter thứ hai hoặc loại nội dung khỏi DOM semantic.
- Lighting interpolation lấy progress toàn cục để không reset lúc local progress đổi từ 1 về 0.
- UI active ID đổi ngay theo frame; `chapter_entered` chỉ phát khi ID mới ổn định 300 ms lúc tab visible theo ANALYTICS_SPEC, không phát tại mọi frame.
- Cuộn ngược được phép phát chapter entered lại; session summary có thể đếm visited riêng.
- Không phát `experience_completed` chỉ vì raw scroll đã chạm cuối khi rendered progress còn giữa nhà.
- Ngưỡng cinematic completion dự kiến `renderedStoryProgress ≥ 0.99` và finale CTA hiện ≥50% trong 1.000 ms liên tục sau started; ghi tối đa một lần/document theo ANALYTICS_SPEC.
- Sự kiện chỉ là abstraction nội bộ; không yêu cầu dịch vụ analytics trả phí hoặc dữ liệu cá nhân.

## Hotspot tối thiểu Phase 1

| ID đề xuất | Chapter | Khoảng local progress | Nội dung kiến trúc |
| --- | --- | --- | --- |
| `travertine-wall` | `living` | `[0.15, 0.60]` | Sắc độ đá ấm tạo chiều sâu trong ánh sáng gián tiếp |
| `sliding-glass` | `living` | `[0.42, 0.92]` | Hệ cửa trượt nối phòng khách với hiên và vườn |
| `garden-tree` | `garden` | `[0.20, 0.75]` | Cây tạo lớp riêng tư và khung nhìn từ bên trong |
| `living-sofa` | `living` | `[0.12, 0.65]` | Ứng viên bổ sung về tỷ lệ chỗ ngồi và lối đi |

- Ba ID `travertine-wall`, `sliding-glass`, `garden-tree` là yêu cầu tối thiểu; sofa là tùy chọn.
- Khoảng trên chỉ cho phép xét hiển thị; còn phải đạt điều kiện khoảng cách, frustum và không bị che.
- Low tier được giảm số marker đồng thời nhưng DOM vẫn cung cấp đủ nội dung cả ba hotspot.
- Xem [hotspot spec](HOTSPOT_SPEC.md) cho keyboard, Escape, focus và panel trên mobile.

## Mở rộng Phase 2

- Thứ tự: `exterior, approach, entrance, living, kitchen, courtyard, bedroom, bathroom, workspace, balcony, garden, finale`.
- Giữ nguyên ID cũ; chapter mới nối giữa living và garden theo yêu cầu câu chuyện.
- Kitchen giải thích sinh hoạt thường ngày; courtyard giải thích ánh sáng và thông gió.
- Bedroom giải thích riêng tư; bathroom giải thích sự phục hồi và chất liệu.
- Workspace giải thích tập trung; balcony đưa hành trình trở lại cảnh quan ngoài nhà.
- Chủ đề ánh sáng buổi sáng trong bedroom là nội dung thiết kế, không đổi thời gian câu chuyện sang sáng.
- Đề xuất trọng số: 15, 12, 12, 29, 18, 18, 18, 12, 12, 12, 19, 13 theo thứ tự trên.
- Timeline builder chia mỗi trọng số cho tổng rồi lấy tổng tích lũy; kết quả cuối phải chính xác bằng 1.
- Không giữ biên `living = 0.39–0.68` trong Phase 2; mọi global range được tính lại.
- Hotspot nên gắn local progress trong chapter để không phải sửa range tay khi thêm phòng.
- CameraRange và lighting keyframe vẫn phải review lại cho rail dài hơn; config không tự bảo đảm đẹp.
- Deep link lưu chapter ID + local progress, không lưu một global fraction cố định xuyên schema version.

## Validation và failure policy

- ID, slug và hotspot ID phải duy nhất; thứ tự chapter trùng phải báo lỗi cấu hình.
- Ranges phải tăng, dài dương, liền nhau, không gap/overlap và phủ đúng `[0,1]`.
- Chapter đầu bắt đầu 0; chapter cuối kết thúc 1; kết quả số học có tolerance rất nhỏ được chuẩn hóa một lần.
- Mọi reference camera, lighting, audio, zone, poster và locale key phải phân giải được.
- Mỗi locale phải có title, story, hotspot content và a11y label trước khi gọi là hoàn thiện.
- Contact thiếu được xử lý theo [i18n](I18N_SPEC.md) và [UX](USER_JOURNEY.md), không tạo URL giả.
- Core config không hợp lệ bị chặn lúc build; nếu phát hiện lỗi cấu hình runtime ngoài dự kiến thì phát lỗi có mã và chuyển toàn bộ nội dung sang static DOM.
- Optional hotspot không hợp lệ: ẩn marker lỗi, giữ bản nội dung hợp lệ trong DOM và báo validation.
- Kiểm tra các biên với `b-ε`, `b`, `b+ε`, và các đầu vào âm, lớn hơn 1 hoặc không hữu hạn.
- Kiểm tra tiến–lùi cùng progress ra cùng chapter, local progress và hotspot candidate set.
- Tất cả điều kiện trên là tiêu chí kiểm thử tương lai, chưa phải báo cáo đạt nghiệm thu.
