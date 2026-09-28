# HavenArt Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hành trình HavenArt Phase 1 có camera liên tục, VI/EN, hotspot, vườn và liên hệ, cùng một trải nghiệm HTML hoàn chỉnh trên máy không chạy 3D.

**Architecture:** HTML được dựng sẵn tại build; Canvas tải riêng như lớp tăng cường. Một runtime điều khiển tiến độ hiển thị, từ đó suy ra camera, chương, ánh sáng, hotspot và âm thanh; zone/asset thay độc lập qua manifest.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Three.js, R3F, drei, GSAP/ScrollTrigger, Zustand, Tailwind; npm, Vitest, Playwright.

**Spec:** [Đặc tả tích hợp](../specs/2026-09-27-havenart-design.md), [master brief](../../reference/HAVENART_MASTER_BUILD_PROMPT.md), các tài liệu chuyên đề trong `docs/`.

## Global Constraints

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

## Cách thực hiện

**Cập nhật phối hợp agent ngày 28/09/2026:** T01–T20 là phạm vi tính năng tham chiếu. Đơn vị giao việc hiện hành là [W01–W36](../../agents/TASK_BOARD.md), [manifest](../../agents/work-packages.json) và [CONTRACTS](../../agents/CONTRACTS.md). Write set, thứ tự dependency và cách mount module trong W thay thế bản T khi khác nhau; không giao hai hệ cùng lúc. Các điều chỉnh đã giải quyết type chung T04/T05, registry validator, gate WebGL trước scene, anchor garden sớm, và E2E static server từ scaffold.

Đây là kế hoạch chưa thực thi. Đường dẫn file và lệnh bên dưới là đầu ra dự kiến, không phải file/test đã tồn tại. Task có thể kéo dài nhiều giờ; chia việc trong task thành từng thay đổi nhỏ có thể kiểm tra. Code mẫu xác định thuật toán, hợp đồng hoặc kiểm tra quan trọng; phần tạo hình tuân theo storyboard và cần review hình ảnh thật.

Đọc spec trước từng nhóm. Chỉ logic có rủi ro mới cần vòng test đỏ → xanh; tài liệu, token thẩm mỹ và cấu hình cơ bản được kiểm tra build/nhìn trực tiếp. Mỗi task có một commit rõ nghĩa sau khi nghiệm thu; chỉ khởi tạo Git lúc bắt đầu đợt triển khai nếu workspace vẫn chưa có repository.

Chia thành ba phần có đầu ra dùng được: T01–T04 là website HTML; T05–T12 là cinematic slice có fallback; T13–T17 là hoàn thiện âm thanh, hiệu năng và phát hành. T18–T20 thuộc Phase 2, không kéo vào mốc phát hành Phase 1.

## T01 — Nền tảng có thể build và bộ kiểm tra

**Files:** tạo `package.json`, `package-lock.json`, `.node-version`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `src/app/(entry)/layout.tsx`, `src/app/(entry)/page.tsx`, `src/styles/globals.css`, `.gitignore`.
**Consumes:** TECH_DECISIONS; workspace không có code. **Produces:** các script chuẩn và điểm vào HTML; không đặt renderer ở root layout.

- [ ] Kiểm tra runtime và peer dependencies trước khi chọn exact versions:

```powershell
node --version
npm view next version engines peerDependencies
npm view @react-three/fiber@9 peerDependencies
npm view @react-three/drei peerDependencies
```

- [ ] Ghi bộ version đã chọn trong TECH_DECISIONS, cài với `--save-exact`, giữ một `package-lock.json`. Chọn React/React DOM cùng phiên bản và R3F major tương thích; không nâng tất cả package chỉ để dập lỗi peer.
- [ ] Cấu hình static export, strict TypeScript, Tailwind và ESLint. Script cần có:

```json
{"dev":"next dev","build":"next build","lint":"eslint .","typecheck":"tsc --noEmit","test":"vitest run","test:e2e":"playwright test"}
```

```ts
// next.config.ts
import type { NextConfig } from 'next';
const config: NextConfig = { output: 'export', images: { unoptimized: true } };
export default config;
```

- [ ] Route group `(entry)` phục vụ `/` với root layout `<html lang="vi">` và link `/vi`; không tạo `src/app/layout.tsx` chung. T02 đặt root layout có lang riêng dưới `[locale]`; không lồng html/body. Không dùng middleware hoặc redirect Next runtime trong static export.
- [ ] Chạy `npm run typecheck`, `npm run lint`, `npm run build`; đầu ra `out/index.html`, không có lỗi TypeScript. Thiết lập test config nhưng không thêm bài test khẳng định file tồn tại vô ích.
- [ ] Commit `chore: establish static Next foundation`.

## T02 — Locale, dictionary và HTML hoàn chỉnh

