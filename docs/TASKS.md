# HavenArt — Danh sách giao việc

Trạng thái ngày 27/09/2026: đã lập bộ kế hoạch; toàn bộ task xây dựng bên dưới **chưa bắt đầu**. Checkbox chỉ được đổi khi có đầu ra và kiểm chứng. Chi tiết file/interface/lệnh nằm trong [implementation tasks](superpowers/plans/2026-09-27-havenart-phase-1.md).

**Cập nhật 28/09/2026:** T01–T20 dưới đây là nhóm tính năng. Khi giao nhiều agent, dùng [36 gói Wxx và task card](agents/TASK_BOARD.md) cùng [manifest](agents/work-packages.json); không dispatch cả T lẫn W cho cùng đầu ra. Manifest W thay thế thứ tự/phạm vi file cũ để xử lý dependencies, một owner type/store/route và fallback sớm. Yêu cầu sản phẩm và AC không thay đổi. Phase 2 chưa dispatchable trước khi có contract/topology chi tiết sau G4.

## Phase 1

| Trạng thái | ID | Công việc | Phụ thuộc | Mốc | Người chịu trách nhiệm chính |
|---|---|---|---|---|---|
| [ ] | T01 | Nền tảng build, runtime, dependency và test tooling | Kế hoạch | A | Frontend lead |
| [ ] | T02 | /vi, /en, dictionary và HTML hoàn chỉnh | T01 | B | Frontend + nội dung |
| [ ] | T03 | Brand shell, typography, đổi ngôn ngữ | T02 | B | Frontend + thiết kế |
| [ ] | T04 | Config/contact và kiểm tra phát hành | T02–03 | B/H | Frontend + chủ dự án |
| [ ] | T05 | Schema/chapter mapping/validation | T02 | A/C | Frontend lead |
| [ ] | T06 | Villa shell, scene zones, loader/cache | T05 | C | 3D engineer |
| [ ] | T07 | Rail/look-at/quaternion và clearance | T05–06 | D | 3D engineer + kiến trúc sư |
| [ ] | T08 | Native scroll, runtime progress, lifecycle | T03/05/07 | D | 3D/frontend lead |
| [ ] | T09 | Exterior, entrance, living: visual composition | T06–08 | E | 3D + thiết kế |
| [ ] | T10 | Hotspots và panel accessible | T05/08/09 | F | Frontend |
| [ ] | T11 | Ánh sáng và chuyển động môi trường | T05/08/09 | G | 3D |
| [ ] | T12 | Garden/finale, câu chuyện hoàn chỉnh | T04/08/10/11 | H | 3D/frontend |
| [ ] | T13 | Audio opt-in và crossfade | T08/11/12 | I | Frontend |
| [ ] | T14 | Adaptive tier và performance report | T06–13 | J | 3D/frontend + QA |
| [ ] | T15 | Mobile, reduced motion, fallback/recovery | T02–14 | K | Frontend + QA |
| [ ] | T16 | SEO và sự kiện nội bộ | T02/04/08/10/12–15 | L | Frontend |
| [ ] | T17 | QA, asset/license/release checks, runbook | T01–16 | L | QA + lead + chủ dự án |

Các vai trò có thể do cùng một người đảm nhiệm. Đây là ownership trách nhiệm, không ngầm giả định đã có một đội nhiều người. Reduced motion/SEO/performance được thiết kế từ đầu; T14–T16 là hoàn thiện và nghiệm thu, không phải lần đầu nghĩ tới chúng.

## Phase 2

- [ ] **T18:** Kitchen + courtyard; sau G4, bổ sung data/zone/rail/poster và kiểm lại ngân sách.
- [ ] **T19:** Bedroom + bathroom; sau T18, giữ topology thực và câu chuyện ánh sáng toàn site.
- [ ] **T20:** Workspace + balcony; sau T19, hoàn tất 12 chương, quay lại garden/finale liên tục và regression toàn tuyến.

## Cách quản lý task

1. Trước làm: đọc spec, kiểm tra dependencies đã đạt, nhận đúng phạm vi file.
2. Trong làm: mỗi thay đổi một mục đích; test logic rủi ro trước khi triển khai; hình ảnh review theo frame/storyboard.
3. Khi xong: ghi commit, bằng chứng, thiết bị/build nếu có; cập nhật rủi ro và việc tiếp theo.
4. Không dùng “done” cho mục bị thiếu dữ liệu thật, thiếu thiết bị hoặc chỉ được mô tả trong tài liệu.
5. Nếu scope đổi, cập nhật brief mapping và ngày công còn lại; không lặng lẽ thêm phòng vào Phase 1.

## Các cổng review

- [ ] **G0:** Chốt phạm vi, mặt bằng/rail concept và hợp đồng dữ liệu — trước đồ họa đáng kể.
- [ ] **G1:** Camera qua cửa, tới/lùi/nhảy cuộn không cut — kết T08.
- [ ] **G2:** Chuyến đi Phase 1 hoàn chỉnh và ba hotspots — kết T12.
- [ ] **G3:** Performance, mobile, reduced motion và lỗi tải — kết T15.
- [ ] **G4:** Liên hệ thật, license, SEO/analytics, QA và runbook — kết T17.

Người dùng không cần trả lời thêm để sử dụng bộ kế hoạch. Các review trên là điểm kiểm soát của dự án khi thực hiện, không phải yêu cầu phê duyệt bắt buộc cho từng thay đổi nhỏ trong lần lập kế hoạch này.
