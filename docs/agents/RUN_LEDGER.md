# HavenArt — Nhật ký thực thi (RUN_LEDGER)

- **Kế hoạch:** HavenArt Multi-Agent Execution Plan (Phase 1: W01–W30, Phase 2: W31–W36)
- **Baseline SHA:** `8b9281831f7b2409e9401e87ccab22d17f2847aa`
- **Nhánh tích hợp:** `integration`
- **Phiên bản hợp đồng:** `havenart-contracts-1.1`
- **Ngày bắt đầu:** 28/09/2026
- **Chế độ điều phối:** Serial / Single-Writer trên shared checkout (khi cần multi-worker sẽ dùng worktree cô lập)

---

## 1. Danh sách Checkouts / Worktrees

| Checkout Path | Nhánh | Base SHA | Vai trò / Owner | Trạng thái |
|---|---|---|---|---|
| `d:/LandingPage/havenart.space` | `integration` | `8b9281831f7b2409e9401e87ccab22d17f2847aa` | Integrator | Active |

---

## 2. Bảng kiểm tra trước khi chạy (Preflight Consistency)

### 2.1 Tính nhất quán nội bộ từng gói (W01–W36)

| Gói | Tier (Worker / Reviewer) | Phase | Dependencies | Write Set | Local Acceptance | Verification | Kết luận |
|---|---|---|---|---|---|---|---|
| W01 | H / H | 1 | — | 14 files | 3 criteria | 4 commands | PASS |
| W02 | H / H | 1 | W01 | 10 files | 4 criteria | 3 commands | PASS |
| W03 | M / H | 1 | W02 | 6 files | 3 criteria | 3 commands | PASS |
| W04 | M / H | 1 | W02 | 3 files | 3 criteria | 3 commands | PASS |
| W05 | M / H | 1 | W02 | 4 files | 3 criteria | 3 commands | PASS |
| W06 | M / H | 1 | W03, W04, W05 | 5 files | 4 criteria | 4 commands | PASS |
| W07 | M / H | 1 | W03 | 3 files | 3 criteria | 3 commands | PASS |
| W08 | H / H | 1 | W02 | 4 files | 4 criteria | 3 commands | PASS |
| W09 | H / H | 1 | W02 | 4 files | 4 criteria | 3 commands | PASS |
| W10 | M / H | 1 | W02 | 3 files | 3 criteria | 3 commands | PASS |
| W11 | H / H | 1 | W06, W09, W10 | 5 files | 3 criteria | 3 commands | PASS |
| W12 | H / H | 1 | W04, W08 | 7 files | 4 criteria | 3 commands | PASS |
| W13 | H / H | 1 | W06, W07, W08, W09, W10, W11, W12 | 7 files | 4 criteria | 4 commands | PASS |
| W14 | M / H | 1 | W13 | 3 files | 3 criteria | 3 commands | PASS |
| W15 | M / H | 1 | W13 | 3 files | 3 criteria | 3 commands | PASS |
| W16 | L / M | 1 | W02 | 2 files | 3 criteria | 3 commands | PASS |
| W17 | M / H | 1 | W03, W12, W13, W16 | 6 files | 4 criteria | 3 commands | PASS |
| W18 | M / H | 1 | W02, W13 | 5 files | 3 criteria | 3 commands | PASS |
| W19 | M / H | 1 | W03, W13 | 3 files | 3 criteria | 3 commands | PASS |
| W20 | M / H | 1 | W02, W12 | 6 files | 4 criteria | 3 commands | PASS |
| W21 | M / H | 1 | W02, W12 | 4 files | 3 criteria | 3 commands | PASS |
| W22 | M / H | 1 | W02 | 2 files | 3 criteria | 3 commands | PASS |
| W23 | M / H | 1 | W03, W05, W06 | 4 files | 3 criteria | 3 commands | PASS |
| W24 | H / H | 1 | W03, W12, W13 | 4 files | 3 criteria | 3 commands | PASS |
| W25 | H / H | 1 | W14, W15, W17, W18, W19, W20, W21, W24 | 27 files | 4 criteria | 4 commands | PASS |
| W26 | H / H | 1 | W25 | 3 files | 3 criteria | 3 commands | PASS |
| W27 | M / H | 1 | W25, W26 | 4 files | 3 criteria | 3 commands | PASS |
| W28 | H / H | 1 | W22, W23, W25 | 6 files | 3 criteria | 3 commands | PASS |
| W29 | M / H | 1 | W27, W28 | 6 files | 3 criteria | 3 commands | PASS |
| W30 | H / H | 1 | W26, W27, W28, W29 | 3 files | 3 criteria | 3 commands | PASS |
| W31 | M / H | 2 | W30 | 2 files | 2 criteria | 2 commands | PASS (Khóa dispatch) |
| W32 | M / H | 2 | W31 | 2 files | 2 criteria | 2 commands | PASS (Khóa dispatch) |
| W33 | M / H | 2 | W32 | 2 files | 2 criteria | 2 commands | PASS (Khóa dispatch) |
| W34 | M / H | 2 | W33 | 2 files | 2 criteria | 2 commands | PASS (Khóa dispatch) |
| W35 | M / H | 2 | W34 | 2 files | 2 criteria | 2 commands | PASS (Khóa dispatch) |
| W36 | M / H | 2 | W35 | 2 files | 2 criteria | 2 commands | PASS (Khóa dispatch) |

