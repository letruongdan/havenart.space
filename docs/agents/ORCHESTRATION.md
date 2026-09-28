# HavenArt — Quy trình điều phối agent

Trạng thái 28/09/2026: tài liệu lập kế hoạch; **chưa có Git, mã nguồn, asset hay kết quả test triển khai**. Các trạng thái và cổng dưới đây là quy trình cho đợt xây dựng sau, không phải biên bản đã thực hiện. Nguồn yêu cầu: [đặc tả tích hợp](../superpowers/specs/2026-09-27-havenart-design.md), [kế hoạch chi tiết](../superpowers/plans/2026-09-27-havenart-phase-1.md), [TASKS](../TASKS.md). Khi có xung đột, đặc tả quyết định hành vi sản phẩm; ghi phán quyết và ảnh hưởng vào ledger trước khi sửa task.

## 1. Khởi động phiên triển khai

1. Đọc `work-packages.json`, [CONTRACTS.md](CONTRACTS.md), [TASK_BOARD.md](TASK_BOARD.md) và [REVIEW_RUBRIC.md](REVIEW_RUBRIC.md); so ID, dependency, file ownership và contract version. Task T01–T20 là phạm vi sản phẩm; Wxx trong manifest là gói giao agent, không tự suy rằng một T bằng một W. Không tự đánh dấu gói đã xong vì đã có tài liệu.
2. Trước **bất kỳ thay đổi code nào**, tạo/xác minh Git baseline; ghi SHA, trạng thái working tree và nhánh xuất phát. Nếu chưa có Git, khởi tạo và chụp checkpoint có thể khôi phục cho tài liệu hiện tại. Làm việc trên nhánh sạch, độc lập; không bắt đầu implementation trên `main`/`master`. Nếu có thay đổi chưa commit, nhận diện và bảo toàn chúng, không ghi đè.
3. Khám phá công cụ managed worktree của Codex; ưu tiên tái dùng worktree phù hợp rồi `create_worktree` nếu cần. Chỉ dùng Git worktree thủ công khi công cụ không có hoặc có yêu cầu rõ. Ghi path tuyệt đối, nhánh, base SHA và owner của mỗi checkout. Không chuyển/chạy lệnh ở một checkout theo giả định.
4. Tạo `docs/agents/RUN_LEDGER.md` **khi bắt đầu chạy**, với plan identity, baseline SHA, contract version, ngày, danh sách worktree và bảng preflight. File này là bản đồ hồi phục qua compaction; hiện chưa tạo các dòng trạng thái giả. Bảng preflight có một dòng cho mỗi W về tính nhất quán nội bộ và một dòng cho mỗi cặp W chia sẻ file/giao diện: bên tạo, bên nhận, thứ tự, kết luận.
5. Đọc task gốc một lần và so từng gói W với ràng buộc toàn dự án, acceptance, loại dữ liệu và lệnh test. Nếu phát hiện mâu thuẫn, ghi `Ruling: quyết định — lý do — giá phải trả nếu sai`; sửa manifest/contract dưới quyền integrator và tăng version trước khi dispatch gói bị ảnh hưởng.

## 2. Quyền sở hữu và lịch DAG

Chỉ **một orchestrator/integrator** phân việc, chốt contract, đổi trạng thái, và tích hợp. Worker nhận đúng gói, không tạo agent phụ hoặc tự nhận review. Reviewer độc lập chỉ đọc bản chụp của gói; người viết không tự phê duyệt. Một worker có thể được gọi lại cho vòng sửa nhưng không mở thêm writer trên cùng checkout.

`work-packages.json` là danh sách ID nguyên tử Wxx, dependencies và write set. Một gói là `ready` chỉ khi **mọi dependency `integrated`**, contract version khớp và file owner rõ; `submitted`/`approved` của dependency chưa đủ. Integrator lập lịch topological, ưu tiên đường găng G0→G1→G2→G3→G4; gói có write set hoặc contract giao nhau được xếp nối tiếp. Nếu thay đổi interface làm invalid downstream, rút gói ảnh hưởng về `planned`/`blocked`, cập nhật packet rồi review lại theo SHA mới.

Quy tắc nguyên văn của Superpowers `subagent-driven-development/SKILL.md`: **“Never dispatch multiple implementation subagents in parallel (conflicts).”** Vì thế chế độ mặc định là **một writer trong shared checkout**. Reviewer/agent phân tích chỉ đọc có thể chạy song song, nếu đầu vào đã cố định. HavenArt cho phép chế độ riêng cho nhiều writer **chỉ khi** integrator ghi rõ `isolated mode` trong ledger, mỗi writer ở một managed worktree riêng, write set không giao nhau, mọi dependency đã `integrated`, và cùng contract version. Đây là điều chỉnh có chủ ý cho cách triển khai HavenArt, **không phải** lời khẳng định skill gốc cho phép nhiều implementer song song. Thiếu bất kỳ điều kiện nào thì quay về serial, không bypass bằng branch tên khác hay hứa sẽ xử lý conflict sau.

