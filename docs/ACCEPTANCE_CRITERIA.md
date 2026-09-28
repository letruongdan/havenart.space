# HavenArt — Tiêu chí nghiệm thu và truy vết

Ngày lập: 27/09/2026. **Chưa có tiêu chí ứng dụng nào được đánh dấu đạt.** Kế hoạch đã có, ứng dụng chưa được triển khai. Bằng chứng sau này lưu tại `docs/reports/ACCEPTANCE.md`; điều kiện đo theo PERFORMANCE_BUDGET.

## 18 tiêu chí Phase 1 từ brief

| ID | Điều kiện đạt | Kiểm chứng cần thực hiện | Task |
|---|---|---|---|
| AC01 | Hero HavenArt đúng vị thế, chữ và hình có bố cục premium | Ảnh desktop/mobile; review typography, contrast, tỷ lệ kiến trúc với storyboard | T02–03/09 |
| AC02 | Nội dung/CTA hiện trước, 3D tải dần không chặn trang | Cold load + mạng chậm, video và waterfall; lỗi tải không để canvas đen | T06/15 |
| AC03 | Scroll liên tục từ ngoại thất về phía nhà | Video wheel/trackpad/touch, sample progress→pose | T07–08 |
| AC04 | Camera thực sự đi qua cửa, không cut | Sweep clearance + review gần ngưỡng cửa, cả forward/reverse | T06–08 |
| AC05 | Living có tỷ lệ, vật liệu và ánh sáng thuyết phục | Ba keyframes, đánh giá bởi người phụ trách kiến trúc/mỹ thuật; không chỉ screenshot test | T09/11 |
| AC06 | Ít nhất ba hotspot có ý nghĩa | Mở travertine-wall/sliding-glass/garden-tree bằng chuột/chạm/bàn phím, đọc đủ lý do thiết kế | T10/12 |
| AC07 | VI và EN hoàn chỉnh | Dictionary parity, routes, UI/error/a11y labels/metadata, dấu Việt/font và đổi locale giữ ngữ cảnh | T02–03/16 |
| AC08 | Ánh sáng đổi tinh tế qua chuyến đi | Video p tăng/giảm và keyframe comparison, không flash exposure hay preset snap | T11 |
| AC09 | Camera ổn định khi đổi hướng tại mọi chương | Chạy quanh biên ±epsilon và thao tác đảo hướng ngẫu nhiên; không roll/snap | T07–08 |
| AC10 | Cuộn ngược đúng tuyến kiến trúc | Đi hết rồi lùi đầu; cùng p cho cùng pose/light, zone tải lại không lỗ cảnh | T06–08/14 |
| AC11 | Vườn và reveal kết thúc câu chuyện rõ | Review clip vào vườn, nhìn nhà ấm trong dusk, không xuyên mái/cây | T12 |
| AC12 | CTA cuối có Zalo/Messenger/WhatsApp thật | Chủ dự án xác minh cả ba URL và mở đúng đích trên desktop/mobile; không gửi tin trong smoke tự động | T04/12/17 |
| AC13 | Reduced motion có trải nghiệm đầy đủ | OS/mock reduce từ đầu và đổi giữa phiên; không WebGL import lúc reduce, đọc đủ story/details/service/CTA, không scroll spacer dài | T02/10/15 |
| AC14 | Mobile có quality phù hợp | Máy Android/iPhone thật, tier/DPR/thermal/resize/touch, xem low/fallback vẫn hoàn chỉnh | T14–15 |
| AC15 | License mọi tài sản được ghi | So manifest/file dùng với ASSET_LICENSES; đủ nguồn/tác giả/license/attribution/modification | T06/09/13/17 |
| AC16 | Không cần asset hoặc dịch vụ bắt buộc trả phí | Review dependencies, license và bước chạy; không yêu cầu API key dịch vụ trả phí | T01/06/17 |
| AC17 | Không có thông tin doanh nghiệp giả | Scan + chủ dự án đọc contact/copy/metadata/JSON-LD; preview chưa cấu hình khác production | T02/04/16/17 |
| AC18 | Kiến trúc hỗ trợ phòng mới | Fixture thêm chapter/zone qua config, validators chạy, sampler/camera engine không sửa API; review hợp đồng GLB | T05–08/17 |