**Files:** tạo `src/types/story.ts` với Locale ban đầu, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/lib/i18n/locale.ts`, `src/lib/i18n/dictionary.ts`, `src/content/vi/messages.ts`, `src/content/en/messages.ts`, `src/components/story/StorySections.tsx`, `tests/unit/locale.test.ts`, `tests/e2e/static-story.spec.ts`.
**Consumes:** T01, I18N_SPEC, USER_JOURNEY. **Produces:** `Locale`, `parseLocale(value:string):Locale|null`, `getDictionary(locale:Locale)`, sáu section và dịch vụ/liên hệ trong HTML.

- [ ] Viết test locale hợp lệ/không hợp lệ, dictionary thiếu key bị phát hiện; chạy `npm run test -- tests/unit/locale.test.ts`, mong đợi đỏ trước khi có helper.

```ts
import { expect, test } from 'vitest';
import { parseLocale } from '../../src/lib/i18n/locale';
test('does not silently accept unsupported routes', () => {
  expect(parseLocale('vi')).toBe('vi');
  expect(parseLocale('en')).toBe('en');
  expect(parseLocale('fr')).toBeNull();
});
```

- [ ] Triển khai helper và generateStaticParams; dictionary type suy từ VI, EN phải đủ cùng key. Route không hợp lệ trả notFound, không âm thầm dùng VI.

```ts
import type { Locale } from '../../types/story';
export const parseLocale = (value: string): Locale | null =>
  value === 'vi' || value === 'en' ? value : null;
export const generateStaticParams = () => [{ locale: 'vi' }, { locale: 'en' }];
```

- [ ] Đặt `generateStaticParams` ở `[locale]/layout.tsx` hoặc page theo Next; `parseLocale` ở lib, không gom các export vào một file. Root locale layout dùng params để xuất `<html lang={locale}>` ngay trong HTML build; kiểm hard refresh và no-JS của `/en` để không rơi về lang=vi.

- [ ] Viết VI/EN cho hero, tất cả sáu story, ba chi tiết, nút, lỗi tải, audio, chế độ và accessibility labels theo brief; đọc lại bản dịch. Nội dung thương hiệu chưa xác nhận không biến thành claim.
- [ ] Tạo E2E tắt JavaScript: mở `/vi`, đọc H1, tìm section living, garden và `#contact`; mở `/en` thấy English tương ứng. Cả hai có heading order đúng.
- [ ] Chạy unit, E2E static và build; inspect HTML xuất ra không cần canvas; commit `feat: add complete bilingual static story`.

## T03 — Shell, token và đổi ngôn ngữ

**Files:** tạo `src/styles/tokens.css`, `src/components/ui/BrandHeader.tsx`, `LanguageSwitcher.tsx`, `src/components/story/StoryOverlay.tsx`, `src/stores/experienceStore.ts`, `tests/e2e/language.spec.ts`.
**Consumes:** T02, UX_STORYBOARD. **Produces:** header nhẹ, focus visible, shell responsive; state discrete `{locale,activeChapterId,openHotspotId,mode,qualityTier,audioEnabled}`.

- [ ] Đặt token màu ấm/trung tính, typography có đầy đủ dấu Việt, tối đa hai font families; bắt đầu một font open-license. Không đưa font vào build trước khi license được ghi.
- [ ] Tạo shell có wordmark, ngôn ngữ, âm thanh mặc định tắt, liên hệ; icon có label trong dictionary. Trên mobile giữ nút chạm đủ lớn và tránh che CTA.

```tsx
<a href="#contact">{copy.cta}</a>
<a href={locale === 'vi' ? '/en' : '/vi'} hrefLang={locale === 'vi' ? 'en' : 'vi'}>
  {locale === 'vi' ? 'English' : 'Tiếng Việt'}
</a>
```

- [ ] Tạo test đổi `/vi` → `/en` → `/vi`, kiểm tra lang và key CTA; chạy đỏ rồi hoàn thiện. Khi T08 có progress, nâng test để giữ `{chapterId,localProgress}` trong session state, không dùng cùng scrollY giữa hai bản chữ dài khác nhau.
- [ ] Kiểm tra trực tiếp 360/390/768/1440 px, zoom 200%, tên nút đọc được; không viết snapshot cho từng class CSS. Chạy language smoke và commit `feat: add restrained accessible brand shell`.

## T04 — Liên hệ trung thực và cấu hình phát hành

**Files:** bổ sung ContactChannel/ContactConfig vào `src/types/story.ts`; tạo `src/config/contacts.ts`, `src/config/site.ts`, `src/lib/contact.ts`, `src/components/ui/ContactSection.tsx`, `tests/unit/contact.test.ts`.
**Consumes:** T02–T03. **Produces:** `ContactConfig`, `getContactUrl(config,channel):string|null`, `validateReleaseContacts(config):string[]`.

- [ ] Viết test null, URL sai giao thức, hostname giả mạo và URL thật hợp lệ từ fixture rõ nhãn test; chạy đỏ trước helper.

```ts
import { expect, test } from 'vitest';
import { getContactUrl } from '../../src/lib/contact';
test('never turns unknown contacts into clickable claims', () => {
  expect(getContactUrl({ zalo: null, messenger: null, whatsapp: null }, 'zalo')).toBeNull();
});
```

- [ ] Cấu hình ban đầu dưới đây chỉ là trạng thái thiếu thông tin; ví dụ cần điền nằm trong hướng dẫn và không render như địa chỉ thật:

```ts
import type { ContactConfig } from '../types/story';
export const contacts: ContactConfig = { zalo: null, messenger: null, whatsapp: null };
```

