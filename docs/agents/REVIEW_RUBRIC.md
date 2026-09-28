# HavenArt — Rubric review task và tích hợp

Tài liệu vận hành cho giai đoạn **triển khai sau khi kế hoạch được chấp thuận**. Hiện workspace mới có tài liệu: không có code, Git diff, test hay số đo để đánh dấu pass. Nguồn chuẩn: [đặc tả tích hợp](../superpowers/specs/2026-09-27-havenart-design.md), [kế hoạch task](../superpowers/plans/2026-09-27-havenart-phase-1.md), [tiêu chí nghiệm thu](../ACCEPTANCE_CRITERIA.md), [ngân sách hiệu năng](../PERFORMANCE_BUDGET.md), [gate G0–G4](../IMPLEMENTATION_PLAN.md). Task brief xác định phạm vi cụ thể; đặc tả và tiêu chí toàn dự án vẫn ràng buộc task.

## Vai trò và thời điểm

- **Implementer** thực hiện một task đã giao, chạy kiểm tra liên quan và nộp báo cáo. **Reviewer** chỉ đọc/kiểm chứng; không sửa chính lỗi mình tìm ra, không thay index/HEAD/branch. **Integrator** là người duy nhất đưa task đã qua review vào nhánh tích hợp, giải quyết xung đột và review lại candidate sau tích hợp. Một người/agent có thể đổi vai giữa các task nhưng không tự duyệt phần mình vừa viết.
- Phân tier theo **năng lực phù hợp**: `L` cho thay đổi hẹp, ít phụ thuộc; `M` cho triển khai đa file/hợp đồng; `H` cho rủi ro kiến trúc, camera, hiệu năng, bảo mật dữ liệu hoặc quyết định gate. Đây không phải bảng xếp hạng giá cố định. Chọn reviewer có khả năng **mạnh hơn implementer đối với phạm vi đang xét**; nếu implementer tier H, dùng reviewer H độc lập với ngữ cảnh mới và/hoặc người có chuyên môn tương ứng. Không hạ chuẩn khi thiếu tier phù hợp.
- Review bắt đầu **sau** báo cáo implementer và sau khi có candidate đóng băng (`BASE_SHA`, `HEAD_SHA` hoặc snapshot tương đương). Reviewer nhận task brief, ràng buộc toàn cục, báo cáo, diff và bằng chứng; mở ngữ cảnh mới, không nhận tóm tắt tự chấm của implementer làm kết luận. Mọi sửa đổi tạo candidate mới và cần review lại phần đổi cùng tác động liên quan.
- Reviewer trả **hai verdict độc lập**: `spec` (đúng/đủ phạm vi) và `quality` (đúng chức năng, test, cấu trúc, lỗi và khả năng bảo trì). Thẩm mỹ/kiến trúc có review hình ảnh riêng; pass code không tự động pass mỹ thuật. Không cộng điểm trung bình để bù lỗi chặn.

## Gói review và quy tắc bằng chứng

1. Integrator đóng gói task ID, brief và AC liên quan, ràng buộc áp dụng, phạm vi file dự kiến, `BASE_SHA..HEAD_SHA`, commit list, stat, **full diff có context**, báo cáo implementer và đường dẫn artifact. Nếu chưa có Git khi lập kế hoạch, trạng thái là `blocked-not-evaluated`; đừng tạo SHA hay kết quả giả. Khi triển khai bắt đầu, khởi tạo Git theo kế hoạch rồi dùng SHA thực.
2. Reviewer đọc toàn diff và rà từng file/đầu ra nêu trong brief để phát hiện **thiếu, thừa, hiểu sai**. Đối chiếu logic/test trong diff; kiểm thêm caller, shared state, config, asset manifest hoặc phụ thuộc bị ảnh hưởng **chỉ khi có rủi ro cụ thể**, ghi rõ rủi ro và nơi đã xem. Diff bị cắt, thiếu file hoặc khác HEAD đang chạy là lỗ bằng chứng; yêu cầu gói đầy đủ trước verdict.
3. Mỗi phát hiện ghi `file:line` ở candidate, hành vi tái hiện/điều kiện, tác động, yêu cầu hoặc AC bị vi phạm và cách sửa/kiểm chứng. Nếu evidence nằm ngoài diff (video, HAR, ảnh, thiết bị), trỏ đường dẫn, build hash, điều kiện đo và người kiểm. Báo cáo implementer là **claim**; chỉ output/log/artifact kiểm được mới là bằng chứng.
4. Ghi lệnh thực đã chạy, môi trường và **exit code/output thực**. Test không chạy ghi `not-run` cùng lý do; không viết “pass” từ tên test, suy đoán, log bị cắt hoặc lời báo miệng. Nếu bằng chứng thất lạc, tìm lại đúng artifact trước; nếu vẫn thiếu thì `blocked-not-evaluated` cho mục đó. Reviewer chỉ chạy test tập trung khi diff nêu nghi vấn chưa có chứng cứ; integrator chạy bộ kiểm tra tích hợp bắt buộc.
5. Ghi rõ scope kiểm được. `blocked-not-evaluated` dành cho thiếu tool/thiết bị, thiếu dữ liệu chủ dự án, diff thiếu hoặc môi trường không chạy được; **không** đổi thành pass và không đánh đồng với fail code. Một lỗi quan sát được là `fail` dù còn mục chưa kiểm. Mục bị chặn có owner, thao tác cần làm, thời điểm phải giải quyết.

