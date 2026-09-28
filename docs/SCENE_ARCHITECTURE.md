# Kiến trúc cảnh 3D HavenArt

## Trạng thái và phạm vi

- Đây là kế hoạch kỹ thuật; chưa có ứng dụng, mô hình đã dựng hoặc số đo hiệu năng.
- Mọi tọa độ, kích thước, ngưỡng và ngân sách dưới đây là đề xuất cần kiểm chứng bằng prototype.
- Phase 1 chứng minh hành trình `exterior → approach → entrance → living → garden → finale`.
- Phase 2 chèn `kitchen, courtyard, bedroom, bathroom, workspace, balcony` giữa `living` và `garden`.
- Trải nghiệm dùng một thế giới liên tục; chapter là dữ liệu kể chuyện, không phải scene thay thế nhau.
- Camera, ánh sáng, chapter và hotspot cùng lấy mẫu một `renderedStoryProgress`.
- Nội dung HTML, CTA và thông tin không được phụ thuộc vào canvas hoạt động.
- Đối chiếu [camera](CAMERA_SCROLL_SPEC.md), [chapter](STORY_CHAPTER_SPEC.md), [ngân sách](PERFORMANCE_BUDGET.md).
- Hợp đồng API chính thức của kế hoạch nằm trong [thiết kế tích hợp](superpowers/specs/2026-09-27-havenart-design.md).

## Hệ tọa độ và mặt bằng đề xuất

| Quy ước | Giá trị / ý nghĩa |
| --- | --- |
| Đơn vị | 1 unit = 1 mét; không scale toàn cảnh để sửa lỗi import |
| Trục | Y hướng lên; +Z từ cổng qua cửa chính về vườn sau; +X sang phải khi tiến vào nhà |
| Gốc thế giới | Tâm ngưỡng cửa chính ở cao độ sàn hoàn thiện: `(0, 0, 0)` |
| Đất | X từ -12 đến 12; Z từ -20 đến 32 |
| Vỏ nhà | X từ -8 đến 8; Z từ 0 đến 15,5; cao độ mái khoảng 3,8 |
| Sảnh | Vùng lưu thông X từ -2 đến 2; Z từ 0 đến 4 |
| Phòng khách | Vùng chính X từ -6 đến 6; Z từ 4 đến 15,5 |
| Hiên sau | Z từ 15,5 đến 19; nối sàn và vườn bằng lối đi không có bước nhảy camera |
| Vườn | Z từ 19 đến 30; dành khoảng thoáng cho final reveal |
| Cửa chính | Khoảng mở liên tục X từ -1,4 đến 1,4; không đặt kính vô hình chắn đường |
| Cửa sau | Khoảng mở X từ 0,8 đến 3,8 tại Z = 15,5; panel trượt ở trạng thái mở |

- Các vùng trên chỉ là phong bì bố trí; đây không phải hồ sơ thiết kế kiến trúc để thi công.
- Sàn phía trước, sảnh, living và hiên được căn cùng cao độ hoặc có dốc hợp lý.
- Không đặt tường, cột, sofa, tán cây hoặc mặt kính giao với hành lang camera đã phê duyệt.
- Phase 2 mở rộng mặt bằng từ các cổng kết nối; không co giãn nhà để nhét thêm chương.

## Phân lớp cảnh

| Lớp | Trách nhiệm | Vòng đời |
| --- | --- | --- |
| `SceneRoot` | Renderer, camera, lỗi WebGL, một vòng cập nhật | Một phiên 3D |
| `WorldRoot` | Transform thế giới cố định; không quay hoặc scale theo chapter | Một phiên 3D |
| `PersistentShell` | Nền đất, silhouette nhà, sàn, tường, mái, cửa mở, mảng vườn chính | Luôn resident khi 3D hoạt động |
| `ZoneDetailRoot` | Nội thất và vật liệu chi tiết theo vùng | Resident theo chính sách streaming |
| `LightingRig` | Mặt trời, môi trường, practical light có giới hạn | Dùng lại xuyên hành trình |
| `HotspotAnchors` | Điểm neo định danh; tách khỏi mesh trang trí có thể thay | Dữ liệu nhỏ luôn sẵn |
| `EnvironmentMotion` | Lá, rèm và nước ở vùng hiện hành | Chỉ cập nhật khi được bật |
| `DOMExperience` | Nội dung semantic, panel, điều hướng, CTA | Hiện hữu trước và sau 3D |