Trong giới hạn bốn chỗ agent, lịch trần là **root/integrator + tối đa hai writer cô lập + một reviewer**. Đây là trần, không phải mục tiêu lấp đủ chỗ. Reviewer có thể đọc gói hoàn chỉnh trong lúc writer khác làm việc, nhưng không review branch đang tiếp tục thay đổi. Integrator không sửa code thay worker để né review.

| Trạng thái | Ý nghĩa và điều kiện chuyển |
|---|---|
| `planned` | Chưa đủ điều kiện dispatch hoặc chưa so preflight. |
| `ready` | Dependencies `integrated`, packet/owner/contract/base đã chốt. |
| `running` | Writer được giao gói và checkout duy nhất; ledger ghi agent, thời điểm, base SHA. |
| `submitted` | Có report, commit/head SHA, diff và bằng chứng test; chưa qua review. |
| `changes_requested` | Review chỉ ra gap/defect cần sửa; chưa được tích hợp. |
| `approved` | Reviewer độc lập phê chuẩn spec **và** chất lượng trên đúng base/head SHA. |
| `integrated` | Integrator nối thay đổi theo thứ tự, kiểm giao diện và test trên cây tích hợp; ghi integration SHA. |
| `accepted` | Cổng nghiệm thu liên quan có bằng chứng thật và được ghi nhận; có thể muộn hơn `integrated`. |
| `blocked` | Vướng điều kiện cụ thể; ghi lý do, owner, đường gỡ và gói độc lập vẫn chạy. |

Không dùng `DONE` cho một báo cáo worker như trạng thái cuối. Task board là chỉ mục đọc được; ledger lưu diễn biến và SHA; manifest giữ DAG. Khi ba nguồn lệch nhau, dừng dispatch gói liên quan, đối chiếu Git và evidence, sửa bản ghi có lý do. Không xóa lịch sử ledger.

## 3. Packet và lựa chọn năng lực

Mỗi lần dispatch một W, integrator tạo packet ngắn, có đường dẫn tới brief riêng; không dán toàn bộ kế hoạch hay tóm tắt tích lũy. Packet tối thiểu chứa ID/đầu ra, base SHA, checkout/path, write set và danh sách file cấm, contract version, dependency đã `integrated`, interfaces `consumes`/`produces`, acceptance và test cụ thể, dữ liệu/asset được phép dùng, đường dẫn report, quyền commit và cách báo blocker. Giá trị số/chữ ký cụ thể đến từ brief và contract có version, không được tự sửa trong lời nhắn. Worker kiểm tra base SHA trước sửa, thực hiện và tự rà, ghi report gồm file/commit, test command + kết quả, rủi ro và dữ liệu chưa kiểm chứng. Lỗi công cụ hoặc không chạy được test = **unknown**, không ghi pass.

Dùng alias năng lực, rồi chọn model thực có sẵn lúc dispatch; không gắn giá hoặc tên model chưa kiểm tra:

| Alias | Giao việc phù hợp |
|---|---|
| `L` | Chép code hoàn chỉnh trong brief, sửa cơ học 1–2 file, ít quyết định. |
| `M` | Triển khai từ mô tả, nội dung/HTML, tích hợp nhiều file, debug thường. **M là mức sàn reviewer.** |
| `H` | Contract/schema, camera/rail, cache và vòng đời GPU, hiệu năng, xung đột kiến trúc, final whole-branch review. Reviewer gói rủi ro cao dùng H. |

Không hạ reviewer xuống L chỉ để tiết kiệm. Vòng sửa 4–5 dùng implementer mới với mức cao hơn người đang kẹt. Batch nhiều sửa cùng dạng, độc lập và nhỏ vào một packet nếu vẫn có một write set và một bề mặt review rõ. Mọi lựa chọn năng lực và đổi người do blocker được ghi trong ledger.

## 4. Biên file và đổi contract

Các đường dẫn bảo vệ gồm `package.json`, lockfile, routing (`src/app/**`), `src/types/**`, `src/stores/**`, cấu hình chia sẻ (`src/config/**`), và các interface lõi như schema story, runtime progress, camera, loader/cache. **Chỉ integrator hoặc owner được integrator gán rõ trong packet** được sửa file bảo vệ; owner chỉ được sửa phần nằm trong write set của gói. Worker khác gửi đề nghị đổi với lý do, chữ ký trước/sau, consumers bị ảnh hưởng và test cần đổi; không tự sửa file ngoài phạm vi. Integrator xử lý thành gói contract riêng hoặc điều chỉnh owner/manifest, tăng version, thông báo các gói phụ thuộc và yêu cầu cập nhật packet trước khi tiếp tục.