## Mức độ và điều kiện đóng task

| Mức | Tác động thực tế | Quyết định |
|---|---|---|
| **P0** | Lộ dữ liệu nhạy cảm, thao tác phá hủy hoặc lỗ bảo mật nghiêm trọng đang gây ảnh hưởng trực tiếp | Chặn ngay; xử lý trước mọi gate liên quan |
| **P1** | Vi phạm AC/task quan trọng, lỗi lặp ổn định, a11y cốt lõi hỏng, fallback không hoạt động, test vô nghĩa che lỗi, regression hợp đồng chung hoặc vượt budget chưa có quyết định xử lý | Chặn task/tích hợp |
| **P2** | Lỗi giới hạn, không phá luồng chính; tác động có thể kiểm soát và có cách khắc phục rõ | Có thể để mở **chỉ** khi integrator ghi owner, hạn, phạm vi và chấp nhận rủi ro ở gate tương ứng; không được biến AC chưa đạt thành pass |
| **P3** | Cải thiện trình bày/bảo trì nhỏ, không ảnh hưởng yêu cầu hay luồng sử dụng | Ghi backlog với owner khi cần |

Không hạ P0/P1 vì “task sau sẽ xử lý”, vì test chưa chạy hay vì tổng điểm đẹp. **Integrated** cần 100% local acceptance có evidence đạt, spec/quality pass trên phạm vi local, không P0/P1 và kiểm tra nối module trên candidate. **Accepted** cần thêm toàn bộ `integrationChecks` đã khai báo có bằng chứng ở owner downstream. Tách hai mức này để provider không bị mắc vòng chờ consumer; không ghi nghĩa vụ visual/device hoãn thành pass. Các P2/P3 còn mở có owner/quyết định rõ. Thay đổi phạm vi sản phẩm cần quyết định của chủ dự án và cập nhật AC/brief trước khi xét lại; sửa cách phân việc kỹ thuật do integrator ghi ruling, không sửa rubric để hợp thức hóa lỗi.

Vòng sửa: gửi finding cụ thể cho **cùng implementer** sửa một hoặc hai lượt đầu, review lại diff mới. Lỗi cùng căn nguyên lặp lại hoặc lỗi liên quan lan rộng thì nâng tier implementer/reviewer và chuyển cho integrator để thiết kế lại phân rã/hợp đồng. Tối đa **5 vòng review–sửa trên một task**; sau đó dừng vòng lặp, chọn redesign, chuyển người thực hiện hoặc đổi phạm vi theo quyết định rõ. Giới hạn vòng không cho phép nhận P0/P1 hay mục chưa kiểm.

## Checklist theo họ công việc

Chọn tất cả họ có trong diff; mỗi dòng là câu hỏi kiểm chứng, không phải tuyên bố đã đạt.