- [ ] Parse bằng URL, chỉ HTTPS, hostname đúng allowlist kênh đã xác minh và path/account không rỗng; không chấp nhận `javascript:`, userinfo hoặc `zalo.me.evil.test`. Cho phép mở rộng allowlist qua config có review.
- [ ] Null render nhãn chưa cấu hình và không có href giả; primary CTA luôn tới contact section. Validator production báo các kênh thiếu; preview vẫn build được. Chưa có form thu PII.
- [ ] Chạy unit và kiểm tra link thật trên desktop/mobile khi được cung cấp; commit `feat: add verified contact configuration`.

## T05 — Schema story và mapping có thể kiểm tra

**Files:** bổ sung schema còn lại vào `src/types/story.ts`; tạo `src/config/story.ts`, `src/config/hotspots.ts`, `src/lib/story/validateStory.ts`, `src/lib/story/sampleChapter.ts`, `tests/unit/story.test.ts`.
**Consumes:** integration spec, T02. **Produces:** schema chuẩn; `phaseOneChapters:readonly StoryChapter[]`, `sampleChapter(chapters,p):StoryChapter`, `validateStory(config):string[]`.

- [ ] Viết boundary tests; chạy `npm run test -- tests/unit/story.test.ts` thấy thất bại khi hàm chưa có.

```ts
import { expect, test } from 'vitest';
import { phaseOneChapters } from '../../src/config/story';
import { sampleChapter } from '../../src/lib/story/sampleChapter';
test.each([[0,'exterior'],[0.15,'approach'],[0.39,'living'],[0.68,'garden'],[1,'finale']])(
  'maps boundary %s to %s', (p,id) => expect(sampleChapter(phaseOneChapters,Number(p)).id).toBe(id)
);
```

- [ ] Tạo type và sáu chapter đúng ranges spec; pure sampler dùng half-open intervals, cuối inclusive:

```ts
import type { StoryChapter } from '../../types/story';
export function sampleChapter(chapters: readonly StoryChapter[], p: number): StoryChapter {
  if (!chapters.length || !Number.isFinite(p)) throw new Error('Invalid story input');
  const value = Math.min(1, Math.max(0, p));
  return chapters.find(c => value >= c.progressStart && value < c.progressEnd)
    ?? chapters[chapters.length - 1];
}
```

- [ ] Validator từ chối gaps/overlaps, ID trùng, range không finite, missing locale keys, reference hotspot/light/audio không tồn tại; config validator chạy trước runtime nên sampler không che data hỏng. Thêm fixture invalid cho từng nhóm lỗi, không chỉ happy path.
- [ ] Chạy unit, typecheck; commit `feat: define validated data driven chapters`.

## T06 — Scene mô-đun, manifest và tải tối thiểu

**Files:** tạo `src/components/scene/SceneCanvas.tsx`, `VillaShell.tsx`, `ZoneBoundary.tsx`, `src/config/zones.ts`, `src/lib/three/assetLoader.ts`, `zoneManager.ts`, `tests/unit/zone-manager.test.ts`; cập nhật ASSET_LICENSES.
**Consumes:** T05, SCENE_ARCHITECTURE, ASSET_PIPELINE. **Produces:** root 1m/Y-up; `ZoneManager.update(p,direction)`, `dispose()`, manifest có zone IDs/anchors/bounds.

- [ ] Blockout shell: sàn/tường/trần/cột/cửa mở thật, lối vào và cửa ra vườn. Trước decor, kiểm tra ground plan và không gian đi qua; ảnh top view cùng sáu camera frames lưu trong báo cáo art.
- [ ] Làm material registry dùng chung, proxy nội thất theo tỷ lệ. SceneCanvas chỉ client dynamic import. Mỗi zone có boundary riêng, lỗi decorative model không làm hỏng HTML.

```tsx
// Khuôn cấu trúc; các module được task này tạo độc lập.
<Canvas>
  <VillaShell />
  <ZoneBoundary zoneId="exterior" />
  <ZoneBoundary zoneId="entrance" />
  <ZoneBoundary zoneId="living" />
  <ZoneBoundary zoneId="garden" />
</Canvas>
```

- [ ] Tạo fake loader có bộ đếm acquire/release; unit test active/neighbor được giữ, reverse prefetch đổi hướng, shared material còn người dùng không bị dispose. Tiêm Promise reject để test proxy và core failure.
- [ ] Shell/proxy luôn resident, chi tiết theo manifest; giới hạn tối đa số zone chi tiết và tổng byte theo PERFORMANCE_BUDGET. Không gọi dispose texture cache đang được mesh khác dùng.
- [ ] Kiểm tra tải chậm thấy poster/HTML, không canvas đen; renderer ready mới crossfade, nếu người dùng đã đi xa thì giữ static. Chạy zone tests, build, ghi số đo đầu tiên; commit `feat: add modular villa and bounded asset loading`.

## T07 — Rail liên tục và hướng nhìn

**Files:** tạo `src/config/camera.ts`, `src/lib/three/cameraRail.ts`, `tests/unit/camera-rail.test.ts`.
**Consumes:** T05–T06, CAMERA_SCROLL_SPEC. **Produces:** `sampleRail(p:number):CameraPose`, helper arc-length mapping; không tác động DOM.

