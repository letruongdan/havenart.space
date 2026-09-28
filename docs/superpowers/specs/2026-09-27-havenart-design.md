# HavenArt — Đặc tả tích hợp Phase 1

Ngày: 27/09/2026. Trạng thái: đề xuất kỹ thuật để review, chưa là thiết kế được chủ dự án phê duyệt.

Nguồn yêu cầu: [master brief](../../reference/HAVENART_MASTER_BUILD_PROMPT.md). Phạm vi đợt này: tài liệu kế hoạch, không thực hiện hướng dẫn bắt đầu code trong brief.

## Ràng buộc toàn dự án

- Ngân sách mua asset: 0 USD; không bắt buộc dịch vụ trả phí.
- Phase 1: exterior → approach → entrance → living → garden → finale.
- Không hard camera cut; cuộn ngược đảo hành trình liên tục.
- Audio OFF BY DEFAULT; chỉ bật sau hành động rõ ràng của người dùng.
- /vi là mặc định; /en có đầy đủ nội dung, nhãn hỗ trợ tiếp cận và metadata.
- Không bịa số điện thoại, URL liên hệ, địa chỉ, đánh giá, giải thưởng hoặc số dự án.
- Reduced motion và WebGL fallback có toàn bộ nội dung và CTA.
- 1 unit = 1 meter; Y-up; các zone dùng chung hệ tọa độ.
- TypeScript strict; cấu hình story tách rendering; asset có thể thay thế.
- Chưa có số đo thực nghiệm; mọi ngân sách/FPS là mục tiêu cần xác minh.

## Quyết định thiết kế

Chọn realtime 3D mô-đun với HTML tĩnh đầy đủ làm nền. Ngoại thất có cây và nắng thấp; camera theo lối tiếp cận qua cửa thật, đi vào phòng khách, qua cửa kính sau ra vườn và lùi/nâng nhẹ để kết. Mặt bằng phải được kiểm chứng bằng blockout trước khi làm nội thất. Không đặt đường camera xuyên một bức tường chỉ để rút ngắn lịch.

Mỗi chương một thông điệp, vùng chữ không che điểm nhìn chính. Shell: logo, đổi ngôn ngữ, audio, tiến độ, liên hệ. Static mode sử dụng section thông thường và cùng dữ liệu nội dung/hotspot. Reduced motion không import renderer. Lỗi WebGL giữa chuyến đi chuyển về section tương ứng, giữ focus và CTA.

## Cấu trúc dự kiến

```text
src/app/[locale]/layout.tsx         root HTML lang, font và metadata locale
src/app/[locale]/page.tsx           HTML story + client enhancement boundary
src/app/(entry)/layout.tsx          root HTML lang=vi riêng cho điểm vào /
src/app/(entry)/page.tsx            điểm vào tiếng Việt khi chưa có host redirect
src/app/sitemap.ts                 routes thật và hreflang
src/app/robots.ts                  quy tắc theo môi trường build
src/components/ui/                BrandHeader, ContactSection, LanguageSwitcher
src/components/story/             StorySections, ExperienceGate, StoryOverlay
src/components/scene/              SceneCanvas, VillaShell, ZoneBoundary
src/components/hotspots/           HotspotButton, HotspotPanel, DetailList
src/config/                       story, camera, zones, lighting, quality, contacts
src/content/vi/                    messages.ts
src/content/en/                    messages.ts
src/lib/story/                    validateStory, sampleChapter, progress
src/lib/three/                    cameraRail, zoneManager, assetLoader
src/lib/performance/              qualityPolicy, frameMonitor
src/lib/audio/                    audioController
src/lib/analytics/                events
src/lib/i18n/                     locale, dictionary
src/stores/                      experienceStore
src/types/                       story.ts
src/styles/                      globals.css, tokens.css
public/models|textures|hdr|audio|images/
tests/unit|e2e|fixtures/
scripts/                         validate-assets, measure-payload, validate-release
docs/                            đặc tả, quyết định, báo cáo kiểm chứng
```

Các file trên **chưa tồn tại**; đây là bản đồ trách nhiệm khi triển khai. Không dựng một `Experience.tsx` ôm toàn bộ scene, routing và panel.