- `PersistentShell` giữ các khoảng mở thực, không phải hộp kín làm backdrop.
- Độ chi tiết shell phải đủ để nhìn xuyên phòng và nhìn ngược mà không thấy vùng rỗng.
- Shell và detail không có các mặt đồng phẳng chồng nhau gây z-fighting.
- Mỗi vùng chỉ sở hữu phần chi tiết; nền và kết cấu tiếp giáp có một chủ sở hữu rõ ràng.
- Cửa và kính trượt không đổi trạng thái bất ngờ lúc đổi chapter.
- Vật liệu kính có phương án đơn giản cho tier thấp theo [lighting](LIGHTING_SPEC.md).

## Luồng điều khiển

1. Native scroll được đọc trong vòng `requestAnimationFrame` do bộ điều phối sở hữu.
2. Bộ ánh xạ tạo target progress; bộ làm mượt có giới hạn tạo `renderedStoryProgress`.
3. Một snapshot bất biến cho frame chứa progress, pose camera, ánh sáng và chapter.
4. Scene, DOM overlay và hotspot dùng cùng snapshot; không tự suy ra progress riêng.
5. Streaming được phép dự đoán từ hướng cuộn, nhưng không thay đổi chapter đang kể.
6. Renderer vẽ sau khi camera, light và hotspot đã dùng snapshot của frame đó.
- Không lưu camera position thành một hệ tween độc lập trong state React.
- State tần suất cao ở runtime; chỉ phát sự kiện chapter khi ID thực sự thay đổi.
- GSAP/ScrollTrigger, nếu dùng, chỉ hỗ trợ đo hoặc UI; không trở thành đồng hồ thứ hai.
- Mở panel không tạo lại camera rail/canvas. Đổi locale có thể remount theo routing; khi đó lưu chapter/local progress, cleanup rồi phục hồi trước khi lộ canvas, không giữ hai runtime cùng chạy.

## Hợp đồng zone có thể thay thế

- Mỗi zone có ID ổn định, bounds thế giới, transform root và danh sách cổng kết nối.
- Manifest lưu URI asset, bytes, biến thể chất lượng, dependency và license reference.
- Zone local origin đặt tại anchor đã ghi; transform sang world phải được khai báo duy nhất.
- Anchor camera, hotspot và cổng kết nối có tên ổn định ngoài tên mesh mỹ thuật.
- Proxy và GLB thật dùng cùng root origin, đơn vị, bounds và connector anchors.
- Thay GLB không chỉnh rail để che lỗi scale; asset phải sửa theo hợp đồng.
- Kiểm tra bounding box, clearances, vật liệu và hotspot trước khi thay proxy đã ổn định.
- Hướng dẫn xuất và kiểm chứng nằm trong [asset pipeline](ASSET_PIPELINE.md).

## Chính sách resident và prefetch