- [ ] Đặt control points bằng tọa độ thế giới qua các ô cửa thật; rail vị trí và look-at tách biệt, chỉnh bằng sơ đồ và quan sát. Bắt đầu focal length 42mm; thử trong vùng 35–55mm theo composition.
- [ ] Dùng CatmullRomCurve3 centripetal, arc-length sampling, bảng nhịp chậm/nhanh đơn điệu liên tục. Quaternion lấy từ hướng nhìn ổn định Y-up; không roll; không có target trùng vị trí.

```ts
// Điểm khởi đầu cho thuật toán, các điểm cụ thể nằm trong camera config.
const positionCurve = new CatmullRomCurve3(positionPoints, false, 'centripetal');
positionCurve.updateArcLengths();
const position = positionCurve.getPointAt(railProgress);
const target = targetCurve.getPointAt(targetProgress);
```

- [ ] Test sample cùng p giống nhau dù thứ tự query tăng/giảm; pose finite; khoảng cách target >0; sample dày trước/sau biên chương không có bước nhảy; quay quaternion không đổi dấu gây flip. Chạy đỏ trước sampler, xanh sau.
- [ ] Kiểm chứng swept clearance bằng camera near-plane và bán kính an toàn trong shell, không chỉ kiểm tra tâm camera. Đi qua cửa, tránh mái khi finale nâng lên; spline overshoot phải chỉnh control points.
- [ ] Quay video tới/lùi ở blockout, review G1 sơ bộ; `npm run test -- tests/unit/camera-rail.test.ts`; commit `feat: add continuous architectural camera rail`.

## T08 — Cuộn tự nhiên và một nguồn progress

**Files:** tạo `src/lib/story/progress.ts`, `src/components/story/ScrollRuntime.tsx`, `src/hooks/useStoryRuntime.ts`, `tests/unit/progress.test.ts`, `tests/e2e/scroll-journey.spec.ts`.
**Consumes:** T03, T05, T07. **Produces:** `stepProgress(current,target,dt,maxRate):number`; `RuntimeFrame` ref và discrete chapter notifications.

- [ ] Test forward/backward, dt lớn, clamp và không overshoot trước khi làm runtime:

```ts
import { expect, test } from 'vitest';
import { stepProgress } from '../../src/lib/story/progress';
test('large scroll target remains a continuous camera move', () => {
  expect(stepProgress(0, 1, 0.016, 0.2)).toBeCloseTo(0.0032);
  expect(stepProgress(1, 0, 0.016, 0.2)).toBeCloseTo(0.9968);
});
```

- [ ] Triển khai bounded step; `maxRate` là giá trị tuning trong config, không benchmark đã đạt. Khi tab ẩn, pause clock, khi trở lại cap dt tránh catch-up lớn.

```ts
export function stepProgress(current:number,target:number,dt:number,maxRate:number):number {
  const delta = Math.max(-maxRate * dt, Math.min(maxRate * dt, target - current));
  return Math.min(1, Math.max(0, current + delta));
}
```

- [ ] ScrollTrigger chỉ ghi raw target và refresh bounds; rAF/R3F frame update có một owner dùng stepProgress, rồi sampleRail/light/chapter. Easing cục bộ do camera config; không thêm hai lớp scrub/damping khó dự đoán.
- [ ] Primitive `stepProgress` chỉ giới hạn bước normalized; runtime phải tính maxRate từ đạo hàm quãng đường/góc quay theo p. Lấy min của `maxMetersPerSecond / |dPosition/dp|` và `maxRadiansPerSecond / |dAngle/dp|`, bảo vệ đạo hàm gần 0; giới hạn thay đổi vận tốc theo gia tốc trong CAMERA_SCROLL_SPEC. Test đổi hướng không flip vận tốc tức thời, và tốc độ world thực tế không vượt ngưỡng dù mật độ rail không đều.
- [ ] Kiểm tra wheel/trackpad/touch/keyboard/Home/End; lúc raw nhảy camera vẫn đi rail, text/hotspot theo rendered p. CTA HTML không phải đợi camera. Không chặn preventDefault toàn trang.
- [ ] Resize, URL hash, đổi locale giữ chapter/local progress hợp lý; không đổi điểm nhìn đang lộ canvas. Cleanup trigger/listener khi route đổi; test mount-unmount lại không nhân event.
- [ ] Chạy progress unit và scroll smoke; commit `feat: synchronize scroll and cinematic runtime`.

## T09 — Ngoại thất, entrance và living đạt chuẩn thị giác

**Files:** tạo `src/components/scene/zones/Exterior.tsx`, `Entrance.tsx`, `Living.tsx`, `src/config/materials.ts`; cập nhật `docs/UX_STORYBOARD.md`, `docs/reports/ART_REVIEW.md` khi thực hiện.
**Consumes:** T06–T08. **Produces:** ba zone thay cho proxy chi tiết, cùng anchor và world origin.

- [ ] Chốt ba bố cục keyframe theo storyboard: exterior thấy mass/landscape; entrance chuyển nén→mở; living nhìn xuyên cửa kính ra vườn. Điều chỉnh shell/rail nếu bố cục sai trước thêm props.
- [ ] Làm gỗ/đá/vữa/kính có roughness và texture scale theo mét; thêm sofa proxy có tỷ lệ, nếp lớp có tiết chế. Không đưa asset 4K không có lý do.