### 2.2 Các cặp chia sẻ File / Giao diện (14 cặp kiểm chứng thứ tự DAG)

| Bên tạo (First) | Bên nhận (Second) | Files chia sẻ | Thứ tự phụ thuộc (DAG) | Kết luận |
|---|---|---|---|---|
| W01 | W13 | `src/styles/globals.css` | W01 $\to$ W02 $\to$ ... $\to$ W13 | Hợp lệ (Ordered) |
| W02 | W25 | `src/config/hotspots.ts` | W02 $\to$ ... $\to$ W25 | Hợp lệ (Ordered) |
| W06 | W13 | `src/app/[locale]/page.tsx` | W06 $\to$ W13 | Hợp lệ (Ordered) |
| W06 | W25 | `src/app/[locale]/page.tsx` | W06 $\to$ W13 $\to$ ... $\to$ W25 | Hợp lệ (Ordered) |
| W06 | W28 | `src/app/[locale]/layout.tsx`, `src/components/ui/ContactSection.tsx` | W06 $\to$ W23 $\to$ W28 | Hợp lệ (Ordered) |
| W07 | W13 | `src/components/story/StoryOverlay.tsx` | W07 $\to$ W13 | Hợp lệ (Ordered) |
| W07 | W25 | `src/components/ui/BrandHeader.tsx` | W07 $\to$ W13 $\to$ ... $\to$ W25 | Hợp lệ (Ordered) |
| W08 | W25 | `src/config/camera.ts` | W08 $\to$ W12 $\to$ W13 $\to$ ... $\to$ W25 | Hợp lệ (Ordered) |
| W11 | W13 | `src/components/scene/SceneCanvas.tsx` | W11 $\to$ W13 | Hợp lệ (Ordered) |
| W11 | W25 | `src/components/scene/SceneCanvas.tsx` | W11 $\to$ W13 $\to$ ... $\to$ W25 | Hợp lệ (Ordered) |
| W13 | W25 | `src/app/[locale]/page.tsx`, `src/components/story/ExperienceHost.tsx`, `src/components/scene/SceneCanvas.tsx`, `src/config/zones.ts` | W13 $\to$ W14..W24 $\to$ W25 | Hợp lệ (Ordered) |
| W13 | W28 | `src/components/story/ExperienceHost.tsx` | W13 $\to$ W25 $\to$ W28 | Hợp lệ (Ordered) |
| W25 | W28 | `src/components/story/ExperienceHost.tsx` | W25 $\to$ W28 | Hợp lệ (Ordered) |
| W25 | W29 | `ASSET_LICENSES.md` | W25 $\to$ W27 $\to$ W29 | Hợp lệ (Ordered) |

---

## 3. Bảng trạng thái thực thi các gói