| Họ | Kiểm chứng bắt buộc theo brief/spec |
|---|---|
| Logic thuần, config, schema | Boundary `p=0/1`, chapter tiếp theo tại biên, clamp ngoài `[0,1]`, NaN, gaps/overlap/ID trùng/reference thiếu; cùng `p` cho cùng chapter/pose; fixture thêm chapter/zone không sửa engine API; TypeScript strict, unit test các trường hợp lỗi thật. |
| i18n, DOM, a11y | `/vi` và `/en` xuất HTML đúng `lang`, đủ key/copy/label/error/metadata; no-JS đọc đủ sáu section, dịch vụ và CTA; heading/skip link/focus/keyboard/zoom; locale switch giữ chapter/local progress và focus, không chớp canvas sai ngôn ngữ. |
| Scene, asset, art | 1 unit = 1 m, Y-up, chung origin; shell/cửa có clearance, keyframe exterior/entrance/living/garden/finale và mobile crop theo storyboard; GLB/texture lỗi có proxy/material; manifest/license/attribution cho **mọi file dùng thật**; ghi ảnh, video và người duyệt mỹ thuật. Pixel diff hoặc Lighthouse không thay review tỷ lệ/vật liệu/ánh sáng. |
| Camera, scroll, runtime | Rail qua cửa trước/sau và reverse không cut/xuyên/roll/snap; `p` rendered là nguồn duy nhất cho camera/chapter/light/hotspot/audio; wheel/trackpad/touch/Home/End, jump target và đảo hướng không teleport; giới hạn tốc độ/gia tốc theo world-space, test quanh ±epsilon; resize/unmount/tab hidden/context loss cleanup. |
| Modal, hotspot, locale lifecycle | Đủ `travertine-wall`, `sliding-glass`, `garden-tree`; activation range theo local progress, occlusion và DOM button; modal trap focus/Escape/restore focus, khóa scroll/freeze rendered p rồi reset dt/velocity khi đóng; locale, CTA, route/tier đổi không kích hoạt restore cũ hoặc nhân listener. |
| Audio | Zero fetch/play trước opt-in; bật bằng thao tác rõ ràng, gain blend theo rendered p khi tới/lùi; tab ẩn suspend, trở lại có điều kiện; lỗi chuyển mute, cleanup context/listener, nội dung vẫn hiểu được khi tắt. Kiểm nghe trên thiết bị phù hợp khi gate yêu cầu. |
| Performance, mobile, fallback | Core 3D nén ≤8 MB, initial scene assets ≤15 MB; poster mobile ≤250 KB, font ban đầu ≤160 KB, audio startup 0 byte; high ≤200 draw calls/≤1,2M visible triangles, low ≤80/≤250k, DPR/pixel/residency theo [budget](../PERFORMANCE_BUDGET.md). Ghi raw/wire/decoded riêng, peak khi swap và sau ba vòng; production build trên thiết bị thật: desktop high median ≤16,7 ms/p95 ≤25 ms, mobile low median ≤33,3 ms/p95 ≤45 ms. Thử giảm tier, reduced motion không import WebGL, static đủ nội dung và CTA. Headless chỉ chứng minh hành vi, **không chứng minh 60 FPS hoặc nhiệt/bộ nhớ máy thật**. |
| Contact, SEO, analytics | Link Zalo/Messenger/WhatsApp HTTPS/host/account được xác minh; null preview không tạo link giả và chặn release đủ brief. Canonical/hreflang/sitemap/robots/OG đúng origin và môi trường, không bịa schema/rating. Đủ 10 event, allowlist payload, dedupe đúng, no-op mặc định, không PII/request bên thứ ba; lỗi analytics không chặn CTA. |

## Review tích hợp và gate

Task pass chỉ cho phép **integrator** merge/đưa vào nhánh tích hợp; implementer và reviewer không merge. Mỗi lần tích hợp tạo **candidate chính xác** (SHA/build hash), review delta vừa ghép và các seam bị ảnh hưởng; tại G1/G2/G3/G4 review diff tích lũy từ gate trước, toàn branch chỉ ở W30. Kiểm contracts/IDs, config–renderer, raw/rendered progress, zone/refcount, static–cinematic, locale–modal–audio và contact/SEO/events theo rủi ro thực của delta. Chạy typecheck, lint, unit, static production build và E2E liên quan trên candidate; sửa sau review tạo candidate mới. Không lấy kết quả branch task/dev server thay candidate. Lưu evidence theo packet/ledger, tổng hợp ở `docs/reports/ACCEPTANCE.md` và performance report khi tới G3/G4.