```tsx
<meshStandardMaterial color="#b8aa96" roughness={0.8} metalness={0} />
```

- [ ] Kiểm tra bằng ảnh cố định tại p=0.08/0.33/0.53 và mobile crop: tỷ lệ xây được, vật liệu đọc được, không cháy cửa kính, chữ tương phản. Màu ví dụ trên chỉ là điểm xuất phát để art review.
- [ ] Cập nhật license mọi file nhập; kiểm tra debug renderer stats ngay sau mỗi asset lớn. Không viết unit test để khẳng định màu đá.
- [ ] Xuất poster nguyên gốc từ scene đã duyệt ở exterior/approach/entrance/living, có bản desktop/mobile trong `public/images/story/`; ghi nguồn các asset phụ thuộc. Đây là ảnh thực cho static/loader, không ảnh từ studio khác.
- [ ] Chủ trì/kiến trúc sư review ảnh + video, ghi quyết định thay đổi; commit `feat: compose exterior entrance and living scenes`.

## T10 — Hotspot giải thích thiết kế

**Files:** tạo `src/lib/story/hotspotVisibility.ts`, `src/components/hotspots/HotspotButton.tsx`, `HotspotPanel.tsx`, `DetailList.tsx`, `tests/unit/hotspot.test.ts`, `tests/e2e/hotspot.spec.ts`; cập nhật config T05.
**Consumes:** T05, T08–T09, HOTSPOT_SPEC. **Produces:** `isHotspotVisible(input):boolean`, open/close state cho một panel; ba điểm travertine-wall/sliding-glass/garden-tree.

- [ ] Type visibility input `{activeRoom:string,room:string,distanceM:number,maxDistanceM:number,inFrustum:boolean,occluded:boolean,inActivationRange:boolean}`; test room sai/xa/che khuất/ngoài range đều false.

```ts
return input.activeRoom === input.room && input.inActivationRange &&
  input.distanceM <= input.maxDistanceM && input.inFrustum && !input.occluded;
```

- [ ] Occlusion raycast theo nhóm kiến trúc, throttle và tránh tính trên mọi mesh mỗi frame; kính cần quy ước trong suốt cho raycast. Click hotspot tương ứng DOM button, không chỉ sprite.
- [ ] Panel có title/category/lý do chọn/design insight VI/EN; chọn dialog modal chung, trap focus, Escape/outside/close và trả focus. Mở modal khóa cuộn nền và giữ rendered p. Đóng thì restore native/raw, reset dt/velocity rồi tiếp tục từ pose đang giữ; không đóng bất ngờ do tier đổi hoặc tải asset xong. Điều hướng tới CTA/locale đóng modal qua luồng riêng và hủy restore cũ.
- [ ] E2E dùng bàn phím mở chi tiết từ DOM, Escape đóng và kiểm tra focus; không hover bắt buộc trên mobile. Danh sách DetailList cho static/reduced motion vẫn đủ ba chi tiết.
- [ ] Chạy unit/E2E, kiểm tra trực tiếp tab order; commit `feat: add accessible architectural hotspots`.

## T11 — Ánh sáng và chuyển động môi trường

**Files:** tạo `src/config/lighting.ts`, `src/lib/three/sampleLighting.ts`, `src/components/scene/LightingRig.tsx`, `EnvironmentalMotion.tsx`, `tests/unit/lighting.test.ts`.
**Consumes:** T05, T08–T09, LIGHTING_SPEC. **Produces:** `sampleLighting(p:number):LightingPreset` và scene áp dụng preset nội suy.

- [ ] Đặt late golden hour→sunset→early dusk; practical lights tăng nhẹ, exposure không nhảy. Kiểm tra cửa vào/ra là chỗ dễ bị cháy sáng.
- [ ] Hàm thuần nội suy theo keyframe; test p giống nhau khi tăng/giảm cho cùng kết quả, tại biên sai số nhỏ, không intensity âm.

```ts
const mix = (a:number,b:number,t:number) => a + (b-a) * t;
const smooth = (t:number) => t*t*(3-2*t);
```

- [ ] Nội suy hướng sun bằng vector/quaternion chuẩn hóa; màu trong color space đúng; environment map đổi chỉ khi có chiến lược blend đủ rẻ, không snap HDRI. Không animate mọi object cùng lúc.
- [ ] Leaf sway/nước nhẹ, tier thấp tắt motion decorative/shadow phụ. Tone mapping cấu hình một nơi; postprocessing chỉ thêm sau ảnh so sánh và đo GPU.
- [ ] Chạy lighting tests và ghi video tới/lùi cùng keyframes; commit `feat: add subtle sunset lighting story`.

## T12 — Garden, finale và hoàn chỉnh câu chuyện

**Files:** tạo `src/components/scene/zones/Garden.tsx`, `src/components/story/Finale.tsx`, `tests/e2e/phase-one.spec.ts`; cập nhật camera/story/materials/locale.
**Consumes:** T04, T08, T10–T11. **Produces:** tuyến liên tục qua cửa kính ra vườn, final reveal, CTA đầy đủ.

