# HavenArt — Packet giao việc và review

Các trường `{{...}}` dưới đây là biến bắt buộc **integrator điền bằng dữ liệu thật trước dispatch**. Đây là mẫu điều phối, không phải task đã chạy. Không gửi packet còn thiếu SHA/path hoặc chuyển biến thành dữ liệu giả để đủ mẫu.

## 1. Dispatch implementer

```text
Bạn thực hiện {{W_ID}} trong HavenArt, chỉ phạm vi được giao.
Đọc trước {{ABSOLUTE_TASK_CARD_PATH}} và CONTRACTS version {{CONTRACT_VERSION}}.
Checkout duy nhất: {{ABSOLUTE_WORKTREE}}. Base SHA: {{BASE_SHA}}.
Dependencies đã integrated: {{DEPENDENCY_IDS_AND_INTEGRATION_SHAS}}.
Model tier đã chọn: {{TIER_AND_REASON}}.

Write set là danh sách trong card; report ngoài source tại {{ABSOLUTE_REPORT_PATH}}.
Đọc common constraints trong AGENTS/contract và readFiles của card. Không cần đọc
lịch sử chat hoặc toàn bộ kế hoạch. Quyết định bổ sung của integrator: {{RULINGS_OR_NONE}}.

Làm lần lượt: kiểm base/contract; test behavior rủi ro; triển khai; kiểm chứng;
tự đọc diff; commit; viết report. Không mua/deploy/gửi message ra ngoài.
Không sửa file ngoài write set, không đổi contract/lockfile/acceptance để pass.
Không tự spawn reviewer, merge integration branch hoặc nhận task tiếp theo.

Nếu thiếu context/khó vượt năng lực, báo NEEDS_CONTEXT/BLOCKED và vấn đề cụ thể.
Mọi test không chạy hoặc thiếu thiết bị phải ghi not-run. Ghi nghĩa vụ kiểm chứng
downstream riêng; không tuyên bố toàn app đạt từ unit test.

Report: taskId, baseSha, headSha, contractVersion, files changed, acceptance evidence,
commands/exit codes/outputs thực, visual evidence nếu liên quan, unverifiedItems,
openRisks, đề nghị contract changes và asset license records.
Trả lời cuối dưới 15 dòng: SUBMITTED hoặc NEEDS_CONTEXT hoặc BLOCKED;
SHA, test summary, concerns và report path. SUBMITTED chưa phải accepted.
```

## 2. Dispatch reviewer độc lập

```text
Bạn review {{W_ID}}, không phải người triển khai. Model tier {{REVIEW_TIER}}.
Đọc {{CARD_PATH}}, {{CONTRACT_PATH}}, {{IMPLEMENTER_REPORT}}, {{REVIEW_PACKAGE}}.
Candidate khóa: BASE={{BASE_SHA}}, HEAD={{HEAD_SHA}}; contract={{CONTRACT_VERSION}}.
Rubric: docs/agents/REVIEW_RUBRIC.md. Report: {{REVIEW_REPORT_PATH}}.

Read-only trên candidate. Kiểm full diff cùng các dependency/caller mà rủi ro
cụ thể yêu cầu; không tin claim của implementer nếu thiếu evidence. Không sửa code,
không spawn thêm reviewer, không tự merge. Không đổi baseline sang HEAD mới trôi.

Trả hai verdict riêng SPEC và QUALITY: pass/fail/blocked-not-evaluated.
Mỗi finding có severity, requirement, file:line, trigger, impact và cách kiểm chứng.
Đánh giá lỗi trong kế hoạch nếu chính kế hoạch gây defect; không bỏ qua vì tác giả
kế hoạch đã chọn như vậy. Không chạy lại suite đã có evidence đúng SHA vô cớ;
chỉ test focused khi cần giải quyết một nghi vấn, ghi rõ lý do và kết quả.

Phân biệt local criteria với obligations ở downstream; task chỉ được integrated
khi local pass và không có blocking finding; accepted còn cần evidence obligations.
Không đánh giá hình ảnh/FPS bằng tên test hoặc headless runtime.
```

## 3. Gói tích hợp

Integrator ghi `taskBase`, `reviewedHead`, `integrationBase`, `integrationCandidate`, contractVersion, allowed paths, dependency SHAs, hai verdict và unresolved obligations. Apply đúng commit đã review, chạy test hợp đồng và smoke các seam bị ảnh hưởng. Conflict resolution hoặc sửa sau review là code mới cần scoped review trên candidate mới.

Không dùng `HEAD~1` để giới hạn diff của task nhiều commit. Reviewer xem toàn task BASE..HEAD; re-review fix dùng head review trước..head sửa mới, đồng thời đối chiếu finding cũ. Integrator lưu kết quả ở ledger có identity của plan.

## 4. Report tối thiểu

```json
{
  "taskId": "{{W_ID}}",
  "status": "SUBMITTED",
  "baseSha": "{{REAL_BASE_SHA}}",
  "headSha": "{{REAL_HEAD_SHA}}",
  "contractVersion": "havenart-contracts-1.1",
  "changedFiles": [],
  "acceptanceEvidence": [],
  "commandsAndActualResults": [],
  "integrationObligations": [],
  "unverifiedItems": [],
  "openRisks": [],
  "assetRecords": [],
  "reportPath": "{{REAL_REPORT_PATH}}"
}
```

Mảng rỗng là mẫu chưa điền. Trước dispatch review, gói thật phải có file diff, các acceptance và command results; thiếu report không được coi là task không có lỗi.

## 5. Contract change request

Ghi: W đang làm; file/signature trước và sau; lý do không thể giữ contract; consumer IDs bị ảnh hưởng; migration/test; tác động tới FPS/bytes/UX/nội dung; có breaking change hay không. Integrator quyết định, tăng contract version và cập nhật packets/write locks; các agent khác không tự đồng bộ bằng sửa chéo worktree.

## 6. Cách xử lý lỗi nhiều vòng

Round1–3 sửa cùng implementer, reviewer kiểm focused diff. Nếu lỗi cùng gốc lặp lại, thiếu năng lực hoặc task quá lớn, nâng tier/tách task sớm. Round4–5 dùng implementer mới mạnh hơn nếu có; nếu đã H thì đổi người/thu hẹp bài toán, không giả một tier mạnh hơn không tồn tại. Sau5 vòng, giữ blocker có evidence và redesign; không tự thông qua lỗi vì hết số vòng.
