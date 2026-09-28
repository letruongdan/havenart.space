# HavenArt — Hồ sơ kế hoạch

HavenArt — **Kiến tạo nơi bạn thuộc về.**

Đây là bộ tài liệu lập ngày 27/09/2026 từ master brief, theo yêu cầu lập kế hoạch và phương pháp Superpowers. Chưa có ứng dụng chạy, dependency, tài sản 3D hoặc kết quả test thực tế.

## Đọc trước

- [Bảng giao việc nhiều agent — cập nhật 28/09](docs/agents/TASK_BOARD.md): 30 gói Phase 1, 6 gói Phase 2 và phiếu giao việc riêng.
- [Quy trình điều phối và tích hợp](docs/agents/ORCHESTRATION.md), [hợp đồng chung](docs/agents/CONTRACTS.md), [tiêu chí reviewer mạnh hơn](docs/agents/REVIEW_RUBRIC.md).
- [Kết quả kiểm tra và review độc lập bộ kế hoạch](docs/agents/PLAN_AUDIT.md).
- [Kế hoạch tổng thể, mốc A–M và ước lượng](docs/IMPLEMENTATION_PLAN.md)
- [Checklist giao việc](docs/TASKS.md)
- [Các task kỹ thuật và cách kiểm tra](docs/superpowers/plans/2026-09-27-havenart-phase-1.md)
- [Đặc tả tích hợp](docs/superpowers/specs/2026-09-27-havenart-design.md)
- [Tiêu chí nghiệm thu và ma trận truy vết](docs/ACCEPTANCE_CRITERIA.md)
- [Quyết định stack và nguồn chính thức](docs/TECH_DECISIONS.md)

## Sản phẩm và trải nghiệm

| Tài liệu | Nội dung |
|---|---|
| [PROJECT_VISION](docs/PROJECT_VISION.md) | Khách hàng, mục tiêu và phạm vi |
| [USER_JOURNEY](docs/USER_JOURNEY.md) | Luồng người dùng và liên hệ |
| [UX_STORYBOARD](docs/UX_STORYBOARD.md) | Từng cảnh, nhịp, chữ và camera |
| [HOTSPOT_SPEC](docs/HOTSPOT_SPEC.md) | Điểm tương tác và panel |
| [ACCESSIBILITY_SPEC](docs/ACCESSIBILITY_SPEC.md) | Keyboard, motion, fallback |
| [I18N_SPEC](docs/I18N_SPEC.md) | VI/EN, routing và dictionaries |

## Kỹ thuật và vận hành

| Tài liệu | Nội dung |
|---|---|
| [SCENE_ARCHITECTURE](docs/SCENE_ARCHITECTURE.md) | Ranh giới module, scene và state |
| [CAMERA_SCROLL_SPEC](docs/CAMERA_SCROLL_SPEC.md) | Camera spline và cuộn tới/lùi |
| [STORY_CHAPTER_SPEC](docs/STORY_CHAPTER_SPEC.md) | Chương và story config |
| [LIGHTING_SPEC](docs/LIGHTING_SPEC.md) | Ánh sáng và chuyển môi trường |
| [AUDIO_SPEC](docs/AUDIO_SPEC.md) | Bật theo chủ ý và crossfade |
| [ASSET_PIPELINE](docs/ASSET_PIPELINE.md) | Asset mô-đun và đường nâng cấp |
| [PERFORMANCE_BUDGET](docs/PERFORMANCE_BUDGET.md) | Ngân sách, tier, thiết bị và đo |
| [SEO_SPEC](docs/SEO_SPEC.md) | HTML, metadata, sitemap |
| [ANALYTICS_SPEC](docs/ANALYTICS_SPEC.md) | Event abstraction phi định danh |
| [RISK_REGISTER](docs/RISK_REGISTER.md) | Rủi ro, người phụ trách, cách xử lý |
| [ASSET_LICENSES](ASSET_LICENSES.md) | Quy tắc và sổ giấy phép tài sản |
| [Master brief gốc](docs/reference/HAVENART_MASTER_BUILD_PROMPT.md) | Bản yêu cầu nguyên văn |

Các đường dẫn `src/`, lệnh npm và test trong kế hoạch chỉ định công việc tương lai. Những con số ngày công và FPS là ước lượng/mục tiêu cần xác minh, không phải cam kết hay bằng chứng đã đạt.