| Gói | Mô tả tóm tắt | Trạng thái | Base SHA | Head SHA | Review Verdict | Integration SHA | Ghi chú |
|---|---|---|---|---|---|---|---|
| W01 | Nền tảng & kiểm tra tái lập | integrated | `44ca27b` | `d59539a` | SPEC: PASS, QUALITY: PASS | `d59539a` | 14 files, round 2 pass |
| W02 | Khóa hợp đồng dữ liệu & fixtures | integrated | `cc22b2c` | `3beaaba` | SPEC: PASS, QUALITY: PASS | `3beaaba` | 10 files, round 1 pass |
| W03 | Nội dung VI/EN và dictionary loader | integrated | `ab671f8` | `f06a674` | SPEC: PASS, QUALITY: PASS | `f06a674` | 6 files, round 1 pass |
| W04 | Chapter sampler và validator thuần | integrated | `193432f` | `ed86fce` | SPEC: PASS, QUALITY: PASS | `ed86fce` | 3 files, round 1 pass |
| W05 | Contact config và URL validation | integrated | `2040771` | `96e68d6` | SPEC: PASS, QUALITY: PASS | `96e68d6` | 4 files, round 1 pass |
| W06 | Trang HTML locale và bố cục semantic | integrated | `3d68144` | `c7d7d35` | SPEC: PASS, QUALITY: PASS | `c7d7d35` | 5 files, round 1 pass |
| W07 | Design tokens và brand shell | integrated | `8caf3a5` | `c4e7e81` | SPEC: PASS, QUALITY: PASS | `c4e7e81` | 3 files, round 1 pass |
| W08 | Spline rail, quaternion và clearance | integrated | `5b139a9` | `710c6bb` | SPEC: PASS, QUALITY: PASS | `710c6bb` | 4 files, round 1 pass |
| W09 | Asset registry và zone streaming | integrated | `a5708fe` | `ef02685` | SPEC: PASS, QUALITY: PASS | `ef02685` | 4 files, round 1 pass, registry & proxy fallback |
| W10 | Villa shell và proxy có đường thông | integrated | `a9249f8` | `964dd6b` | SPEC: PASS, QUALITY: PASS | `964dd6b` | 3 files, round 1 pass, persistent shell & proxies |
| W11 | Canvas boundary và mode gate từ đầu | integrated | `7470cf6` | `684d0b7` | SPEC: PASS, QUALITY: PASS | `684d0b7` | 5 files, round 1 pass, mode gate & dynamic boundary |
| W12 | Time-clamped progress store và camera sync | integrated | `8933bec` | `3975ef7` | SPEC: PASS, QUALITY: PASS | `3975ef7` | 7 files, round 1 pass, runtime & discrete store |
| W13 | Tích hợp nền và camera — G1 | integrated | `3d9bbba` | `c7f3543` | SPEC: PASS, QUALITY: PASS | `c7f3543` | 7 files, round 1 pass, Gate G1 composition root |
| W14 | Ngoại thất và entrance chi tiết | integrated | `9576782` | `4c9ee6b` | SPEC: PASS, QUALITY: PASS | `4c9ee6b` | 3 files, round 1 pass, exterior/entrance detail & corridor clearance |
| W15 | Living và vật liệu điểm nhấn | integrated | `194dcc6` | `eae3b24` | SPEC: PASS, QUALITY: PASS | `eae3b24` | 3 files, round 1 pass, living detail, PBR materials & hotspot anchors |
| W16 | Predicate hiển thị hotspot | integrated | `fa16cc0` | `e620d26` | SPEC: PASS, QUALITY: PASS | `e620d26` | 2 files, round 1 pass, pure predicate |
| W17 | Hotspot DOM, projection và modal | ready | `e620d26` | — | — | — | W03, W12, W13, W16 integrated |
| W18 | Lighting track và môi trường | ready | `c7f3543` | — | — | — | W02, W13 integrated |
| W19 | Garden detail và finale component | ready | `c7f3543` | — | — | — | W03, W13 integrated |
| W22 | Event abstraction và dedupe thuần | integrated | `4337b1e` | `33f7891` | SPEC: PASS, QUALITY: PASS | `33f7891` | 2 files, round 1 pass, telemetry validation & dedupe |
| W23 | Metadata, sitemap và robots | integrated | `a579d91` | `9951292` | SPEC: PASS, QUALITY: PASS | `9951292` | 4 files, round 1 pass, SEO metadata & sitemap/robots |
| W24 | Locale restoration và history lifecycle | ready | `c7f3543` | — | — | — | W03, W12, W13 integrated |
| W20.. | Các gói tiếp theo | planned | — | — | — | — | Chờ dependencies theo DAG |
| W31–W36 | Các phòng Phase 2 | planned | — | — | — | — | Khóa dispatch |

---

## 4. Nhật ký phán quyết (Rulings) & Quyết định Integrator