AC12 chỉ đạt khi kênh thực tế đầy đủ. Nếu chủ dự án chọn phát hành ít kênh hơn, ghi thay đổi phạm vi và điều kiện nghiệm thu mới; không tự báo đạt brief cũ.

## Các kiểm tra kỹ thuật bổ sung

| Nhóm | Điều kiện |
|---|---|
| Chất lượng code | Typecheck strict, lint, unit trọng yếu và production static build đều pass; không console error/hydration error trong smoke |
| Core3D và tải | Mục tiêu core nén ≤8 MB, initial scene ≤15 MB; báo raw/wire bytes riêng, JS/poster/audio thống kê riêng |
| Render | Target high ≤200 draw calls, khoảng ≤1–1,5 triệu visible triangles; kiểm shadow/postprocessing và pixel count |
| FPS | Desktop hướng tới 60, mobile bật 3D duy trì ≥30 ở thiết bị đại diện; report median/p95 và điều kiện test |
| Bộ nhớ | Ba lượt tới/lùi không tăng resource count vô hạn; peak tải/swap trong budget; cleanup shared cache đúng |
| Audio | Không fetch/play trước opt-in; thất bại mute, tab ẩn suspend; không cần audio để hiểu nội dung |
| Khả năng tiếp cận | Semantic headings, skip link, focus visible, zoom, keyboard, modal/focus restore, không thông tin chỉ ở canvas |
| Config | Missing key/duplicate ID/gap/range invalid bị validator chặn; null contact hợp lệ ở preview nhưng không đủ release |
| Analytics | Đủ mười event; no-op mặc định, không PII, không request bên thứ ba, dedupe đúng, không chặn contact |
| SEO | HTML/metadata VI/EN, canonical origin thật, hreflang, sitemap, robots/noindex preview; không rating/địa chỉ bịa |
| Asset/network | GLB/texture lỗi riêng dùng proxy; core/WebGL lỗi chuyển static; decoder MIME/CORS/cache và font tải ổn |

Các con số là ngân sách dự kiến. Nếu không đạt, ghi vấn đề và giảm độ nặng/đổi mode trước nghiệm thu; không thay đổi ngưỡng mà không giải thích. Chưa có thiết bị thật thì ghi “chưa đo”, không dùng kết quả headless thay thế.

## Ma trận môi trường

| Môi trường | Luồng cần chạy |
|---|---|
| Chrome/Edge desktop, GPU tích hợp, 1080p | Load cold/warm, full rail, 3 hotspots, VI↔EN, contact, Home/End, reverse |
| Firefox desktop | Input, WebGL, audio gesture, lỗi model, focus và panel |
| Safari macOS/iOS trên máy thật | Tải/bộ nhớ, resume, context behavior, viewport động, đổi locale |
| Android tầm trung thật | 5 phút dùng liên tục, thermal/tier, touch, portrait/landscape, fallback |
| Reduced motion + bàn phím | Toàn bộ nội dung, tab order, chi tiết tương đương và CTA |
| JavaScript tắt / WebGL không có | Landing HTML song ngữ, dịch vụ/story/contact, không canvas trống |
| Network lỗi/chậm | Poster/DOM ngay, tải tối thiểu, proxy lỗi trang trí, core fallback, không retry vô hạn |

Ghi model thiết bị, OS, GPU, browser version, build hash, viewport/DPR, tier, network/cache cho từng test. Các tên trên xác định nhóm cần phủ, không khẳng định mọi phiên bản trình duyệt được hỗ trợ vô hạn.

## Truy vết đủ 42 mục master brief