Một interface có một nguồn chuẩn trong [CONTRACTS.md](CONTRACTS.md); ví dụ mọi hệ nhận cùng `renderedStoryProgress`, `sampleRail` là pure, `zoneManager` sở hữu cache/refcount, locale và hotspot ID được validate. Không tạo API thứ hai vì worktree cách ly. Hành vi, giá trị, ID và performance target từ đặc tả vẫn là authority; contract là biên giao việc. Nếu contract sai đặc tả, ghi ruling rồi sửa contract trước code phụ thuộc.

## 5. Review, sửa và tích hợp

1. Integrator khóa `baseSHA` và `headSHA` lúc worker nộp. Tạo review package gồm brief, contract version, report, commit list/stat và **full diff base..head**; không dùng `HEAD~1` vì một gói có thể có nhiều commit. Reviewer chỉ đọc package và mã ở đúng SHA, trả hai verdict riêng: tuân spec và chất lượng. Dùng [rubric](REVIEW_RUBRIC.md), nêu file/dòng/bằng chứng, mức độ và giới hạn không thể xác minh. Worker self-review không thay thế review độc lập.
2. Gap spec, Critical/Important hoặc mục `cannot verify` được integrator xác nhận là gap đi vào fix loop. Minor được ghi ledger để final review xem lại. Nếu finding va với kế hoạch, integrator phán quyết theo spec và ghi giá phải trả; không hướng reviewer bỏ qua trước khi họ xem. Các vòng 1–3 trả cùng worker; vòng 4–5 đổi worker mức cao hơn. Mỗi vòng có fix report, test phủ đúng thay đổi và re-review **diff từ head reviewer trước đến head mới**. Tối đa năm vòng; sau đó phán quyết từng finding có lý do, không bỏ im lặng. Vấn đề còn load-bearing khiến dependent không thể đúng thì giữ `blocked` cho nhánh đó và xử lý điều kiện gốc; không ép `approved`.
3. Integrator tích hợp **từng gói một**, từ SHA đã approved. Trước thao tác kiểm base/head vẫn tồn tại, protected files và contract version không trôi. Áp dụng commit vào nhánh tích hợp, xử lý conflict theo ngữ nghĩa sản phẩm, chạy test giao diện liên quan và smoke tuyến liên quan. Conflict được giải xong vẫn là thay đổi mới: tạo candidate SHA, review lại phần tích hợp đã đổi, không dùng verdict ở branch cũ để tự động thông qua. Ghi integration SHA và test evidence rồi mới đổi `integrated` và mở gói phụ thuộc.
4. Sau toàn bộ Phase 1, tạo review package từ baseline/merge-base đến HEAD của nhánh tích hợp, H reviewer rà toàn tuyến, các Minor/phán quyết đã hoãn và cổng G0–G4. Một đợt sửa chung cho finding cuối, một scoped re-review; kết quả còn lại có phán quyết rõ. `accepted` chỉ khi evidence nghiệm thu phù hợp: build/unit/E2E, ảnh/video tuyến camera, thiết bị thật và báo cáo performance khi được yêu cầu. Chưa có thiết bị, contact thật, asset license hay domain thì ghi `unverified`/`blocked` tương ứng, không tạo pass giả.

## 6. Phục hồi và ranh giới hành động

Sau compaction hoặc lỗi session, đọc ledger, board, manifest và `git log/status` trong từng worktree; xác minh SHA rồi tiếp tục đúng gói/vòng review. Nếu report thiếu, hỏi lại worker hoặc tái tạo từ commit, không đoán trạng thái. Không dùng lệnh phá hủy như `git reset --hard`, `git clean`, xóa worktree bằng shell hoặc ghi đè thay đổi của người khác. Phục hồi bằng commit đảo có review hoặc snapshot/worktree archive có thể khôi phục; kiểm path tuyệt đối trước mọi thao tác Windows. Công cụ managed worktree chịu trách nhiệm archive khi checkout hết dùng.

Blocker chỉ chặn gói và downstream của nó; integrator tiếp tục nhánh DAG độc lập. Khi thiếu context, cung cấp context; khi task quá lớn, tách W; khi thiếu năng lực, nâng alias; khi kế hoạch sai, ghi ruling và cập nhật contract. Chỉ dừng toàn kế hoạch khi mọi đường tiếp tục đều là đoán mò, hoặc hành động tiếp theo là phá hủy/không thể đảo, bảo mật nhạy cảm, hay tác động ngoài workspace cần quyền riêng. Kế hoạch này không cấp quyền mua dịch vụ/asset, push shared branch, merge, publish website hay sửa DNS. Công việc tài liệu và phát triển cục bộ thông thường tiếp tục trong phạm vi đã giao; không hỏi lại chỉ để chuyển gói.
