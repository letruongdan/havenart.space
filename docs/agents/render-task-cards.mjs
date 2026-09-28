import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(readFileSync(path.join(root, 'docs/agents/work-packages.json'), 'utf8').replace(/^\uFEFF/, ''));
const tasksDir = path.join(root, 'docs/agents/tasks');
mkdirSync(tasksDir, { recursive: true });
const list = rows => rows.map(row => `- ${row}`).join('\n');
const visibilityExample = '\n## Code và test cho model nhẹ\n\nVisibilityInput do W02 khai báo trong types/runtime; helper không nhân bản type.\n\n```ts\nimport type { VisibilityInput } from "../../types/runtime";\nexport function isHotspotVisible(input: VisibilityInput): boolean {\n  return Number.isFinite(input.distanceM) && Number.isFinite(input.maxDistanceM)\n    && input.distanceM >= 0 && input.maxDistanceM > 0\n    && input.activeRoom === input.room && input.inActivationRange\n    && input.distanceM <= input.maxDistanceM\n    && input.inFrustum && !input.occluded;\n}\n```\n\n```ts\nimport { expect, test } from "vitest";\nimport { isHotspotVisible } from "../../src/lib/story/hotspotVisibility";\nconst valid = {activeRoom:"living",room:"living",distanceM:2,maxDistanceM:3,inFrustum:true,occluded:false,inActivationRange:true};\ntest("all spatial conditions hold", () => {\n  expect(isHotspotVisible(valid)).toBe(true);\n  expect(isHotspotVisible({...valid,distanceM:3})).toBe(true);\n});\ntest.each([\n  {activeRoom:"garden"},{inActivationRange:false},{distanceM:4},\n  {distanceM:NaN},{distanceM:-1},{maxDistanceM:Infinity},{maxDistanceM:0},\n  {inFrustum:false},{occluded:true}\n])("rejects a broken condition %j", patch => expect(isHotspotVisible({...valid,...patch})).toBe(false));\n```\n';

for (const task of manifest.packages) {
  if (!/^W\d{2}$/.test(task.id) || task.packet !== `docs/agents/tasks/${task.id}.md`) throw new Error('Invalid packet target');
  const body = `# ${task.id} — ${task.title}

Sinh từ work-packages.json; sửa manifest rồi chạy render-task-cards.mjs, không sửa riêng file này.
Trạng thái: ${task.status}; chưa có kết quả triển khai. ${task.phase === 2 ? '**Phase 2 chưa dispatchable; phải bổ sung contract/layout/write set tích hợp trước khi giao.**' : ''}

| Thuộc tính | Giá trị |
|---|---|
| Phase / nhóm cũ | ${task.phase} / ${task.legacyTasks.join(', ')} |
| Dependencies phải integrated | ${task.dependsOn.join(', ') || 'Không; W01 cần yêu cầu triển khai và Git baseline'} |
| Implementer / reviewer | ${task.implementerTier} / ${task.reviewerTier}, hai agent khác nhau |
| Contract | ${task.contractVersion} |
| Ước lượng kỹ thuật | ${task.effortHours.join('–')} giờ tập trung; chưa gồm chờ review/đầu vào |
| Họ review | ${task.reviewFamily} |

## Đọc và quyền sửa

Đọc [AGENTS](../../../AGENTS.md), [CONTRACTS](../CONTRACTS.md), [ORCHESTRATION](../ORCHESTRATION.md), [REVIEW_RUBRIC](../REVIEW_RUBRIC.md), cùng:

${task.readFiles.map(file=>`- [${file}](../../../${file})`).join('\n')}

Chỉ sửa các file sau; path chưa tồn tại là đầu ra tương lai:

${list(task.writeFiles.map(file=>'`'+file+'`'))}

Report path do integrator cấp trong packet. Không tự sửa manifest/ledger hoặc file ngoài write set.

## Đầu vào / đầu ra

**Consumes:** ${task.consumes}

**Produces:** ${task.produces}

## Tiêu chí local

${task.localAcceptance.map((item,index)=>`- [ ] ${task.id}-AC${index+1}: ${item}`).join('\n')}

## Các bước

- [ ] Kiểm checkout/base SHA, dependency SHAs, contract và quyền sửa trong packet.
- [ ] Đọc API/callers liên quan; báo integrator trước khi cần đổi interface.
- [ ] Test hành vi có rủi ro trước triển khai; lưu RED thật. Với art, xác định frame/harness và nghĩa vụ review sau tích hợp.
- [ ] Triển khai đúng đầu ra; không mở rộng scope hoặc sửa file protected khác.
- [ ] Chạy kiểm tra dưới đây, lưu command/exit code/output thật; thiếu tool/thiết bị ghi not-run.
- [ ] Tự đọc diff, commit trong worktree được giao, gửi report/head SHA để review độc lập.

## Kiểm chứng local

${list(task.verification)}

## Nghĩa vụ kiểm chứng sau tích hợp

${task.integrationChecks.length ? list(task.integrationChecks) : 'Không có nghĩa vụ hoãn riêng được khai báo; vẫn áp dụng kiểm tra integration candidate và các gate sản phẩm.'}

Các nghĩa vụ hoãn chưa được coi đã pass. Local review và kiểm tra nối module cho phép integrated; accepted chờ bằng chứng downstream đúng candidate. Không chặn provider chỉ vì consumer toàn scene chưa tồn tại, cũng không tuyên bố hình ảnh/FPS đạt từ unit test.

## Giới hạn và bàn giao

${task.guardrails}

Report gồm taskId/baseSha/headSha/contractVersion/changedFiles, từng acceptance/evidence, commandsAndActualResults, unverifiedItems/openRisks và reportPath. Dùng [PROMPTS](../PROMPTS.md); không tự nhận task tiếp hoặc tự nới budget để pass.
${task.id === 'W16' ? visibilityExample : ''}`;
  writeFileSync(path.join(tasksDir, `${task.id}.md`), body, 'utf8');
}

