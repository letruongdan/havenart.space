# HavenArt — Kết quả rà soát kế hoạch nhiều agent

Ngày 28/09/2026. Phạm vi: tài liệu phân việc, giao diện, review và điều phối; **không phải nghiệm thu ứng dụng**. Workspace chưa có Git hoặc mã ứng dụng, do đó không tạo base/head SHA giả.

## Trạng thái đã hoàn thành

- 36 gói Wxx, gồm 30 Phase 1 và 6 Phase 2; mỗi gói có card, dependencies, write set, input/output, local acceptance, kiểm chứng và tier thực hiện/review.
- Phase 2 được đánh dấu không dispatchable đến khi bổ sung contract/topology sau Phase 1; không tuyên bố các gói phòng đã đủ mọi chi tiết để giao ngay.
- Có AGENTS.md, CONTRACTS v1.1, quy trình single-writer/worktrees, mẫu packet, rubric review và thao tác tích hợp theo candidate cố định.
- Tất cả gói vẫn `planned`; không có task ứng dụng nào đã hoàn thành chỉ vì đã có card.

## Kiểm tra tự động thực sự đã chạy

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| `node docs/agents/validate-plan.mjs` | Exit 0; 36 gói, DAG không vòng, mọi input/card tồn tại; 14 cặp ghi chung file đều có thứ tự dependency | Không chứng minh semantics module hoặc actual runtime locks |
| `node docs/agents/validate-plan.mjs --self-test` | Exit 0; phát hiện đủ 9 mutation: cycle, dependency thiếu, write overlap, path vượt phạm vi, reviewer yếu, trạng thái hoàn thành giả, version lệch, ID trùng, mở Phase 2 sớm | Kiểm chính công cụ kế hoạch, không test ứng dụng |
| Kiểm local Markdown links | Không có đích nội bộ bị hỏng tại thời điểm rà soát | Không xác minh website nguồn bên ngoài |
| Card generation | 36 cards và TASK_BOARD sinh từ một manifest; reviewer đối chiếu khớp | Sau khi đổi manifest phải regenerate |

Manifest đã review: `docs/agents/work-packages.json`.

SHA-256: `E05ACE1012D9B94FBF29A16A95716E450083152659BF4C2A4E9FFFAD808A3841`.

## Rà soát độc lập và sửa lỗi

Một agent audit độc lập (gpt-6-sol, high) tìm các rủi ro trong bản T01–T20 cũ: type chung ghi đồng thời, validator đòi registry chưa tồn tại, chưa rõ owner nối runtime vào route, fallback quá muộn, garden hotspot trước garden, E2E static server chưa khóa, locale restore thiếu hợp đồng, contact DOM trùng và scaffold/lock ownership chưa rõ. Các vấn đề được chuyển thành W02/W11/W13/W24 cùng quy tắc ownership và integration tasks.

Reviewer mạnh hơn độc lập (gpt-6-astra, high) review toàn bộ bộ điều phối, sau đó hai lần scoped re-review. Kết quả ban đầu fail là có chủ đích giữ nguyên trong lịch sử này; không coi việc model mạnh tham gia là tự động pass.

| Finding | Sửa trong kế hoạch | Kết quả review lại |
|---|---|---|
| G1/W13 yêu cầu registry implementation của các task downstream, tạo vòng chờ ngữ nghĩa | Tách `definition-only` W04/W13 với `runtime-resources` W25; owner/script/test rõ, release chạy lại | Đã đóng |
| W20 chưa có quyền tạo audio samples nên không thể hoàn tất output | Cấp ba file outdoor/interior/garden.ogg; yêu cầu nguồn, license, decode, loop, bytes, checksum; W25 sở hữu sổ license | Đã đóng |
| Local acceptance W20 chứa việc W25 nhập sổ, tạo vòng chờ mới | W20 local chỉ kiểm provenance report; nhập sổ chuyển thành integration obligation trước integration W25 | Đã đóng |

Verdict cuối của reviewer: **Spec PASS; Quality PASS trong phạm vi bộ kế hoạch**. Không còn P1 trong phần đã review. Các nhận xét chi tiết được đối chiếu theo file/line hiện có trong card; dòng có thể đổi khi regenerate.

## Điều vẫn phải kiểm khi thực hiện

Chưa có bằng chứng chạy nhiều agent viết mã trên worktree, kết quả typecheck/build/unit/E2E của HavenArt, review hình ảnh hoặc benchmark thiết bị thật. Chưa có Git, contacts/domain thật hoặc tài sản được nhập. Worktree locks, protected-file diff checks, exact-SHA review và serialized integration là trách nhiệm thực thi của integrator; công cụ validate-plan không tự cưỡng chế filesystem.

Kế hoạch giảm rủi ro qua các cổng kiểm chứng; không bảo đảm không phát sinh lỗi. Sau mỗi thay đổi hợp đồng hoặc scope, cập nhật manifest/card và review lại phần bị ảnh hưởng. Thiếu evidence giữ trạng thái chưa kiểm chứng, không chuyển thành pass.
