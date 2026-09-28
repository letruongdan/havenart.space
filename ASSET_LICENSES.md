# Sổ nguồn và giấy phép tài sản HavenArt

Trạng thái tại lần lập kế hoạch này: chưa nhập hoặc lựa chọn chốt bất kỳ tài sản bên thứ ba nào.
Chưa có model, texture, HDRI, sample audio, ảnh, icon hoặc font được ghi nhận là đã được phép dùng.
Danh sách bên dưới là quy trình và schema bắt buộc; không phải chứng nhận giấy phép cho tệp tương lai.

## Quy tắc nhập tài sản

- Ưu tiên hình học do dự án tạo, tài sản CC0 hoặc public domain có nguồn xác minh được.
- “Miễn phí tải” không đồng nghĩa được dùng thương mại, chỉnh sửa hoặc phân phối cùng website.
- Trước khi đưa tệp vào source/public, xác minh trang tài sản và văn bản giấy phép áp dụng đúng tệp đó.
- Không nhập tài sản có giấy phép mơ hồ, thiếu nguồn gốc hoặc không đáp ứng mục đích dự án.
- Ghi từng tài sản hoặc bộ có cùng nguồn và giấy phép; liệt kê chính xác mọi tệp thực sự sử dụng.
- Font cũng là tài sản: kiểm tra quyền self-host, phân phối, sửa/subset và giữ thông báo license nếu yêu cầu.
- Ảnh OG, poster, favicon, icon, audio và tài sản trong GLB nhúng phải được kiểm tra như model chính.
- Giấy phép model không tự chứng minh mọi texture, logo hoặc nội dung nhúng có cùng quyền sử dụng.
- Khi bỏ tài sản khỏi sản phẩm, giữ lịch sử thay đổi; không để bản ghi ngụ ý tệp vẫn được phân phối.

## Schema bắt buộc cho mỗi bản ghi thật

| Trường | Nội dung cần ghi |
| --- | --- |
| `name` | Tên tài sản chính xác và phiên bản/biến thể nếu có |
| `source` | URL trang nguồn gốc của tài sản; không chỉ URL CDN hoặc kết quả tìm kiếm |
| `creator` | Tác giả/tổ chức theo nguồn, không tự đoán |
| `license` | Tên, phiên bản và URL/vị trí văn bản giấy phép đã kiểm tra |
| `attribution` | Yêu cầu ghi công; ghi rõ “Không bắt buộc” chỉ khi giấy phép xác nhận |
| `file` | Đường dẫn repository của mọi tệp dùng trong build |
| `modifications` | Chỉnh sửa thực tế: crop, resample, loop, remesh, bake, nén, subset hoặc “Không” |
| `verifiedAt` | Ngày kiểm tra nguồn và giấy phép |
| `verifiedBy` | Vai trò/người chịu trách nhiệm kiểm tra |
| `evidence` | Bản license đi kèm hoặc vị trí lưu bằng chứng nguồn áp dụng |
| `checksum` | SHA-256 tùy chọn để đối chiếu tệp đã kiểm tra với tệp được dùng |

## Tài sản đang sử dụng

### 1. Âm thanh môi trường (Procedural Ambient Soundscapes — W20)

| Trường | public/audio/outdoor.ogg | public/audio/interior.ogg | public/audio/garden.ogg |
|---|---|---|---|
| `name` | HavenArt Ambient Outdoor | HavenArt Ambient Interior | HavenArt Ambient Garden |
| `source` | Dự án HavenArt — Tổng hợp âm thanh thủ tục (procedural synthesis) | Dự án HavenArt — Tổng hợp âm thanh thủ tục (procedural synthesis) | Dự án HavenArt — Tổng hợp âm thanh thủ tục (procedural synthesis) |
| `creator` | HavenArt Audio Engineering | HavenArt Audio Engineering | HavenArt Audio Engineering |
| `license` | CC0-1.0 / Public Domain Dedication | CC0-1.0 / Public Domain Dedication | CC0-1.0 / Public Domain Dedication |
| `attribution` | Không bắt buộc | Không bắt buộc | Không bắt buộc |
| `file` | `public/audio/outdoor.ogg` | `public/audio/interior.ogg` | `public/audio/garden.ogg` |
| `modifications` | Pink noise + lowpass 900Hz + highpass 120Hz, seamless 12s loop | Brown noise + lowpass 280Hz, seamless 12s loop | Pink noise + lowpass 1200Hz + highpass 180Hz, seamless 12s loop |
| `verifiedAt` | 2026-09-28 | 2026-09-28 | 2026-09-28 |
| `verifiedBy` | HavenArt Integration Team | HavenArt Integration Team | HavenArt Integration Team |
| `evidence` | docs/agents/reports/W20-report.json | docs/agents/reports/W20-report.json | docs/agents/reports/W20-report.json |
| `checksum` | `9DD66F4C731CC2CAB23FDDD7DF8A833E520482978E15FF1591B2AE01A1AEED54` | `88E1C7487EDDA0985A6FAA6F0B3D15F4F71E1B8A89E43FF635F9915F86B7E196` | `AB486EBFEB69C71F707347DB8D84DDCA45A496B524C1295952AE20D03154DD79` |