| Mục brief | Nơi thiết kế | Task thực hiện |
|---|---|---|
| 1 Product | PROJECT_VISION, USER_JOURNEY | T02/04/12 |
| 2 Target customer | PROJECT_VISION | T02/09 |
| 3 Visual direction | UX_STORYBOARD, LIGHTING_SPEC | T03/09/11 |
| 4 Lighting story | LIGHTING_SPEC | T11 |
| 5 Experience principle | CAMERA_SCROLL_SPEC | T07–08 |
| 6 Camera system | CAMERA_SCROLL_SPEC | T07–08 |
| 7 Chapters 00–11 | STORY_CHAPTER_SPEC, UX_STORYBOARD | T05/09/12/18–20 |
| 8 Interactive hotspots | HOTSPOT_SPEC | T10 |
| 9 Room information | USER_JOURNEY, HOTSPOT_SPEC | T02/10 |
| 10 Audio | AUDIO_SPEC | T13 |
| 11 Internationalization | I18N_SPEC | T02–03 |
| 12 Tech stack | TECH_DECISIONS, SCENE_ARCHITECTURE | T01/06/08 |
| 13 Scroll architecture | CAMERA_SCROLL_SPEC | T08 |
| 14 Reduced motion | ACCESSIBILITY_SPEC | T02/15 |
| 15 Mobile | PERFORMANCE_BUDGET, ACCESSIBILITY_SPEC | T14–15 |
| 16 Fallback | SCENE_ARCHITECTURE, USER_JOURNEY | T06/15 |
| 17 SEO | SEO_SPEC | T16 |
| 18 Lead conversion | PROJECT_VISION, USER_JOURNEY | T04/12/16 |
| 19 Performance targets | PERFORMANCE_BUDGET | T14 |
| 20 Asset budget/licenses | ASSET_PIPELINE, ASSET_LICENSES | T06/09/13/17 |
| 21 Asset strategy | ASSET_PIPELINE, SCENE_ARCHITECTURE | T06/09 |
| 22 Model pipeline | ASSET_PIPELINE | T06/14 |
| 23 Phase 1 | IMPLEMENTATION_PLAN, integration spec | T01–17 |
| 24 Phase 2 | STORY_CHAPTER_SPEC, IMPLEMENTATION_PLAN | T18–20 |
| 25 Data driven story | STORY_CHAPTER_SPEC, integration spec | T05/07/08 |
| 26 UI system | UX_STORYBOARD, ACCESSIBILITY_SPEC | T03/10/12 |
| 27 Loading | USER_JOURNEY, PERFORMANCE_BUDGET | T06/15 |
| 28 Hotspot UX | HOTSPOT_SPEC | T10 |
| 29 Architectural detailing | UX_STORYBOARD, LIGHTING_SPEC | T09/11/12 |
| 30 Environmental motion | LIGHTING_SPEC | T11 |
| 31 Source structure | integration spec | T01–17 |
| 32 Documents first | README index và toàn bộ docs | Đợt lập kế hoạch này; cập nhật theo triển khai |
| 33 Milestones | IMPLEMENTATION_PLAN, TASKS | A–M / T01–20 |
| 34 Analytics events | ANALYTICS_SPEC | T16 |
| 35 Optional form | PROJECT_VISION, TECH_DECISIONS | Ngoài Phase 1; giữ contact config để mở rộng, chưa xây backend |
| 36 Code quality | integration spec, detailed plan | T01/05–08/17 |
| 37 Error handling | SCENE_ARCHITECTURE, AUDIO_SPEC | T06/13/15 |
| 38 Testing | ACCEPTANCE_CRITERIA, detailed plan | T01–17 |
| 39 Acceptance | Bảng AC01–18 bên trên | G4 |
| 40 Creative standard | PROJECT_VISION, UX_STORYBOARD | Review G0/G1/G2/G4 |
| 41 Implementation behavior | IMPLEMENTATION_PLAN phạm vi | Áp dụng khi chuyển sang xây dựng, chưa thực hiện trong lượt lập kế hoạch |
| 42 First execution task | detailed plan T01–17 | Thư mục đã kiểm tra trống; scaffold nằm trong bước triển khai |

## Hồ sơ đóng nghiệm thu

Mỗi mục ghi trạng thái `pass`, `fail`, `chưa kiểm chứng` hoặc `được thay đổi phạm vi`, kèm link evidence và người kiểm. Thiếu thông tin thương hiệu, thiết bị hoặc domain không được biến thành kết quả pass. Bản release phải có đường quay lại build trước, checklist contacts/asset và hướng dẫn bảo trì.
