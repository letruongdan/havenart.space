# HavenArt — Quy tắc cộng tác

## Phạm vi hiện tại

Workspace hiện là bộ kế hoạch, chưa triển khai ứng dụng. Không tự bắt đầu W01 hoặc tạo Git chỉ vì đọc file này. Chỉ thực hiện gói được giao trong yêu cầu hiện tại.

## Nguồn chuẩn

- Yêu cầu người dùng hiện tại ưu tiên cao nhất trong phạm vi hướng dẫn dự án.
- Hành vi sản phẩm: `docs/superpowers/specs/2026-09-27-havenart-design.md` và các đặc tả chuyên đề.
- Hợp đồng module/ownership: `docs/agents/CONTRACTS.md`, version trong packet.
- Phân việc: `docs/agents/work-packages.json` và `docs/agents/tasks/Wxx.md`. T01–T20 là nhóm tính năng, không dispatch thêm một T song song với W của nó.
- Review: `docs/agents/REVIEW_RUBRIC.md`. Điều phối: `docs/agents/ORCHESTRATION.md`.
- Nếu nguồn mâu thuẫn, báo integrator; không tự tạo một schema/clock/route khác. Ghi quyết định và cập nhật packet liên quan trước tiếp tục.

## Quyền sửa và tích hợp

Một checkout có tối đa một writer. Chỉ nhiều writer khi có worktree cô lập, write sets không chồng nhau, dependencies đã integrated đúng SHA và integrator đã chọn chế độ đó. Branch khác tên trong cùng checkout không tạo cô lập.

Chỉ sửa file trong `writeFiles` của packet và report path được giao. Việc đọc dependency không cấp quyền sửa. Shared types, routes, config, store, package/lock và license register có owner chỉ định; cần đổi thì gửi yêu cầu kèm impact, không sửa ké.

Không cài dependency hoặc sửa lockfile ngoài task owner; không thêm backend, analytics SDK, paid asset hoặc thông tin doanh nghiệp giả. Không xóa/reset thay đổi của agent khác. Không chạy Git merge/cherry-pick trên integration branch từ worker; integrator là writer duy nhất ở đó.

Agent triển khai không tự tạo reviewer hoặc tự duyệt. Reviewer độc lập chỉ đọc candidate đã khóa, trả cả verdict đúng spec và chất lượng. Self-review không thay review độc lập.

## Bằng chứng

Report phải có base/head SHA thật, file thay đổi, acceptance mapping, lệnh và exit code/output thực, phần chưa kiểm chứng. Không có tool/thiết bị thì ghi `not-run`; không tự viết pass. Các nghĩa vụ kiểm chứng sau tích hợp được ghi riêng, không dùng kết quả unit để khẳng định visual/FPS.

Không sửa acceptance, nới budget hoặc bỏ test chỉ để pass. Fix mới cần review lại theo SHA mới. Không có lỗi Git không đồng nghĩa không có lỗi tích hợp.

## Bàn giao và phục hồi

`submitted` là xong phần của worker; `integrated` là đã qua review và kiểm tra tích hợp cục bộ; `accepted` là mọi nghĩa vụ nghiệm thu của gói đã có evidence. Chỉ integrator đổi ledger/trạng thái; không tự nhận task sau.

Khi mất ngữ cảnh, đọc packet và RUN_LEDGER của đúng plan, đối chiếu Git trước tiếp tục; không chạy lại các gói đã integrated. Không xóa ledger/evidence tự động khi kết thúc.

Lệnh kiểm bộ kế hoạch: `node docs/agents/validate-plan.mjs`. Lệnh này chỉ kiểm kế hoạch; không chứng minh ứng dụng hay chất lượng hình ảnh đã đạt.
