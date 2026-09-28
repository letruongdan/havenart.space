# Quyết định kỹ thuật và nguồn kiểm chứng

Ngày kiểm tra: 27/09/2026. Đây là lựa chọn đề xuất, chưa cài package hoặc xác minh bản build.

## Stack

| Thành phần | Quyết định | Lý do/điều kiện |
|---|---|---|
| Next.js App Router | Dùng nhánh stable có bản vá được hỗ trợ lúc scaffold; khóa exact versions trong lockfile | HTML song ngữ, metadata và client boundary rõ |
| React + React DOM + R3F | Bộ tương thích React 19 + Fiber 9 là baseline đã có tài liệu; xác minh peerDependencies khi cài | Không trộn React/Fiber khác major tương thích |
| Three + drei | Pin bộ khớp R3F và loader; WebGL trước | Không thêm WebGPU vào phạm vi Phase 1 |
| TypeScript | strict, no implicit any | Kiểm soát schema và locale |
| Tailwind | Chỉ cho DOM; token nguồn duy nhất | Không dùng CSS thay trách nhiệm renderer |
| GSAP/ScrollTrigger | Native scroll sampling, cleanup khi unmount | Không thêm thư viện smooth scroll ban đầu |
| Zustand | UI state rời rạc | Runtime camera không setState mỗi frame |
| Test | Vitest cho logic, Playwright cho trình duyệt; kiểm tra a11y và GPU thủ công | Test hành vi quan trọng, không test từng class CSS |
| Package manager | npm và package-lock.json | Một lockfile, `npm ci` trên CI |

Tài liệu Next nêu Node tối thiểu 20.9. Đó là mức sàn framework, không phải đề xuất dùng một bản runtime hết hỗ trợ: lúc bắt đầu chọn Node LTS còn hỗ trợ, tương thích bộ package, rồi lưu phiên bản trong `.node-version`. [Next.js installation](https://nextjs.org/docs/app/getting-started/installation).

Tài liệu R3F ghép Fiber 8 với React 18 và Fiber 9 với React 19. Dùng quan hệ tương thích này để kiểm tra trước khi pin, không tự suy ra `latest` của mọi package chạy cùng nhau. [R3F installation](https://r3f.docs.pmnd.rs/getting-started/installation).

GSAP cho phép sử dụng website thương mại không thu phí theo Standard License hiện được công bố; vẫn phải giữ thông tin license đúng, không gọi đó là CC0. HavenArt là website giới thiệu studio. [GSAP Standard License](https://gsap.com/community/standard-license/).

## Rendering và xuất bản

Phase 1 chọn `output: 'export'`: dựng `/vi` và `/en` thành HTML lúc build, khai báo `generateStaticParams`, dùng asset tĩnh và metadata tĩnh. Không dùng Server Actions, API ghi dữ liệu, cookies phía server, middleware hoặc redirect runtime. `/` có HTML vào bản VI; rule redirect cấu hình trên host khi triển khai. Ảnh tối ưu trước lúc build hoặc cấu hình loader phù hợp, không phụ thuộc máy chủ tối ưu ảnh mặc định. [Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports).

Lựa chọn này giảm phụ thuộc dịch vụ cho Phase 1. Nếu thêm form/CRM, lập quyết định mới cho API, chống spam, lưu trữ, consent và dữ liệu riêng tư; không nhét backend giả vào bản frontend.

Host mục tiêu đề xuất là một static host hỗ trợ domain, HTTPS, MIME và cache cho GLB/KTX2/WASM. Cloudflare có hướng dẫn deploy Next static export; cần kiểm tra điều khoản, quota, kích thước file và tài khoản cụ thể trước chọn. Không có bước tạo tài khoản/deploy trong đợt lập kế hoạch. [Hướng dẫn Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/).

Không lấy Vercel Hobby làm mặc định cho website studio thương mại vì tài liệu giới hạn gói đó cho mục đích cá nhân, phi thương mại. [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Chính sách dependency và tài sản

Đặt root layout có `<html lang>` ở `src/app/[locale]/layout.tsx`, và điểm vào `/` trong `src/app/(entry)/` với root layout tiếng Việt riêng; không lồng hai thẻ html qua một root layout chung. Chuyển giữa root layouts có thể tải lại document, nên chuyển locale cần lưu/khôi phục chapter trong session state và kiểm bằng browser thật. [Next i18n](https://nextjs.org/docs/app/guides/internationalization), [Route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups).

- Kiểm tra versions/peerDependencies/license tại task scaffold; ghi lệnh, runtime, package-lock và kết quả build.
- Không pin số patch suy đoán trong tài liệu này. Không cho CI tự chạy `latest` mỗi lần build.
- Không thêm dịch vụ trả phí như điều kiện để demo hoặc nhận liên hệ qua URL.
- Model procedural trước; thử Meshopt hoặc Draco theo kết quả tải/giải nén, không bật cả hai mặc định.
- KTX2 cần phép thử hỗ trợ GPU và loader; JPEG/WebP/PBR proxy là đường lui có kiểm soát.
- Mọi asset kể cả font, HDRI, âm thanh, ảnh poster phải có provenance trong `ASSET_LICENSES.md` trước khi nhập.

## Điều kiện xem lại quyết định

| Tín hiệu | Xem lại điều gì | Giữ nguyên điều gì |
|---|---|---|
| Tải 3D quá lâu | Asset split, texture, thứ tự prefetch | HTML và CTA sẵn trước |
| GPU yếu | Tier, shadows, geometry, fallback | Nội dung và liên hệ đầy đủ |
| Form thật trở thành yêu cầu | Hosting/API/privacy scope | Schema story và scene |
| Artist bàn giao GLB | Manifest, scale, materials, licenses | Stable chapter IDs và hệ camera |
| Thay major framework | Nhánh thử build/smoke test và compatibility | Không nâng tự động trên bản phát hành |