- [ ] Nối living với garden bằng cửa mở đủ clearance; final pullback/rise chỉ sau khi ra ngoài mái. Cây, ánh sáng ấm trong nhà, nền trời mát tạo kết, không thêm cả hồ/cây/đèn động nếu làm quá tải.
- [ ] Garden-tree có nội dung về che nắng/vi khí hậu; không mô tả dự án concept như số liệu thực tế. Finale hiển thị câu kết và contact section từ T04.
- [ ] Xuất `public/images/story/garden-desktop.webp`, `garden-mobile.webp`, `finale-desktop.webp`, `finale-mobile.webp` cùng các poster T09; tạo `public/images/og-havenart.jpg` 1200×630 từ render đã duyệt. Nén, kiểm crop/alt/license và thay mọi poster tạm trước G2.
- [ ] E2E chạy full sequence dùng test fixture contact, không nhấn gửi tin thật:

```ts
await page.goto('/vi');
await page.getByRole('link', { name: 'Liên hệ kiến trúc sư' }).first().click();
await expect(page.locator('#contact')).toBeInViewport();
```

- [ ] Ghi video cinematic full tới/lùi; mở cả ba hotspots; locale đổi không làm mất khả năng liên hệ. Kiểm tra CTA trước/mid/final không popup thúc ép.
- [ ] G2: review câu chuyện hoàn chỉnh, ghi rủi ro art/perf còn lại; commit `feat: complete garden finale and consultation journey`.

## T13 — Âm thanh bật theo chủ ý

**Files:** tạo `src/lib/audio/audioController.ts`, `src/config/audio.ts`, `tests/unit/audio.test.ts`, `tests/e2e/audio.spec.ts`; cập nhật nút audio và asset registry.
**Consumes:** T08, T11–T12, AUDIO_SPEC. **Produces:** `enable():Promise<boolean>`, `disable():void`, `setProgress(p:number):void`, `dispose():void`.

- [ ] Fake AudioContext test: trước enable không fetch/decode/play; enable reject trả false; disable/suspend tab đưa gain về 0. Chạy đỏ rồi tạo controller.
- [ ] Click/touch gọi resume trong user gesture, tải âm có license, dùng gain crossfade. Không bật lại chỉ vì localStorage từng bật; mỗi phiên có hành động rõ ràng.

```ts
const exteriorGain = Math.cos(blend * Math.PI / 2);
const interiorGain = Math.sin(blend * Math.PI / 2);
```

- [ ] Dùng rendered p cho blend tới/lùi; visibility hidden suspend, quay lại chỉ resume nếu phiên vẫn được người dùng bật và browser cho phép. Lỗi file/audio context trả UI tắt có nhãn, story vẫn chạy.
- [ ] Unit, E2E no-autoplay và nghe thật trên desktop/iOS; commit `feat: add optional ambient audio`.

## T14 — Adaptive quality, asset bytes và bộ nhớ

**Files:** tạo `src/config/quality.ts`, `src/lib/performance/qualityPolicy.ts`, `frameMonitor.ts`, `scripts/measure-payload.mjs`, `tests/unit/quality.test.ts`; cập nhật zoneManager, docs/reports/PERFORMANCE.md khi đo.
**Consumes:** T06–T13, PERFORMANCE_BUDGET. **Produces:** high/medium/low/fallback, bounded monitoring, bảng đo tải và GPU.

- [ ] Tạo pure policy `chooseTier(current:QualityTier,window:{medianMs:number,p95Ms:number,slowWindows:number,cooldownRemainingMs:number,warmedUp:boolean}):QualityTier` theo PERFORMANCE_BUDGET. Frame monitor loại background/resize, đếm hai cửa sổ liên tiếp; policy không đổi tier khi warm-up chưa xong hoặc cooldown còn dương. Test sustained slow mới downgrade, một frame spike không downgrade, không tự nâng tier.
- [ ] Áp dụng DPR, shadows, geometry, postprocess theo tier. Không chuyển camera rail hoặc story ID khi downgrade. Low vẫn chậm kéo dài thì chuyển static có lý do.

```ts
const dprByTier = { high: 1.5, medium: 1.25, low: 1, fallback: 1 };
```

- [ ] Measure payload theo network requests thực sự của cold load: core3D, total initial scene, DOM/JS/poster/audio riêng. Cộng compression thực tế; texture upload memory khác dung lượng mạng.
- [ ] Chạy trên các thiết bị trong performance spec, ghi p50/p95 frame time, renderer calls/triangles, long task, context loss và bộ nhớ sau ba vòng đi/lùi. So sánh trước/sau tối ưu trong cùng điều kiện.
- [ ] Chạy quality tests, asset-size report; G3 hiệu năng chỉ pass khi có bằng chứng máy thật, ngoại lệ ghi rõ; commit `perf: enforce adaptive rendering and asset budgets`.

## T15 — Mobile, reduced motion và fault recovery

**Files:** tạo `src/components/story/ExperienceGate.tsx`, `src/lib/performance/selectMode.ts`, `tests/unit/mode.test.ts`, `tests/e2e/fallback.spec.ts`, `tests/e2e/mobile.spec.ts`.
**Consumes:** T02–T14, ACCESSIBILITY_SPEC. **Produces:** `selectMode({reducedMotion,webglAvailable,userStatic}):'static'|'loading'`, loading/error transitions không phá nội dung.

- [ ] Test ba điều kiện reduced motion, user static, WebGL unavailable đều static, còn lại loading. Chạy đỏ trước helper:

```ts
export function selectMode(input:{reducedMotion:boolean;webglAvailable:boolean;userStatic:boolean}) {
  return input.reducedMotion || input.userStatic || !input.webglAvailable ? 'static' : 'loading';
}
```

- [ ] Match reduced motion/user static trước dynamic import renderer. Chế độ chưa biết ở SSR vẫn render HTML; hydrate không flash canvas. Với lỗi phát sinh sau import thì hủy đúng resource/listener.
- [ ] E2E `reducedMotion:'reduce'` kiểm tra không request chunk renderer/GLB, toàn bộ story và details/CTA; giả lỗi WebGL bằng dependency injection test adapter, không sửa global production.
- [ ] Fault matrix: GLB reject→proxy; texture reject→material dự phòng; core/context fail→static; audio fail→mute; config invalid→build fail. Retry giới hạn, giữ section/focus. Fallback không kéo theo 100 viewport trống.
- [ ] Thử màn hình xoay, thanh địa chỉ mobile co giãn, scroll ngược, tăng cỡ chữ, chạm liên hệ, Safari iPhone thật. Mock mobile chỉ kiểm layout; không thay bằng chứng FPS.
- [ ] Unit + fallback/mobile smoke; commit `feat: complete resilient mobile and static modes`.

## T16 — SEO và event abstraction

**Files:** tạo `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/seo/metadata.ts`, `src/lib/analytics/events.ts`, `tests/unit/events.test.ts`, `tests/e2e/seo.spec.ts`; cập nhật locale metadata.
**Consumes:** T02, T04, T08, T10, T12–T15, SEO_SPEC, ANALYTICS_SPEC. **Produces:** metadata/OG/canonical/hreflang cho origin thật; `emit(event:AnalyticsEvent):void` no-op adapter mặc định.

- [ ] Sitemap chỉ /vi /en thật; preview noindex; root policy và canonical nhất quán. Schema doanh nghiệp chỉ có trường được xác nhận; không dựng rating/review.
- [ ] Define AnalyticsEvent union đủ mười event brief; payload allowlist locale/chapter/hotspot/tier/channel/reason enums. Không truyền free text, contact URL/phone/query string. Cấu hình production không console.log PII.

```ts
type Locale = 'vi'|'en';
type ChapterId = 'exterior'|'approach'|'entrance'|'living'|'garden'|'finale';
type HotspotId = 'travertine-wall'|'sliding-glass'|'garden-tree';
type Placement = 'persistent'|'mid'|'finale';
type Envelope = {
  schemaVersion:1; sequence:number; locale:Locale;
  mode:'cinematic'|'reduced-motion'|'fallback';
  chapterId:ChapterId|null; elapsedMs:number;
};
type AnalyticsEvent = Envelope & (
  | {name:'experience_started';trigger:'scroll'|'chapter-nav'|'hotspot'}
  | {name:'chapter_entered';previousChapterId:ChapterId|null;direction:'forward'|'backward'|'initial';entryIndex:number}
  | {name:'hotspot_opened';hotspotId:HotspotId;category:'material'|'architecture'|'landscape'}
  | {name:'language_changed';fromLocale:Locale;toLocale:Locale}
  | {name:'audio_enabled'}
  | {name:'cta_clicked';placement:Placement;target:'contact-section'|'zalo'|'messenger'|'whatsapp'}
  | {name:'zalo_clicked';placement:Placement}
  | {name:'messenger_clicked';placement:Placement}
  | {name:'whatsapp_clicked';placement:Placement}
  | {name:'experience_completed'}
);
```

- [ ] ChapterId/HotspotId triển khai bằng union suy từ config đã validate để Phase 2 mở rộng data không phải sửa renderer. Category lấy từ Hotspot type chuẩn; ví dụ trên mô tả đúng tập nhỏ Phase 1. Envelope được helper tạo, callers không tự tạo sequence/elapsedMs. `emit` bắt lỗi sink và runtime-validate allowlist, mặc định no-op.

- [ ] Test event được phép, key lạ bị loại/reject, chapter dwell/dedupe, A→B→A hợp lệ, completion một lần. Không phát completed khi khách nhấn End trong lúc rendered p chưa tới finale.
- [ ] Kiểm HTML xuất ra với parser và no-JS browser: lang, title, canonical, OG, headings, sitemap, robots đúng environment; không tuyên bố SEO ranking được bảo đảm.
- [ ] Chạy unit/events + SEO E2E/build; commit `feat: add localized SEO and private analytics hooks`.

## T17 — QA, bàn giao và điều kiện phát hành

**Files:** tạo `scripts/validate-assets.mjs`, `scripts/validate-release.mjs`, `docs/RUNBOOK.md`, `docs/reports/ACCEPTANCE.md`; cập nhật README, ASSET_LICENSES, ACCEPTANCE_CRITERIA và RISK_REGISTER.
**Consumes:** T01–T16. **Produces:** gói build tĩnh, checklist có evidence, hướng dẫn chạy/sửa/mở rộng/rollback.

- [ ] Asset validator kiểm mỗi file dùng thật có provenance/license/file path và không mất attribution. Release validator kiểm site origin HTTPS thật, ba kênh liên hệ, dữ liệu không chứa ví dụ giả, môi trường production đúng.
- [ ] Chạy theo thứ tự, dừng tại lỗi:

```powershell
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
node scripts/validate-assets.mjs
node scripts/measure-payload.mjs
node scripts/validate-release.mjs
```

- [ ] Playwright webServer phải serve `out/` của production build bằng static server đã pin và route fallback đúng; không test dev server rồi coi là static export pass. Build preview chưa có contacts không được gọi production release pass.
- [ ] Điền ma trận 18 tiêu chí, lỗi P0/P1 phải đóng. Đính kèm screenshots, clip rail, log build và reports máy thật; không tạo kết quả giả khi thiết bị thiếu.
- [ ] RUNBOOK: cài runtime/npm ci/dev/build; sửa copy/hotspot/rail; thêm GLB theo origin/scale; cập nhật license; thêm chương qua schema; cấu hình contacts; phục hồi bản build trước.
- [ ] Chuẩn bị preview và kiểm host MIME/CORS/cache cho GLB/KTX2/WASM/audio. Khi có yêu cầu xuất bản: deploy artifact, kiểm HTTPS/domain/links/headers và lưu bản build trước để rollback; không tự sửa DNS trong nhiệm vụ lập kế hoạch.
- [ ] G4 tổng hợp bằng chứng; commit `docs: add release evidence and maintenance runbook`.

## T18 — Phase 2: kitchen và courtyard

**Files:** tạo `src/components/scene/zones/Kitchen.tsx`, `Courtyard.tsx`; cập nhật `src/config/story.ts`, `camera.ts`, `zones.ts`, `hotspots.ts`, `lighting.ts`, `audio.ts`, hai dictionaries và poster/asset registry; tạo `tests/e2e/phase-two-a.spec.ts`.
**Consumes:** G4, ASSET_PIPELINE. **Produces:** đoạn living→kitchen→courtyard hợp lý, chapter IDs mới ổn định.

- [ ] Mở rộng mặt bằng/control points và nhịp: trọng tâm sinh hoạt gia đình và ánh sáng giếng trời. Tính lại chapter ranges, không sửa sampler/API.
- [ ] Thêm nội dung/chi tiết/ảnh tĩnh cùng lúc zone. Nếu chưa có budget GPU, dùng proxy đạt tỷ lệ thay cho chi tiết dày.
- [ ] Re-run validators, rail continuity, reverse-scroll, locale/static và budget reports; nghiệm thu hai chương rồi commit riêng.

## T19 — Phase 2: bedroom và bathroom

**Files:** tạo `src/components/scene/zones/Bedroom.tsx`, `Bathroom.tsx`; cập nhật các config/content/registry như danh sách cụ thể ở T18; tạo `tests/e2e/phase-two-b.spec.ts`.
**Consumes:** T18. **Produces:** lối đi qua vùng riêng tư, copy và nhịp yên tĩnh hơn.

- [ ] Quyết định topology phòng/tầng bằng mặt bằng, không dựng đoạn rail xuyên sàn. Nhấn riêng tư/âm học/chất liệu; câu chuyện ánh sáng buổi sáng là design insight, cảnh toàn site vẫn sunset.
- [ ] Chọn góc nhìn không cần ultra-wide để nhìn đủ phòng; thêm poster/static details. Chỉ import asset có registry.
- [ ] Chạy route/copy/config/rail reverse/quality tests và visual review toàn tuyến, rồi commit hai room có thể nghiệm thu riêng.

## T20 — Phase 2: workspace, balcony và nghiệm thu toàn tuyến

**Files:** tạo `src/components/scene/zones/Workspace.tsx`, `Balcony.tsx`, `tests/e2e/full-story.spec.ts`; cập nhật story/camera/zones/hotspots/lighting/audio/dictionaries/asset registry, docs/reports/PERFORMANCE.md và ACCEPTANCE.md.
**Consumes:** T19. **Produces:** đủ 12 chương của brief, trở lại garden/finale trên một rail liên tục.

- [ ] Thiết kế đường chuyển từ balcony ra garden qua lối thực tế hoặc chuyển động ngoại thất có chủ ý, tránh bay xuyên lan can/mái. Khi độ cao đổi, giữ tốc độ/góc xoay dễ chịu.
- [ ] Tối ưu số zone resident, preload theo hướng cả hai chiều; không tải cả 12 chương ngay khi mở hero.
- [ ] Nghiệm thu lại đủ static/VI/EN/keyboard/audio/contact và cùng ngân sách cảnh active; ghi tổng payload full journey riêng initial payload.
- [ ] Chỉ đóng Phase 2 khi có ảnh và video hành trình toàn bộ, báo cáo lỗi/thiết bị, license đầy đủ và hướng dẫn bảo trì cập nhật.

## Tự rà soát kế hoạch

- [x] Đã đối chiếu 42 mục brief với ma trận trong ACCEPTANCE_CRITERIA ngày 27/09/2026.
- [x] Đã đối chiếu ID/range/schema/interface, policy tải muộn, modal, audio, locale và mã gate giữa các tài liệu.
- [x] Đã phân biệt quyết định đề xuất với số đo thực tế và thông tin chủ dự án cung cấp.
- [ ] Khi hoàn thành triển khai, mỗi task có evidence và commit; không đánh dấu done chỉ vì tài liệu đã mô tả.