- **2026-09-28 [RULING-01]:** Khởi tạo Git repository tại root với baseline commit `8b9281831f7b2409e9401e87ccab22d17f2847aa` bảo tồn nguyên vẹn toàn bộ 71 file tài liệu ban đầu. Tạo nhánh `integration` làm nhánh tích hợp duy nhất. Khởi tạo `RUN_LEDGER.md` ghi nhận preflight hoàn tất.
- **2026-09-28 [RULING-02]:** Tích hợp thành công gói W01 tại integration SHA `d59539aad4111a44a6be72cc20f9aeaab2bfcfc9`. Đã trải qua 2 round review độc lập bởi agent Tier H; Round 1 phát hiện P1 (ESLint 9 Flat Config quét out/ và .next/), Round 2 xác nhận đã fix triệt để. Toàn bộ 4 kiểm tra (typecheck, lint, build, static server smoke) đều PASS. Chuyển W02 sang `ready`.
- **2026-09-28 [RULING-03]:** Tích hợp thành công gói W02 tại integration SHA `3beaabad3292b4ac3a2fc658a47486f2009b0ae2` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1. Toàn bộ types nền tảng, runtime contracts, chapter/hotspot configs và shared fixtures đã khóa hoàn tất (đạt mốc Gate G0 kỹ thuật). Mở 8 gói phụ thuộc trực tiếp sang trạng thái ready: W03, W04, W05, W08, W09, W10, W16, W22.
- **2026-09-28 [RULING-04]:** Tích hợp thành công gói W03 tại integration SHA `f06a674ad3078394a6904723c9ff37a433e07abb` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1. Toàn bộ từ điển VI/EN, parseLocale, getDictionary và 10 unit tests đã hoạt động chính xác. Mở thêm gói W07 (chỉ phụ thuộc W03) sang trạng thái ready.
- **2026-09-28 [RULING-05]:** Tích hợp thành công gói W04 tại integration SHA `ed86fce0e53ed916bc8543dc4a023cd92bf4ba0f` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1. sampleChapter đơn định và validateStory kiểm tra đầy đủ 100% cấu trúc story configuration.
- **2026-09-28 [RULING-06]:** Tích hợp thành công gói W05 tại integration SHA `96e68d63bd7a0582e235165ec414f92300c50e9c` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1. Cấu hình contacts null trung thực, xác thực URL nghiêm ngặt chống spoofing và gating production release hoàn chỉnh. Với W03, W04, W05 đều đã integrated, gói W06 (Semantic HTML Page & Layout) đủ điều kiện chuyển sang `ready`.
- **2026-09-28 [RULING-07]:** Tích hợp thành công gói W06 tại integration SHA `c7d7d354ca1573906105998de89a04a8ae130dbe` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1. Toàn bộ 7 kiểm tra E2E bằng Playwright trên Chromium đối với static server đã PASS (lang thuộc tính unhydrated, HTTP 404 cho unknown locales, no-JS resilience 6 chapters + services + 3 details + CTA, heading hierarchy strictly h1->h2->h3, và single unique #contact). Với W03, W05, W06 đều đã integrated, gói W23 (Modal liên hệ và sao chép/fallback thuần) đủ điều kiện chuyển sang `ready`.
- **2026-09-28 [RULING-08]:** Tích hợp thành công gói W07 tại integration SHA `c4e7e8160c49b30ff35ae9148532eabee154b3ff` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1. Thiết lập bảng token CSS (typography ≤2 font families, màu sắc nhiệt đới tối giản, touch targets ≥44px), BrandHeader gắn thanh điều hướng và StoryOverlay thuần props trình bày nội dung theo từng chapter active mà không đọc scroll hay tạo store. Nghĩa vụ kiểm chứng visual/screenshot được ghi nhận hoãn tới Gate G1 (W13).
- **2026-09-28 [RULING-09]:** Tích hợp thành công gói W08 tại integration SHA `710c6bb08648b842707157540e9286d61ab861d6` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1 (họ review: camera). Cấu hình 9 waypoint camera Phase 1, spline Catmull-Rom centripetal với nội suy PCHIP, tính đơn định 100% khi tra cứu xuôi/ngược, triệt tiêu roll hoàn toàn và đảm bảo liên tục bán cầu quaternion. Kiểm tra clearance đạt 0 vi phạm qua hai khoảng mở cửa villa với khoảng hở an toàn >= 0.38m. Với W04 và W08 đều đã integrated, gói W12 (Time-clamped progress store và camera sync) đủ điều kiện chuyển sang `ready`.
- **2026-09-28 [RULING-10]:** Tích hợp thành công gói W09 tại integration SHA `ef02685660f36efaed33b8eaed50eb54579ea6a8` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1 (họ review: resources). Triển khai ResourceRegistry ref-counting cho materials, geometries, textures; ZoneLoader với fallback an toàn sang procedural proxy cho decorative asset; createZoneManager quản lý LRU eviction, hướng di chuyển (direction-based prioritization), bảo toàn pinned activeZone & shell, cùng xử lý AbortSignal và báo lỗi core failure lên mode gate. Nghĩa vụ kiểm chứng peak GPU/resource được ghi nhận hoãn tới W26.
- **2026-09-28 [RULING-11]:** Tích hợp thành công gói W10 tại integration SHA `964dd6bc4a20635e1571eef9dbeeaa164146a729` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1 (họ review: spec-and-quality). Triển khai VillaShell persistent với kích thước meter chuẩn (phong bì đất 24x52m, sàn 16x15.5m, mái 3.8m), khoảng mở cửa trước X in [-1.4, 1.4] và cửa sau X in [0.8, 3.8] bằng hình học thực tế không sealed box; FurnitureProxy và GardenProxy giữ trọn silhouette từ mọi góc nhìn, không đổi origin của camera rail, và định danh chính xác 3 stable hotspot anchors ('travertine-wall', 'sliding-glass', 'garden-tree'). Nghĩa vụ kiểm chứng top-view keyframes và clearance chi tiết được ghi nhận chuyển tới Gate G1 (W13). Với W06, W09, W10 đều đã integrated, gói W11 đủ điều kiện chuyển sang trạng thái `ready`.
- **2026-09-28 [RULING-12]:** Tích hợp thành công gói W11 tại integration SHA `684d0b7c4f0b7605edacf136c95874afbcbcb21d` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1 (họ review: spec-and-quality). Triển khai ExperienceGate kết hợp selectMode bảo đảm prefers-reduced-motion và userStatic có độ ưu tiên cao nhất, hoàn toàn không nạp module Three/R3F trên server hay khi ở chế độ tĩnh; ZoneBoundary phân tách lỗi decorative (dùng proxy) và lỗi core (chuyển sang static); SceneCanvas lắng nghe webglcontextlost và kích hoạt fallback tĩnh tức thì; kiểm soát late-load cuộn xa (> 300px) giữ vững bản đọc tĩnh tránh pop-in; bảo tồn 100% cây DOM ngữ nghĩa và CTA trong mọi tình huống. Nghĩa vụ kiểm chứng network proof / noWebGL trên thiết bị thật được ghi nhận chuyển tới Gate G1 (W13).
- **2026-09-28 [RULING-13]:** Tích hợp thành công gói W12 tại integration SHA `3975ef7d44342804ae31378a1dc7f0823f6df0e6` sau khi đạt 100% SPEC & QUALITY PASS ngay ở Round 1 (họ review: runtime). Triển khai createStoryRuntime với snapshot bất biến, tách bạch rawScrollProgress và renderedStoryProgress; tính toán vận tốc tối đa theo spatial rail derivative và giới hạn động học (3.0 m/s indoor, 5.0 m/s outdoor, 0.5236 rad/s angular speed); kẹp cứng dt (maxDtSeconds = 0.1s) và xử lý visibilitychange triệt tiêu dt jump khi chuyển tab; hỗ trợ FreezeToken cho modal dialog và phục hồi mượt mà; ScrollRuntime dọn dẹp rAF sạch sẽ; useExperienceStore đảm bảo chỉ chứa discrete state, không gây re-render toàn cây mỗi frame. Với toàn bộ 7 gói tiền đề (W06, W07, W08, W09, W10, W11, W12) đã hoàn tất tích hợp, gói cột mốc Gate G1 (W13 — Tích hợp nền và camera) chính thức được mở khóa và chuyển sang trạng thái `ready`.
- **2026-09-28 [RULING-14]:** Tích hợp thành công gói W13 (Gate G1 — Tích hợp nền và camera) tại integration SHA `c7f3543384e9ac287ef5e55b819f13c37cb7e394` sau khi đạt 100% SPEC & QUALITY PASS. Triển khai ExperienceHost kết nối providers và runtime; SceneCanvas tích hợp CameraController lấy mẫu sampleRail(renderedStoryProgress) liên tục trên từng khung hình rAF mượt mà không teleport; CSS/DOM slots phân tầng chuẩn (.canvas-viewport z-0, .experience-content-layer z-10); duy trì duy nhất một id="contact" trên toàn route; toàn bộ 13 bài test Playwright E2E đều PASS trên Chromium (hành trình cuộn xuôi/ngược/Home/End không cắt cảnh, fallback prefers-reduced-motion không tải renderer canvas, chuyển chế độ tĩnh bằng nút bấm, validateStory definition-only pass). Mốc Gate G1 đã chính thức hoàn thành, mở khóa 5 gói phụ thuộc: W14, W15, W18, W19, W24 sang trạng thái `ready`.
- **2026-09-28 [RULING-15]:** Tích hợp thành công gói W16 (Predicate hiển thị hotspot) tại integration SHA `e620d261409ab2d610d1bcc93f478f4e2dcb8fc8` sau khi đạt 100% SPEC & QUALITY PASS (họ review: pure-logic). Triển khai hàm thuần isHotspotVisible xác thực toàn diện các điều kiện không gian, khoảng cách, dải kích hoạt nội bộ, frustum và che khuất; 9 unit test bao phủ toàn bộ các trường hợp biên và dữ liệu bất thường; không phụ thuộc DOM/store/scroll. Với W16 đã integrated cùng W03, W12, W13 hoàn tất từ trước, gói W17 (Hotspot DOM, projection và modal) chính thức đủ điều kiện chuyển sang trạng thái `ready`.
- **2026-09-28 [RULING-16]:** Tích hợp thành công gói W22 (Event abstraction và dedupe thuần) tại integration SHA `33f7891cbcb30c6040442a83e4abeb363c4bb114` sau khi đạt 100% SPEC & QUALITY PASS (họ review: analytics). Triển khai validateEventPayload và validateAnalyticsEvent kiểm duyệt nghiêm ngặt 10 canonical event, triệt tiêu PII; createChapterDwellTracker với ngưỡng ổn định >= 300ms và theo dõi di chuyển A->B->A; createExperienceLifecycleTracker quản lý tính duy nhất của started và hoàn tất completed (progress >= 0.99 + CTA visible >= 50% trong 1000ms liên tục); createCtaCoordinator khử trùng lặp click do bubbling; dev buffer giới hạn 100 sự kiện và production sink mặc định là no-op.
- **2026-09-28 [RULING-17]:** Tích hợp thành công gói W23 (Metadata, sitemap và robots) tại integration SHA `9951292c40d74c2999459f21759a512190df3375` sau khi đạt 100% SPEC & QUALITY PASS (họ review: seo). Triển khai buildPageMetadata tuân thủ triệt để nguyên tắc không phát sinh canonical ảo hoặc index khi ở preview/origin null; static sitemap và robots.txt bảo đảm build xuất xưởng tĩnh (force-static) với đường dẫn hợp lệ; bảo lưu việc đấu nối OpenGraph thật và wire metadata route cho W28 theo đúng hợp đồng.
- **2026-09-28 [RULING-18]:** Tích hợp thành công gói W14 (Ngoại thất và entrance chi tiết) tại integration SHA `4c9ee6b4ff1f3568ac8d44b26d9712b722eab8a6` sau khi đạt 100% SPEC & QUALITY PASS (họ review: spec-and-quality). Triển khai các thành phần chi tiết cảnh quan ngoại thất Exterior và sảnh đón Entrance bằng Three.js procedural proxy; bảo đảm 100% thông suốt hành lang di chuyển camera và khoảng mở cửa chính (clearance >= 1.2m vượt ngưỡng 0.38m); toàn bộ hình học 3D giữ trọn thể tích khi nhìn ngược từ lối vào ra sân trước; ghi nhận nghĩa vụ kiểm chứng visual mỹ thuật toàn cảnh tại Gate G2 (W25).
- **2026-09-28 [RULING-19]:** Tích hợp thành công gói W15 (Living và vật liệu điểm nhấn) tại integration SHA `eae3b24abbfc73cc7e7082c126aa3f11e9732695` sau khi đạt 100% SPEC & QUALITY PASS (họ review: spec-and-quality). Triển khai không gian phòng khách Living với nội thất tỷ lệ thực, bộ vật liệu PBR LivingMaterials (travertine, teak, bronze, glass, linen, wool) tuân thủ LIGHTING_SPEC không gây lóa bloom; bảo đảm an toàn camera clearance (>= 0.38m) và mở thông suốt khoảng mở cửa kính trượt Z=15.5 hướng tầm nhìn ra khu vườn sau; khóa chính xác hai điểm neo hotspot 'travertine-wall' và 'sliding-glass'; ghi nhận nghĩa vụ nghiệm thu visual tại Gate G2 (W25).







