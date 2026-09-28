# HavenArt — Bảng giao việc nhiều agent

Cập nhật 28/09/2026. **36 gói: 30 Phase 1 và 6 Phase 2. Tất cả planned, chưa viết ứng dụng.** T01–T20 được giữ làm nhóm tính năng; Wxx là đơn vị dispatch. Phase 2 có card định hướng nhưng bị khóa dispatch cho đến khi có contract và topology chi tiết sau Phase 1.

Nguồn máy đọc: [work-packages.json](work-packages.json). Phiếu giao việc bên dưới sinh từ manifest. Quy trình ở [ORCHESTRATION](ORCHESTRATION.md), hợp đồng ở [CONTRACTS](CONTRACTS.md), chấm review ở [REVIEW_RUBRIC](REVIEW_RUBRIC.md), mẫu packet ở [PROMPTS](PROMPTS.md).

L/M/H là năng lực tương đối: L chỉ nhận task cơ học có code/test đầy đủ, M triển khai mô tả nhiều file, H quyết định kiến trúc/rủi ro tích hợp. Reviewer tối thiểu M, các task M phần lớn được H kiểm. Không mặc định mọi module phù hợp model rẻ nhất.

| Gói | Đầu ra | Dependencies integrated | Làm / Review | Số file được sửa | Trạng thái |
|---|---|---|---|---:|---|
| [W01](tasks/W01.md) | Nền tảng và môi trường kiểm tra tái lập | — | H / H | 14 | planned |
| [W02](tasks/W02.md) | Khóa hợp đồng dữ liệu và fixtures dùng chung | W01 | H / H | 10 | planned |
| [W03](tasks/W03.md) | Nội dung VI/EN và dictionary loader | W02 | M / H | 6 | planned |
| [W04](tasks/W04.md) | Chapter sampler và validator thuần | W02 | M / H | 3 | planned |
| [W05](tasks/W05.md) | Contact config và URL validation | W02 | M / H | 4 | planned |
| [W06](tasks/W06.md) | Trang HTML locale và bố cục semantic | W03, W04, W05 | M / H | 5 | planned |
| [W07](tasks/W07.md) | Design tokens và brand shell | W03 | M / H | 3 | planned |
| [W08](tasks/W08.md) | Spline rail, quaternion và clearance | W02 | H / H | 4 | planned |
| [W09](tasks/W09.md) | Asset registry và zone streaming | W02 | H / H | 4 | planned |
| [W10](tasks/W10.md) | Villa shell và proxy có đường thông | W02 | M / H | 3 | planned |
| [W11](tasks/W11.md) | Canvas boundary và mode gate từ đầu | W06, W09, W10 | H / H | 5 | planned |
| [W12](tasks/W12.md) | Progress runtime, lifecycle và store | W04, W08 | H / H | 7 | planned |
| [W13](tasks/W13.md) | Tích hợp nền và camera — G1 | W06, W07, W08, W09, W10, W11, W12 | H / H | 7 | planned |
| [W14](tasks/W14.md) | Ngoại thất và entrance chi tiết | W13 | M / H | 3 | planned |
| [W15](tasks/W15.md) | Living và vật liệu điểm nhấn | W13 | M / H | 3 | planned |
| [W16](tasks/W16.md) | Predicate hiển thị hotspot | W02 | L / M | 2 | planned |
| [W17](tasks/W17.md) | Hotspot DOM, projection và modal | W03, W12, W13, W16 | M / H | 6 | planned |
| [W18](tasks/W18.md) | Lighting track và môi trường | W02, W13 | M / H | 5 | planned |
| [W19](tasks/W19.md) | Garden detail và finale component | W03, W13 | M / H | 3 | planned |
| [W20](tasks/W20.md) | Audio controller opt-in | W02, W12 | M / H | 6 | planned |
| [W21](tasks/W21.md) | Adaptive quality policy và monitor | W02, W12 | M / H | 4 | planned |
| [W22](tasks/W22.md) | Event abstraction và dedupe thuần | W02 | M / H | 2 | planned |
| [W23](tasks/W23.md) | Metadata, sitemap và robots | W03, W05, W06 | M / H | 4 | planned |
| [W24](tasks/W24.md) | Locale restoration và history lifecycle | W03, W12, W13 | H / H | 4 | planned |
| [W25](tasks/W25.md) | Ghép toàn hành trình và poster — G2 | W14, W15, W17, W18, W19, W20, W21, W24 | H / H | 27 | planned |
| [W26](tasks/W26.md) | Đo tải, GPU và sửa theo ngân sách | W25 | H / H | 3 | planned |
| [W27](tasks/W27.md) | Fault matrix, mobile và accessibility — G3 | W25, W26 | M / H | 4 | planned |
| [W28](tasks/W28.md) | Ghép SEO và sự kiện vào UI thật | W22, W23, W25 | H / H | 6 | planned |
| [W29](tasks/W29.md) | Kiểm asset/release và bàn giao | W27, W28 | M / H | 6 | planned |
| [W30](tasks/W30.md) | Review toàn hệ thống và nghiệm thu G4 | W26, W27, W28, W29 | H / H | 3 | planned |
| [W31](tasks/W31.md) | Phase 2 — Kitchen | W30 | M / H | 2 | planned |
| [W32](tasks/W32.md) | Phase 2 — Courtyard | W31 | M / H | 2 | planned |
| [W33](tasks/W33.md) | Phase 2 — Bedroom | W32 | M / H | 2 | planned |
| [W34](tasks/W34.md) | Phase 2 — Bathroom | W33 | M / H | 2 | planned |
| [W35](tasks/W35.md) | Phase 2 — Workspace | W34 | M / H | 2 | planned |
| [W36](tasks/W36.md) | Phase 2 — Balcony | W35 | M / H | 2 | planned |