const rows = manifest.packages.map(task => `| [${task.id}](tasks/${task.id}.md) | ${task.title} | ${task.dependsOn.join(', ') || '—'} | ${task.implementerTier} / ${task.reviewerTier} | ${task.writeFiles.length} | planned |`).join('\n');
const board = `# HavenArt — Bảng giao việc nhiều agent

Cập nhật 28/09/2026. **36 gói: 30 Phase 1 và 6 Phase 2. Tất cả planned, chưa viết ứng dụng.** T01–T20 được giữ làm nhóm tính năng; Wxx là đơn vị dispatch. Phase 2 có card định hướng nhưng bị khóa dispatch cho đến khi có contract và topology chi tiết sau Phase 1.

Nguồn máy đọc: [work-packages.json](work-packages.json). Phiếu giao việc bên dưới sinh từ manifest. Quy trình ở [ORCHESTRATION](ORCHESTRATION.md), hợp đồng ở [CONTRACTS](CONTRACTS.md), chấm review ở [REVIEW_RUBRIC](REVIEW_RUBRIC.md), mẫu packet ở [PROMPTS](PROMPTS.md).

L/M/H là năng lực tương đối: L chỉ nhận task cơ học có code/test đầy đủ, M triển khai mô tả nhiều file, H quyết định kiến trúc/rủi ro tích hợp. Reviewer tối thiểu M, các task M phần lớn được H kiểm. Không mặc định mọi module phù hợp model rẻ nhất.

| Gói | Đầu ra | Dependencies integrated | Làm / Review | Số file được sửa | Trạng thái |
|---|---|---|---|---:|---|
${rows}

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

\`node docs/agents/validate-plan.mjs\` kiểm DAG, ID, file quyền sửa, reviewer tier, contract và links input. \`node docs/agents/validate-plan.mjs --self-test\` kiểm khả năng phát hiện chín lỗi chủ động. \`node docs/agents/render-task-cards.mjs\` cập nhật card và bảng này từ manifest.

Các lệnh trên **không triển khai agent, không build website, không chứng minh visual/FPS hoặc chặn filesystem runtime**. Khi thực hiện, integrator còn phải kiểm diff thực nằm trong write set và hợp đồng trên đúng base/head SHA.
`;
writeFileSync(path.join(root, 'docs/agents/TASK_BOARD.md'), board, 'utf8');
console.log(`Rendered ${manifest.packages.length} task cards and TASK_BOARD.md`);