## Hợp đồng data chuẩn

Các chữ ký dưới đây là giao diện dự kiến cho các task, không phải code đã được kiểm thử.

```ts
export type Locale = 'vi' | 'en';
export type QualityTier = 'high' | 'medium' | 'low' | 'fallback';
export type Vec3 = readonly [number, number, number];
export type ExperienceMode = 'poster' | 'loading' | 'cinematic' | 'static';
export interface StoryChapter {
  id: string;
  slug: string;
  progressStart: number;
  progressEnd: number;
  cameraRange: readonly [number, number];
  copyKey: string;
  lightingPreset: string;
  audioPreset: string;
  hotspotIds: readonly string[];
  qualityHints: { preferredTier: Exclude<QualityTier, 'fallback'> };
}
export interface Hotspot {
  id: string;
  room: string;
  position: Vec3;
  category: 'furniture' | 'material' | 'lighting' | 'architecture' | 'landscape' | 'detail';
  copyKey: string;
  activationRange: readonly [number, number];
  maxDistanceM: number;
}
export interface CameraPose {
  position: Vec3;
  target: Vec3;
  quaternion: readonly [number, number, number, number];
  focalLengthMm: number;
}
export interface LightingPreset {
  environment: string;
  sunIntensity: number;
  sunDirection: Vec3;
  ambientIntensity: number;
  practicalLights: number;
  exposure: number;
}
export type ContactChannel = 'zalo' | 'messenger' | 'whatsapp';
export type ContactConfig = Record<ContactChannel, string | null>;
export interface RuntimeFrame {
  rawScrollProgress: number;
  renderedStoryProgress: number;
  direction: -1 | 0 | 1;
  dtSeconds: number;
}
```

`copyKey` trỏ một nhánh dictionary chứa title, description, design intention, materials, light strategy và accessibility labels; không lưu chuỗi VI/EN vào mesh. LocaleContent trong brief được thực hiện qua key này. Mọi reference được validator kiểm tra trước build: range liền mạch, id duy nhất, đủ locale, hotspot/lighting/audio tồn tại.

Hotspot.activationRange dùng tiến độ cục bộ chương; `localProgress=(p-start)/(end-start)`. Binding registry giữ scene/DOM anchors theo ID bên ngoài interface. Khởi điểm ống kính đề xuất 42 mm. Runtime có `staticReason: 'reduced-motion'|'user'|'unsupported'|'load-error'|'performance'|null` để phân biệt mode hiển thị với taxonomy analytics.

| Hệ thống | Nhận | Trả/hiệu ứng | Sở hữu |
|---|---|---|---|
| `sampleChapter(chapters,p)` | config + normalized progress | `StoryChapter` | Hàm thuần, không UI |
| `sampleRail(p)` | renderedStoryProgress | `CameraPose` | Rail được tạo một lần từ config |
| `sampleLighting(p)` | cùng progress | `LightingPreset` nội suy | Ánh sáng và exposure liên tục |
| `zoneManager.update(p,direction)` | tiến độ và hướng | tải/giữ/tháo zone theo manifest | Cache/refcount tài nguyên |
| `audioController.setProgress(p)` | cùng progress | cập nhật gain; chỉ khi enabled | AudioContext và vòng đời audio |
| `emit(event)` | event union allowlist | no-op adapter mặc định | Không gửi PII qua network |

`sampleRail` áp dụng cameraRange và tốc độ theo vùng; query cùng p phải cho cùng pose. Runtime mới chịu smoothing và speed limit. Không nhúng damping khác nhau vào từng phòng.

## Dòng thời gian Phase 1

| ID | Khoảng p | Mục đích | Zone chính |
|---|---|---|---|
| exterior | [0, 0.15) | Định vị thương hiệu, nhận biết nhà | exterior |
| approach | [0.15, 0.27) | Tiến gần, nén và mở tầm nhìn | exterior |
| entrance | [0.27, 0.39) | Qua ngưỡng cửa thật | entrance |
| living | [0.39, 0.68) | Chậm lại, khám phá ánh sáng, vật liệu và quan hệ với vườn | living |
| garden | [0.68, 0.87) | Ra ngoài qua cửa kính; đổi ánh sáng | garden |
| finale | [0.87, 1] | Reveal, tư vấn và các kênh liên hệ | garden |