| Gate | Bằng chứng tối thiểu để xét pass |
|---|---|
| **G0** | Chủ dự án/đầu mối xác nhận phạm vi, concept mặt bằng/rail, sáu frame, nguồn copy, hợp đồng data và quyền asset; các quyết định còn mở có owner. Kế hoạch hiện có là đề xuất, chưa là G0 pass. |
| **G1** | Candidate T05–T08 có video blockout đi qua cửa và quay lại; clearance near-plane, rail continuity, wheel/trackpad/touch/Home/End/đảo hướng, không cut hay xuyên tường; test sampler/runtime pass. |
| **G2** | Candidate đến garden/finale; ba hotspot và nội dung VI/EN/static/contact preview hoạt động; ảnh/video toàn tuyến và review kiến trúc, typography, contrast, nhịp kể chuyện theo storyboard. |
| **G3** | Candidate chịu mạng chậm/lỗi GLB/texture/context, reduced motion/keyboard/mobile; báo cáo payload/frame-time/memory trên thiết bị thật theo ma trận budget, gồm điều kiện và khoảng chưa đo. Thiếu máy thật thì gate còn `blocked-not-evaluated`. |
| **G4** | 18 AC được đối chiếu từng mục với evidence; P0/P1 đóng; ba contact URL/domain/nội dung thật được xác minh hoặc phạm vi điều chỉnh có quyết định; license đủ, SEO/analytics/release validators, production static E2E, runbook/rollback và host thực tế được kiểm. Preview không được gọi production release pass. |

Gate có verdict riêng `pass`, `fail`, `blocked-not-evaluated`; một AC/gate hard-block chưa đạt không được bù bằng thành tích khác. Việc chưa được yêu cầu deploy không ngăn chuẩn bị artifact, nhưng không ghi G4 release pass nếu điều kiện host/domain thực tế chưa kiểm. Ghi rõ phần nào là review chức năng, chất lượng code, review hình ảnh và đo máy thật.

## Mẫu feedback và bản ghi máy đọc được

Feedback ngắn cho mỗi task: `Spec: <verdict> — đủ/thiếu/thừa/hiểu sai (AC, file:line, evidence)`; `Quality: <verdict> — hành vi, test, cấu trúc (file:line, evidence)`; `Strengths: <điểm cụ thể có dẫn chứng>`; `Findings: <P0–P3, impact, reproduction, fix, owner>`; `Unknown: <điều chưa kiểm, vì sao, người/thiết bị/lệnh cần>`; `Checks: <lệnh, exit code, output/artifact>`; `Next: <sửa, redesign, tích hợp hoặc chờ bằng chứng>`. Không ghi nhận xét trống kiểu “looks good”.

```json
{
  "taskId": "T08",
  "candidate": {"base": "<BASE_SHA thực>", "head": "<HEAD_SHA thực>", "buildHash": null},
  "reviewer": {"id": "<người/agent độc lập>", "tier": "H"},
  "verdict": {"spec": "blocked-not-evaluated", "quality": "blocked-not-evaluated", "integration": "blocked-not-evaluated"},
  "acceptance": [{"id": "<AC/task criterion>", "status": "not-run", "evidence": null}],
  "findings": [{"severity": "P1", "location": "src/path.ts:42", "impact": "<tác động>", "evidence": "<log/video/test>", "owner": "<owner>"}],
  "checks": [{"command": "<lệnh thực>", "status": "not-run", "exitCode": null, "output": null, "environment": "<môi trường>"}],
  "unknowns": [{"item": "<điều thiếu>", "reason": "<lý do>", "owner": "<owner>", "nextCheck": "<thao tác>"}],
  "visualReview": {"status": "not-run", "artifact": null, "reviewer": null},
  "decision": {"action": "await-evidence", "owner": "<integrator>", "round": 0}
}
```

Giá trị verdict chỉ gồm `pass`, `fail`, `blocked-not-evaluated`; check dùng `pass`, `fail`, `not-run`. JSON trên là **mẫu chưa kiểm**, không phải kết quả T08. Điền `integration` chỉ sau khi có candidate tích hợp; trước đó để `blocked-not-evaluated`. Mọi pass phải có evidence truy được đúng candidate và môi trường.