### 2. Hình ảnh Poster chương & OpenGraph (Phase 1 Story Posters & OG — W25)

| Tệp (`file`) | Kích thước | Format | Checksum (SHA-256) | Nguồn / Giấy phép |
|---|---|---|---|---|
| `public/images/story/exterior-desktop.webp` | 1600x900 (14.3 KB) | WebP | `9D3E40EF62BA72C85722BAD3A3D6ED2361C0B540F8C0D51A0D3895698693007D` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/exterior-mobile.webp` | 800x1200 (6.2 KB) | WebP | `69BE37D5BBD823BDAD1170F96A93C4639F0936BFC8B3DFA04DCD2DEB6D50C94C` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/approach-desktop.webp` | 1600x900 (14.6 KB) | WebP | `0D1544ABA3C1A63A8007DE8F74590DB198C34B4067B565541C88DD0C2CD3EEFC` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/approach-mobile.webp` | 800x1200 (6.5 KB) | WebP | `98B0B0582A0B1B4576117989DAD51B2FA0FCF909F765B8AF79747310B947AA91` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/entrance-desktop.webp` | 1600x900 (14.5 KB) | WebP | `CDA9109146EB62AEEF3D33C49D88FA51B68576A5A06A6F3C8AE4A5F1E9C3A88C` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/entrance-mobile.webp` | 800x1200 (6.5 KB) | WebP | `F88D667D40F78B6A780DD5265569498CB19CDEAC49CE03BF9E8EF78A98B0D08A` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/living-desktop.webp` | 1600x900 (14.1 KB) | WebP | `DDDDE23CDB013C6D8A252329F2446ECF8390C2AB0FAD0E3A582AF13F5667DA24` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/living-mobile.webp` | 800x1200 (6.2 KB) | WebP | `FD5FE555F75986B4BB3E64B2BA9E10567021191171C0D4010880BABCABE5EEF5` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/garden-desktop.webp` | 1600x900 (13.6 KB) | WebP | `CB89BEF632CA30264B26C25F5F001B0FA6E24A8C12E9A1D7F548E3E9F72F35D0` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/garden-mobile.webp` | 800x1200 (6.2 KB) | WebP | `D2296BF48A6576446293E19FCE4BB80BF4BDCF6CD30EB8A46D35ACF3FCBE67B7` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/finale-desktop.webp` | 1600x900 (12.1 KB) | WebP | `CC53398B65509CAD59D444C4E4C03FFB036AC73B1A4E1E89E82F7ACD742B6B97` | HavenArt Scene Original / CC0-1.0 |
| `public/images/story/finale-mobile.webp` | 800x1200 (5.3 KB) | WebP | `23DFC8CEB5E85058A2D7A96FBC3E5F138B6608EF6F776320D3A3C76C90D15CF5` | HavenArt Scene Original / CC0-1.0 |
| `public/images/og-havenart.jpg` | 1200x630 (32.2 KB) | JPEG | `56CA622ACEF70823946CF64C901E415C96326B46173E7FD76D38D7F3EA395A06` | HavenArt Original Typography & Render / CC0-1.0 |

- **Creator:** HavenArt Visual Design & Scene Architecture
- **License:** CC0-1.0 / Public Domain Dedication (Không bắt buộc ghi công)
- **Modifications:** Xuất xưởng trực tiếp từ cấu trúc hình học, phối cảnh và bảng màu ánh sáng hoàng hôn -> chạng vạng của biệt thự nhiệt đới HavenArt.
- **VerifiedAt:** 2026-09-28 bởi HavenArt Integration Team.

---

## Điều kiện trước production

- Đối chiếu toàn bộ model, texture, HDRI, audio, ảnh và font được build với bản ghi trong sổ.
- Thêm attribution/notice ở đúng vị trí mà giấy phép yêu cầu, kể cả khi asset đã đổi tên hoặc nén.
- Kiểm tra asset phụ thuộc và tệp nhúng; bằng chứng nguồn phải còn truy xuất hoặc được lưu cùng hồ sơ.
- Không có tài sản bắt buộc trả phí; mọi ngoại lệ ngân sách cần quyết định phạm vi mới trước khi sử dụng.
- Người phụ trách tài sản xác nhận sổ khớp chính xác bản build được phát hành.

