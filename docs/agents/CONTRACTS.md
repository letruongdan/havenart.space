# HavenArt — Hợp đồng giao việc giữa các agent

Version đề xuất: `havenart-contracts-1.1`, ngày 28/09/2026. Bản 1.1 tách kiểm definition/runtime và giao ownership audio assets sau review độc lập. Đây là thiết kế module; W02 chuyển thành types/fixtures và kiểm tra trước dispatch consumer. Chưa có code hoặc contract test thực thi.

## Authority và ownership

Hành vi sản phẩm theo [đặc tả tích hợp](../superpowers/specs/2026-09-27-havenart-design.md). Hợp đồng này làm rõ API còn thiếu để tránh worker tự đoán. Khi khác tên file hoặc thứ tự với T01–T20, manifest Wxx ngày 28/09 thay thế **cách phân việc**, không tự thay yêu cầu sản phẩm. Change request phải có chữ ký trước/sau, consumer IDs, migration và regression plan. Integrator chốt version mới và dừng dispatch consumer cũ; không đổi âm thầm.

| Nhóm file chung | Owner ban đầu | Ai được sửa sau |
|---|---|---|
| package/lock/runtime/tool config | W01 | Integrator qua gói dependency riêng |
| src/types/* và contract fixtures | W02 | Integrator qua contract change có review H |
| copy VI/EN và key shape | W03 | Integrator tích hợp copy patch từ worker; không nhiều người ghi chung dictionary |
| story/hotspot config | W02 | W25/integrator; key/range đổi phải cập nhật consumers |
| renderer/zone manifest | W11/W13 | W25/integrator |
| runtime/store | W12 | Gói fix được integrator chỉ định; worker khác chỉ gọi API |
| routes/semantic tree | W06 | W13/W25/W28 serialize |
| ASSET_LICENSES.md | Integrator W25 | W29; asset worker nộp record qua report |

Các file protected không phải cấm mọi agent sửa: chỉ owner cụ thể được ghi trong packet có quyền. Không sử dụng glob rộng `src/**` làm write set. Các code block dưới đây là signatures/schema dự kiến, không phải test đã pass.

## C01 — Types nền và ID

`src/types/story.ts` là nguồn Locale, QualityTier, Vec3, StoryChapter, Hotspot, CameraPose, LightingPreset, ContactChannel và ContactConfig theo integration spec. `src/types/runtime.ts`, `scene.ts`, `telemetry.ts` chứa types chuyên biệt bên dưới và chỉ import type từ story. Không khai báo một bản Locale/StoryChapter khác trong từng worker.

Phase 1 chapter IDs: exterior, approach, entrance, living, garden, finale. Biên: 0/.15/.27/.39/.68/.87/1; half-open trừ cuối. Hotspot IDs: travertine-wall/sliding-glass/garden-tree; activationRange là **local progress**, tương ứng [.15,.60]/[.42,.92]/[.20,.75]. Ranges hình ảnh là đề xuất tuning, thay đổi phải được integrator cập nhật config và evidence.

Đơn vị 1m, Y-up, origin ngưỡng cửa (0,0,0), +Z về vườn. Camera lens seed 42mm, sensor width36mm; quaternion tuple [x,y,z,w]. ID không phụ thuộc ngôn ngữ, chất lượng render hoặc tên mesh mỹ thuật.

## C02 — Dictionary và copy props

W02 tạo shape; W03 điền toàn bộ nội dung. Không route/UI worker tự thêm key.

```ts
type ChapterCopy = { title:string; story:string; intention:string; principles:readonly string[]; materials:string; light:string; imageAlt:string };
type HotspotCopy = { title:string; categoryLabel:string; description:string; rationale:string; insight:string; triggerLabel:string };
type Dictionary = {
  brand:{name:string;tagline:string;supporting:string;conceptLabel:string};
  navigation:{skipContent:string;skipContact:string;languageLabel:string};
  controls:{start:string;staticMode:string;enableSound:string;muteSound:string;closeDetails:string;progressLabel:string};
  services:{title:string;description:string};
  chapters:Record<ChapterId,ChapterCopy>;
  hotspots:Record<HotspotId,HotspotCopy>;
  contact:{title:string;description:string;cta:string;unconfigured:string;channels:Record<ContactChannel,string>};
  status:{loading:string;fallback:string;audioLoading:string;audioUnavailable:string;audioPaused:string};
  metadata:{title:string;description:string;ogTitle:string;ogDescription:string;ogAlt:string};
};
declare function parseLocale(value:string):Locale|null;
declare function getDictionary(locale:Locale):Promise<Dictionary>;
```

ChapterId/HotspotId unions lấy từ config const đã validate, không từ dữ liệu tùy ý của người dùng. Chapter.copyKey luôn `chapters.${id}`, Hotspot.copyKey `hotspots.${id}`. W02 có typed fixtures đủ key với nhãn **test-only**, không import test fixture vào app để che nội dung chưa viết. Dictionary thật phải qua W03.

## C03 — Story validation không phụ thuộc module chưa có

```ts
type StoryValidationInput = {
  chapters:readonly StoryChapter[];
  hotspots:readonly Hotspot[];
  registries:{lighting:readonly string[];audio:readonly string[];zones:readonly string[];posters:readonly string[]};
  resources:Record<ChapterId,{zoneId:string;posterKey:string}>;
  localeKeys:Record<Locale,readonly string[]>;
};
declare function sampleChapter(chapters:readonly StoryChapter[],p:number):StoryChapter;
declare function validateStory(input:StoryValidationInput):string[];
```

W02 định danh lighting `golden`/`sunset`/`dusk`; audio `outdoor`/`threshold`/`indoor`/`garden`; zone `exterior`/`entrance`/`living`/`garden`; poster key là sáu chapter IDs. **Definition validation** của `validateStory` chỉ kiểm cấu trúc/key references tới ID đã khai báo; W04/W13 có thể pass phần này trước khi triển khai mọi preset. Kết quả phải ghi `definition-only`, không ngụ ý preset/file sẵn sàng. W13 scene baseline vẫn phải dùng shell/proxy và light tối thiểu có thật; không ship mock dưới tên implementation thật.

**Runtime-resource validation** là nghĩa vụ riêng do W25 sở hữu: tạo `scripts/validate-runtime-resources.mjs` cùng `tests/unit/runtime-resources.test.ts`, đối chiếu declared IDs với exports/registries thực và manifest URI; kiểm file tồn tại, đúng định dạng, provenance, và browser load/decode qua flow thật. Thiếu implementation/payload không được thay bằng danh sách ID hay boolean tự khai pass. G2/full scene phải có cả hai verdict; G1 không chờ W18/W20/W25 nên không có vòng dependency. Release W29 chạy lại runtime-resource check trước nghiệm thu.

`cameraRange` là tuple normalized nằm trong [0,1], validator kiểm thứ tự/liền mạch theo spec, không biến tuple thành key. `resources` là mapping chapter→zone/poster ngoài StoryChapter, W02 xuất cùng `src/config/story.ts`. Slug/id duy nhất, đủ copyKey VI/EN và hotspot room đúng chapter. Build invalid phải fail; runtime nguồn p không finite giữ last valid frame ở runtime, không dùng sampler để nuốt NaN.

## C04 — Site và contact

```ts
type SiteConfig = {publicOrigin:string|null;environment:'preview'|'production'};
declare function getContactUrl(config:ContactConfig,channel:ContactChannel):string|null;
declare function validateReleaseContacts(config:ContactConfig):string[];
```

Null là dữ liệu chưa cung cấp, không href='#' hoặc link ví dụ. Preview build hợp lệ, production release fail khi thiếu kênh yêu cầu. Validators không gửi tin, không suy ra ownership chỉ từ hostname. Thông tin chủ sở hữu xác minh được ghi bằng evidence riêng.

## C05 — DOM/component boundaries

Chỉ W06 sở hữu semantic sections: `main#main-content`, mỗi chapter `section#<chapter-id>`, detail `details#detail-<hotspot-id>`, duy nhất `section#contact`. `Finale` không tự tạo contact section thứ hai. Overlay là phần trình bày dùng cùng copy, không copy một semantic tree khác cho crawler.

```ts
type ShellProps = {locale:Locale;copy:Dictionary;activeChapterId:ChapterId|null};
type StorySectionsProps = {chapters:readonly StoryChapter[];copy:Dictionary;contacts:ContactConfig};
type ContactSectionProps = {copy:Dictionary['contact'];contacts:ContactConfig};
type ZoneProps = {tier:Exclude<QualityTier,'fallback'>};
type ExperienceHostProps = {locale:Locale;copy:Dictionary;chapters:readonly StoryChapter[];hotspots:readonly Hotspot[]};
```

W13 là composition root đầu tiên; W25 nối zone/light/audio/quality/modal, W28 nối metadata/events. Worker không thêm provider vào page để demo riêng. Có thể thử component trong harness test cục bộ; harness không được vô tình ship vào production.

Root layouts: `[locale]/layout.tsx` dựng `<html lang={locale}>`; `(entry)/layout.tsx` dựng trang vào `/`. Không root layout chung lồng html/body. Context/props giữ client/server boundary, types không kéo import Three vào HTML.

## C06 — Rail và shell

```ts
declare function sampleRail(p:number):CameraPose;
type RailDerivative = {metersPerProgress:number;radiansPerProgress:number};
declare function sampleRailDerivative(p:number):RailDerivative;
type ClearanceIssue = {p:number;obstacleId:string;distanceM:number};
declare function validateRailClearance(samples:readonly CameraPose[],obstacles:readonly ClearanceObstacle[]):readonly ClearanceIssue[];
type ClearanceObstacle = {id:string;min:Vec3;max:Vec3};
```

ClearanceObstacle là collision proxy bảo thủ. W08 kiểm fixture corridors, W13 kiểm shell thực; không đạt fixture rồi bỏ shell validation. Position/look-at ở world coords, same p → same pose cả tiến/lùi. Đạo hàm dùng để cap tiến độ theo m/s và rad/s, clamp dt và giới hạn acceleration tại W12.

Các cửa/anchor theo SCENE_ARCHITECTURE, stable IDs của hotspot có trong W10 proxy từ đầu, kể cả garden-tree. W14/W15/W19 chỉ tăng chi tiết trong bounds, không đổi connector âm thầm. Thay model giữ root/scale/anchor.

## C07 — Manifest, loader và resource ownership

```ts
import type { Object3D } from 'three';
type ZoneManifestEntry = {id:string;assetUri:string|null;encodedBytes:number;bounds:{min:Vec3;max:Vec3};origin:Vec3;dependencies:readonly string[];licenseRecordIds:readonly string[]};
type ZoneHandle = {id:string;ready:boolean;root:Object3D;release():void};
type ZoneLoader = {acquire(zone:ZoneManifestEntry,signal:AbortSignal):Promise<ZoneHandle>};
type ZoneManager = {update(p:number,direction:-1|0|1):void;dispose():void};
type ZoneManagerDeps = {loader:ZoneLoader;zones:readonly ZoneManifestEntry[];budgetBytes:number;maxDetailZones:number;chapterZones:Record<ChapterId,string>;onResidentChange(handles:readonly ZoneHandle[]):void;onCoreFailure(error:Error):void};
declare function createZoneManager(deps:ZoneManagerDeps):ZoneManager;
```

`assetUri:null` nghĩa procedural proxy có thật, không tải GLB giả; record byte0 chỉ cho không có network asset, GPU residency vẫn tính riêng. Registry sở hữu resource chung và refcount; consumers chỉ release handle. Shell pin, active không evict, neighbor còn trong budget; context loss vô hiệu GPU handle. Loader nhận registry `createProxy(zoneId:string):Object3D` qua constructor/dependency injection; ZoneHandle.root là clone instance để renderer mount, không clone/dispose shared material tùy tiện. `onResidentChange` phát khi tập resident đổi, không mỗi frame. Import Object3D chỉ là type; không được kéo renderer vào HTML route.

## C08 — Một runtime, modal và navigation

```ts
type StorySnapshot = {
  frameId:number;rawScrollProgress:number;renderedStoryProgress:number;
  chapterId:ChapterId;localProgress:number;direction:-1|0|1;
  mode:ExperienceMode;staticReason:'reduced-motion'|'user'|'unsupported'|'load-error'|'performance'|null;
  qualityTier:QualityTier;
};
type FreezeToken = {id:number;raw:number;rendered:number;scrollY:number};
type StoryRuntime = {
  getSnapshot():Readonly<StorySnapshot>;
  setScrollTarget(p:number):void;
  tick(dtSeconds:number):Readonly<StorySnapshot>;
  freeze(scrollY:number):FreezeToken;
  resume(token:FreezeToken,reason:'close'|'navigate'):void;
  restore(chapterId:ChapterId,localProgress:number):void;
  subscribeChapter(listener:(snapshot:Readonly<StorySnapshot>)=>void):()=>void;
  setMode(mode:ExperienceMode,reason:StorySnapshot['staticReason']):void;
  setQualityTier(tier:QualityTier):void;
  dispose():void;
};
type StoryRuntimeDeps = {
  chapters:readonly StoryChapter[];
  initialProgress:number;
  sampleRailDerivative:(p:number)=>RailDerivative;
  limits:{maxIndoorMps:number;maxOutdoorMps:number;maxRadiansPerSecond:number;maxAccelerationMps2:number;maxDtSeconds:number};
};
declare function createStoryRuntime(deps:StoryRuntimeDeps):StoryRuntime;
```

W12 sở hữu `createStoryRuntime` theo config/rail đã chốt, một rAF owner. W13 nối ScrollTrigger chỉ ghi raw target. Frame consumers gọi snapshot cùng frame, React store chỉ cập nhật discrete state. `freeze` giữ pose/light, khóa native background tại modal adapter; `resume(close)` reset clock/velocity và dùng raw/native đã lưu; `navigate` hủy restore cũ.

Các types Runtime/FreezeToken/VisibilityInput nằm ở `src/types/runtime.ts`; RailDerivative/ClearanceObstacle/zone types ở `src/types/scene.ts`; Dictionary và copy types ở `src/types/story.ts`. Không suy đoán constructor: `createAudioController` nhận audio config và injected context/fetch factory; W02 khóa chữ ký đó trước W20, theo AUDIO_SPEC. Đầu vào story runtime không tự import window/DOM; adapter sở hữu scroll restore/native locks.

Locale handoff key đề xuất `havenart:locale-handoff:v1` trong sessionStorage, không analytics storage; payload `{schemaVersion:1,fromLocale,toLocale,chapterId,localProgress,mode,targetAnchor,createdAtMs}`. TTL 5 phút, consume-once sau khi target locale/route match; sai schema, stale hoặc storage lỗi bỏ an toàn, HTML vẫn dùng được. targetAnchor chỉ chapter/contact allowlist, không URL tùy ý. Renderer restore xong trước reveal. Audio tắt sau route đổi.

History restoration dùng namespace `history.state.havenart` theo **entry**, giữ nguyên keys router hiện có. Session handoff chỉ phục vụ đổi locale, không ghi đè Back/Forward. W24 test hard navigation và popstate; không nhân listener hay giữ dữ liệu cá nhân.

## C09 — Hotspot visibility và UI

```ts
type VisibilityInput = {activeRoom:string;room:string;distanceM:number;maxDistanceM:number;inFrustum:boolean;occluded:boolean;inActivationRange:boolean};
declare function isHotspotVisible(input:VisibilityInput):boolean;
```

W16 chỉ predicate, W17 chịu projection/raycast và DOM accessibility; raycast glass occlusion policy phải được kiểm bằng fixture. Marker đang focus không biến mất vô cớ; trả focus detail DOM khi scene mất. Dialog shared nhận hotspot/copy và runtime freeze/resume, không tạo camera pose riêng.

## C10 — Lighting, audio, performance, analytics

```ts
declare function sampleLighting(p:number):LightingPreset;
type AudioController = {enable():Promise<boolean>;disable():void;setProgress(p:number):void;dispose():void};
type QualityWindow = {medianMs:number;p95Ms:number;slowWindows:number;cooldownRemainingMs:number;warmedUp:boolean};
declare function chooseTier(current:QualityTier,window:QualityWindow):QualityTier;
declare function emit(event:AnalyticsEvent):void;
```

W02 chuyển union đầy đủ của [ANALYTICS_SPEC](../ANALYTICS_SPEC.md) thành telemetry type: envelope schemaVersion/sequence/locale/mode/chapterId/elapsedMs và đủ 10 event. Event mode mapping tách runtime mode; no PII, no-op production. Event bridge của W28 sở hữu phát sự kiện, helpers không tự gắn global listener.

Audio chỉ import/init sau gesture; failed enable=false và mute; setProgress dùng rendered p khi cinematic, chương DOM khi static có opt-in. Quality thresholds/warm-up/cooldown từ PERFORMANCE_BUDGET, không tự phát minh ngưỡng khác cho mỗi consumer. Registry IDs của lighting/audio đã định W02; owner module cung cấp cùng IDs.

W20 sở hữu ba asset `public/audio/outdoor.ogg`, `interior.ogg`, `garden.ogg` cùng audio config/controller/test. `threshold` là blend outdoor/interior, không cần file thứ tư. Sample phải có thật, decode và loop kiểm được, nguồn CC0/public-domain hoặc nguyên gốc có provenance; tổng nén mục tiêu ≤1,5 MB. W20 nộp source/creator/license/attribution/file/modifications/checksum trong report; W25 là owner ghi `ASSET_LICENSES.md`. Thiếu nguồn hợp lệ giữ nghĩa vụ audio blocked, không fake file/URL hoặc ngầm bỏ audio để pass.

## Local acceptance và nghĩa vụ tích hợp

Một module có thể `integrated` khi local spec/quality/tests pass trên candidate và có stub/test injection hợp lệ cho consumer chưa có. Kiểm chứng cần toàn scene được ghi rõ trong `integrationChecks` của manifest và owner downstream; không tuyên bố đã pass, cũng không tạo vòng phụ thuộc bằng cách đợi consumer xong mới cho module tồn tại. `accepted` chỉ khi cả local lẫn nghĩa vụ tích hợp đã hoàn tất.

G1 W13 kiểm actual shell+rail; G2 W25 kiểm actual art/hotspots/audio/locale; G3 W26/W27 đo môi trường xấu và máy thật; G4 W30 đối chiếu đủ 18 AC. Missing contacts/domain giữ code modules integrated nhưng release/G4 chưa đạt, không khóa mọi công việc độc lập.