Ba hotspot tối thiểu là `travertine-wall`, `sliding-glass`, `garden-tree`; hai ở living, một ở garden. Không ép tất cả vào cùng màn hình. Cuối khoảng thuộc chương kế tiếp, p=1 thuộc finale. Clamp ngoài [0,1]; NaN được coi là lỗi nguồn ở validation và runtime dùng giá trị ổn định trước đó.

## Tải, input và lỗi

Trang mở với poster/brand/copy/CTA. Minimum scene gồm shell, exterior proxy, vật liệu thiết yếu và đường rail; không chờ tất cả phòng/âm thanh. Không làm người đang đọc bị nhảy trang lúc canvas sẵn. Người đã cuộn xa khi tải xong giữ chế độ tĩnh, có lựa chọn bắt đầu 3D từ đầu; không bất ngờ camera bay đuổi theo scroll.

Trong cinematic mode, kéo scrollbar/Home/End làm đổi raw target; camera đi trên rail với giới hạn tốc độ và gia tốc để không teleport. Trong đoạn đang bắt kịp, overlay và hotspots vẫn dùng rendered p; CTA DOM đến được tức thời. Nếu khoảng cách quá lớn gây chờ khó chịu, cho chuyển static; không khóa cuộn native để ép xem phim. Modal chi tiết là ngoại lệ chuẩn: khóa cuộn nền, freeze rendered p, khi đóng restore raw/native và reset dt/velocity trước tiếp tục. Resize giữ chapter + local progress; browser history/đổi ngôn ngữ phục hồi trạng thái trước khi lộ canvas.

Shell cơ bản luôn có mặt để scene không có lỗ khi lùi. Zone chi tiết theo active/neighbor, prefetch có giới hạn. Texture lỗi dùng PBR màu trung tính; chi tiết GLB lỗi dùng proxy; lỗi shell/renderer chuyển static. Phân biệt `visible=false` với giải phóng GPU: chỉ dispose khi không còn chủ sở hữu/cache sử dụng.

Đổi chế độ, tab ẩn và unmount hủy ScrollTrigger/listener, dừng audio, dừng render không cần thiết; context restore thử có giới hạn. Không retry vô hạn hoặc tự bật lại 3D khi người dùng đã chọn static.

## Tiêu chí và truy vết

Các ngân sách/thiết bị/điều kiện đo nằm trong [PERFORMANCE_BUDGET](../../PERFORMANCE_BUDGET.md); hành vi nghiệm thu nằm trong [ACCEPTANCE_CRITERIA](../../ACCEPTANCE_CRITERIA.md). Không thay đánh giá bố cục, vật liệu, kiến trúc bằng điểm Lighthouse.

Mọi thay đổi range, rail và quy ước tọa độ phải cập nhật camera config, fixtures và storyboard cùng một task. Phase 2 giữ ID/API, thêm cấu hình và control points hợp lý; không bảo đảm toàn bộ control point Phase 1 giữ nguyên khi thêm tầng. Engine giữ nguyên, layout và data có thể mở rộng.

## Cách áp dụng Superpowers

Đã đọc `using-superpowers`, `brainstorming`, `writing-plans` từ bản local của plugin. Dự án thuộc nhánh architectural. Yêu cầu hiện tại đã cung cấp brief chi tiết và yêu cầu lập kế hoạch; do đó tạo bản thiết kế và kế hoạch để review, ghi rõ giả định thay vì bắt đầu xây dựng. Không coi tài liệu đề xuất là approval thực thi. Chưa có repository Git nên tài liệu được lưu trên filesystem, chưa commit.

Liên kết skill sử dụng: [brainstorming](C:/Users/letru/.codex/.tmp/plugins/plugins/superpowers/skills/brainstorming/SKILL.md), [writing-plans](C:/Users/letru/.codex/.tmp/plugins/plugins/superpowers/skills/writing-plans/SKILL.md).