- Khởi động chỉ cần shell, môi trường tối thiểu và detail exterior; DOM đã đọc được.
- Nếu người dùng đã cuộn xa khi core tải xong, giữ bản đọc tĩnh; cung cấp hành động chủ động bắt đầu từ đầu.
- Không bất ngờ bật canvas rồi chạy camera đuổi theo vị trí đọc của người dùng.
- Chi tiết active zone được ưu tiên trước neighbor và trang trí.
- Mục tiêu resident là active + một neighbor ở hướng đi; thêm neighbor phía sau chỉ khi đủ bộ nhớ.
- Tối đa đề xuất ba detail zone resident; shell và tài nguyên dùng chung được tính riêng vào tổng.
- `approach` dùng exterior detail; `finale` dùng garden detail, không tải hai bản sao.
- Prefetch trước biên khoảng 0,04 progress hoặc theo thời gian đến cổng dự đoán; cần hiệu chỉnh.
- Khi đổi hướng, hủy request chưa cần nếu khả thi; không phá tài nguyên đang được render.
- Khi jump xa, ưu tiên detail đích và shell các vùng giữa; không tải tất cả vùng đã đi qua.
- Nếu detail đến muộn, giữ proxy của vùng đó để camera tiếp tục đi trên rail.
- Neighbor thiếu không được tạo hard cut, freeze vô hạn hoặc đổi target camera.
- Evict theo LRU trong nhóm không active, không được khóa; giới hạn bytes thắng giới hạn số vùng.
- Tải, giải nén và upload GPU là các trạng thái riêng để kiểm soát đỉnh bộ nhớ.

## Sở hữu tài nguyên và cleanup

- Asset registry sở hữu geometry, material, texture và decoded source có khóa cache theo URI + variant.
- Zone instance sở hữu Object3D clone, event binding, animation mixer và instance buffer riêng.
- Zone acquire tăng reference count; unmount trả reference và giải phóng tài nguyên riêng của instance.
- Không gọi dispose lên material hoặc texture dùng chung từ cleanup của một zone.
- Registry chỉ dispose tài nguyên chia sẻ khi reference bằng 0, không còn pin và đã bị evict.
- Texture pool và environment PMREM có owner riêng; texture source và bản chuyển đổi được theo dõi riêng.
- Shell pin tài nguyên cốt lõi cho cả phiên; không bị LRU detail evict nhầm.
- Prefetch thất bại phải trả reference, gỡ listener và giải phóng buffer tạm.
- Renderer shutdown hủy vòng frame, observer, request, audio và dispose registry đúng một lần.
- Context loss đánh dấu GPU handle vô hiệu; không tái dùng handle cũ chỉ vì cache còn URI.
- Kiểm tra số geometry/texture sau ba vòng tiến–lùi để phát hiện resident tăng không giới hạn.

## Lỗi và chế độ thay thế

- Asset trang trí lỗi: ghi nhận mã lỗi, dùng proxy cùng bounds hoặc bỏ vật thể không thiết yếu.
- Shell, rail hoặc cấu hình cốt lõi lỗi: vào full static DOM, giữ vị trí nội dung tương ứng.
- WebGL không khả dụng hoặc lỗi lặp: kết thúc phiên 3D và chuyển full static DOM.
- `prefers-reduced-motion` có hiệu lực trước nhánh dynamic import: không import WebGL/R3F/Three.
- Người dùng bật reduced motion giữa phiên: ngừng animation, cleanup 3D, giữ mọi nội dung và CTA.
- Static mode có ảnh kiến trúc, đủ mọi phòng trong scope, dịch vụ, hotspot và CTA có cấu hình hợp lệ.

## Điều kiện xác nhận kiến trúc

- Kiểm chứng rail không xuyên shell, không phụ thuộc trạng thái tải detail và chạy ngược giống chạy xuôi.
- Thay một proxy living bằng GLB giữ nguyên camera, chapter, hotspot và nội dung.
- Phase 2 giữ engine; được chỉnh control point, connector và topology rail để phản ánh mặt bằng hoặc tầng mới.
- Mô phỏng texture lỗi, GLB lỗi, đảo hướng lúc tải và context loss không làm mất CTA.
- [Tiêu chí nghiệm thu](ACCEPTANCE_CRITERIA.md) ghi bằng chứng kiểm tra; tài liệu này chưa chứng minh đã đạt.