## Lịch phối hợp đề xuất

1. W01 rồi W02 đi tuần tự để khóa toolchain và interfaces.
2. Sau W02, có thể chọn các cặp độc lập như W03 + W04 hoặc W08 + W09; W05/W10/W16/W22 là các nhánh khác. Chỉ tối đa hai writer nếu có worktrees cô lập và một reviewer; danh sách sẵn sàng không phải lệnh chạy tất cả cùng lúc.
3. W06/W07/W12/W11 nối theo dependencies cụ thể; W13 là điểm tích hợp G1, writer duy nhất.
4. Sau W13, có thể chạy W14 + W15, rồi W17 + W18 hoặc W19 + W24 trong worktrees khác nhau. W20/W21/W23 có thể chuẩn bị khi dependencies của chính chúng xong.
5. W25 tích hợp toàn hành trình G2; W26 đo hiệu năng và W28 nối SEO/events có thể được chuẩn bị tách biệt, nhưng mọi bằng chứng cuối phải gắn candidate đã tích hợp cả hai.
6. W27 kiểm lỗi/mobile/a11y; W29 bàn giao; W30 reviewer H đánh giá toàn hệ thống G4. Các lỗi mới mở scoped fix packet đúng owner, không cho test agent sửa mọi module.
7. W31–W36 vẫn tuần tự mặc định; trước mỗi phòng, integrator chốt phần data/rail/copy cần đổi và write set cụ thể. Không dispatch chỉ từ title một phòng.

Không sửa type/store/route/lockfile bằng nhiều agent cùng lúc. Reviewer đọc snapshot khóa SHA; integrator merge từng gói và chạy kiểm tra seams. Git không báo conflict không chứng minh hệ thống đúng.

## Công cụ kiểm kế hoạch

`node docs/agents/validate-plan.mjs` kiểm DAG, ID, file quyền sửa, reviewer tier, contract và links input. `node docs/agents/validate-plan.mjs --self-test` kiểm khả năng phát hiện chín lỗi chủ động. `node docs/agents/render-task-cards.mjs` cập nhật card và bảng này từ manifest.

Các lệnh trên **không triển khai agent, không build website, không chứng minh visual/FPS hoặc chặn filesystem runtime**. Khi thực hiện, integrator còn phải kiểm diff thực nằm trong write set và hợp đồng trên đúng base/head SHA.
