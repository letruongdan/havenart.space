# HAVENART — Đặc tả song ngữ

Trạng thái: kế hoạch VI/EN; bản dịch bên dưới là nháp biên tập, trừ định vị và câu chữ đã có trong brief.
Mục tiêu: hai ngôn ngữ có nội dung và chức năng đầy đủ, kể cả khi không tải được 3D hoặc JavaScript.
Tham chiếu: [USER_JOURNEY.md](USER_JOURNEY.md), [STORY_CHAPTER_SPEC.md](STORY_CHAPTER_SPEC.md), [SEO_SPEC.md](SEO_SPEC.md).

## 1. URL và chiến lược dựng trang

Tiếng Việt là mặc định tại /vi; tiếng Anh tại /en.
Phase 1 dùng Next.js App Router và static export: dựng HTML hoàn chỉnh cho hai locale lúc build.
Root layout ở `src/app/[locale]/layout.tsx` xuất html lang theo params. Điểm vào `/` dùng `src/app/(entry)/layout.tsx` và `page.tsx` riêng; không có root layout chung lồng thêm html/body. Xem TECH_DECISIONS về khôi phục trạng thái khi đổi root layout.
Không phụ thuộc middleware, cookie hoặc suy đoán ngôn ngữ trình duyệt để trả nội dung đúng.
Đề xuất host rule 302 từ / sang /vi; nếu host chưa hỗ trợ rule, trang / có liên kết tiếng Việt rõ và liên kết English.
Không dùng script redirect làm lối vào duy nhất; /vi và /en truy cập trực tiếp được.
Locale không hỗ trợ đi tới trang not-found có đường về VI/EN; không sinh route hoặc bản dịch ngầm không có dữ liệu.
Anchor chương dùng ID ổn định như #living và #contact, không dịch ID theo nhãn hiển thị.
Đường dẫn asset không nhân đôi theo locale nếu dùng cùng hình/âm thanh được cấp phép.
Trang /vi và /en đều có lang, title, description và metadata chia sẻ đúng ngôn ngữ khi xem source.
Canonical/hreflang dùng miền production được xác nhận; không tự bịa miền hoặc giữ URL preview trong bản phát hành.

## 2. Ranh giới nội dung

| Nhóm khóa đề xuất | Nội dung cần dịch |
| --- | --- |
| brand | Định vị và lời giới thiệu; giữ tên HavenArt |
| navigation | Tên chương, liên hệ, ngôn ngữ, bỏ qua điều hướng |
| controls | Âm thanh, chuyển động, đóng, quay lại, bắt đầu |
| services | Phạm vi thiết kế nhà ở, cách tiếp cận, lời mời trao đổi |
| chapters.{id} | Tiêu đề, ý định, nguyên tắc, vật liệu, ánh sáng |
| hotspots.{id} | Tên, nhóm, mô tả, lý do và lưu ý thiết kế |
| contact | CTA, nhãn kênh, trạng thái chưa cấu hình, giải thích chuyển kênh |
| status | Đang tải, lỗi, fallback, trải nghiệm tĩnh, âm thanh không khả dụng |
| accessibility | Alt, tên dialog, nhãn progress và thông báo hỗ trợ |
| metadata | Title, description, Open Graph, nội dung SEO có thể công bố |

Các file nội dung tập trung theo locale; renderer, scene và cấu hình story tham chiếu khóa thay vì chứa câu chữ.
StoryChapter và Hotspot đều dùng trường `copyKey` theo [hợp đồng tích hợp chuẩn](superpowers/specs/2026-09-27-havenart-design.md), không dùng alias contentKey.
Key parity bắt buộc: VI và EN có cùng bộ khóa được sử dụng, cùng biến nội suy và cùng loại dữ liệu.
Không nối các mảnh câu để dịch; mỗi thông điệp đầy đủ là một đơn vị nội dung.
Không dùng HTML thô trong chuỗi; nếu cần liên kết hoặc nhấn mạnh, mô tả cấu trúc rich text có kiểm soát.
Tên vật liệu, nhóm hotspot và aria-label cũng là nội dung; không bỏ sót vì chúng không nằm ở hero.
Không điền “TODO”, chuỗi rỗng hoặc tên khóa như văn bản nhìn thấy trong bản production.

## 3. Từ vựng và giọng điệu

| Khái niệm | VI | EN |
| --- | --- | --- |
| Định vị | Kiến tạo nơi bạn thuộc về. | Designing the place you belong. |
| CTA chính | Liên hệ kiến trúc sư | Talk to an Architect |
| Chế độ tĩnh | Xem nội dung tĩnh | View the static experience |
| Câu chuyện phòng | Ý đồ thiết kế | Design intention |
| Chi tiết | Khám phá chi tiết | Explore the detail |
| Đóng panel | Đóng chi tiết | Close details |
| Âm thanh tắt | Bật âm thanh | Enable sound |
| Âm thanh bật | Tắt âm thanh | Mute sound |
| Kênh chưa có | Chưa cấu hình | Not configured |
| Minh họa concept | Không gian minh họa ý tưởng thiết kế | An illustrative architectural concept |

VI dùng câu tự nhiên và dấu đầy đủ; EN chuyển ý nghĩa, tránh dịch từng chữ làm mất giọng bình tĩnh.
Hạn chế từ cường điệu như “tốt nhất”, “hoàn hảo”, “đẳng cấp số một”; không biến lời dịch thành claim mới.
Giữ nguyên Zalo, Messenger, WhatsApp và HavenArt; chỉ dịch lời giải thích xung quanh.

## 4. Bộ tiêu đề chương

| ID | Tiêu đề VI | Tiêu đề EN |
| --- | --- | --- |
| exterior | Kiến tạo nơi bạn thuộc về. | Designing the place you belong. |
| approach | Kiến trúc bắt đầu trước ngưỡng cửa. | Architecture begins before the threshold. |
| entrance | Bước vào một nhịp sống khác. | Step into a calmer rhythm. |
| living | Một không gian cho những cuộc gặp gỡ. | A space designed for connection. |
| kitchen | Nơi nhịp sống hội tụ. | Where everyday life comes together. |
| courtyard | Ánh sáng là một vật liệu. | Light is a material. |
| bedroom | Sự tĩnh lặng cũng cần được thiết kế. | Quiet is something we design. |
| bathroom | Khoảng nghỉ cho riêng mình. | A moment to restore. |
| workspace | Tập trung, gần với thiên nhiên. | Focus, close to nature. |
| balcony | Mở ra một khoảng trời. | Open to the sky. |
| garden | Kiến trúc trả lại chỗ cho thiên nhiên. | Architecture gives space back to nature. |
| finale | Ngôi nhà của bạn nên kể câu chuyện của chính bạn. | Your home should tell your story. |

Phase 1 chỉ render sáu chương exterior, approach, entrance, living, garden, finale.
Các tiêu đề Phase 2 định hướng schema và biên tập; chỉ công bố phòng khi có đủ nội dung cả hai locale.
Mỗi chương Phase 1 cần thêm các đoạn hoàn chỉnh về ý định, nguyên tắc, vật liệu và ánh sáng trước khi nghiệm thu.

## 5. Đổi ngôn ngữ có giữ ngữ cảnh

Switcher luôn là liên kết locale thật, có thể dùng khi JavaScript tắt; không chỉ là nút thay chuỗi trong canvas.
Trong bản nâng cao, lấy chapter ID và tiến độ cục bộ từ mẫu rendered progress đang hiển thị, không lấy scroll target còn đang chạy.
Lưu context ngắn hạn cho lần điều hướng hiện tại: chapterId, localProgress và mode; không chứa dữ liệu cá nhân.
Đọc cấu hình locale mới, đợi layout/mốc cuộn sẵn sàng rồi suy ra vị trí cuộn từ chapter ID + localProgress đã clamp.
Phục hồi native position/raw target và khởi tạo rendered p tương ứng trước khi lộ lại canvas; reset clock/velocity để không phát sinh frame nhảy.
Không khôi phục nguyên pixel cuộn vì độ dài bản dịch và viewport có thể khác.
Nếu chapter không còn trong phase hiện tại, dùng anchor chương gần nhất còn tồn tại; thiếu hoàn toàn thì về hero.
Giữ lựa chọn tĩnh; chỉ tiếp tục 3D nếu đang ở chế độ nâng cao và điều kiện cho phép, không tự bật âm thanh khi chuyển trang.
Nếu đang mở panel, lấy context từ rendered p đang bị giữ trước khi đóng; không tiếp tục rail cũ hoặc restore scroll cũ sau khi route đã đổi.
Sau điều hướng focus tên ngôn ngữ/heading phù hợp, không mở modal bất ngờ; quy trình khóa/khôi phục nền theo [HOTSPOT_SPEC.md](HOTSPOT_SPEC.md).
Trong chế độ tĩnh hoặc không JavaScript, liên kết switcher dùng anchor chương nếu có; nội dung luôn đầy đủ ngay cả khi về đầu.
Browser Back/Forward tuân theo lịch sử trang và context đã lưu cho entry đó; không ghi đè một trạng thái mới hơn bằng state cũ.
Đổi locale tại #contact vẫn ở liên hệ; không bắt người xem cuộn lại toàn bộ hành trình.

## 6. Hành vi thiếu dữ liệu và thiết kế chữ

Thiếu khóa, chuỗi rỗng hoặc biến nội suy lệch phải làm kiểm tra build thất bại; không âm thầm trộn VI và EN.
Trong preview phát triển, báo rõ khóa thiếu cho nhóm thực hiện; không xem đây là nội dung hợp lệ để phát hành.
Kênh liên hệ chưa biết giữ `null` trong cấu hình dùng chung; chỉ dịch trạng thái, không tự tạo link theo locale.
Production phải đủ ba kênh được xác minh hoặc có thay đổi phạm vi được duyệt; dịch nhãn không thay thế điều kiện này.
Font cần đủ glyph tiếng Việt; kiểm tra dấu chồng, độ cao dòng, ký tự ă/â/ê/ô/ơ/ư/đ và chữ hoa có dấu.
Không cố định chiều cao card/CTA theo bản VI; kiểm tra bản EN, zoom và bề rộng nhỏ trước khi khóa thiết kế.
Ảnh chứa chữ nên tránh; nếu cần, phải có phiên bản và văn bản thay thế tương đương cho từng locale.

## 7. Kế hoạch xác nhận

Kiểm tra từ điển tự động: khóa, biến, loại nội dung, tham chiếu chương/hotspot và không còn placeholder xuất bản.
Kiểm tra HTML build /vi và /en khi tắt JavaScript: đủ dịch vụ, sáu câu chuyện, ba chi tiết và liên hệ.
Smoke test đổi VI→EN→VI ở hero, giữa living, khi modal mở và tại contact; đo chapter/local progress phục hồi theo dung sai timeline.
Kiểm tra hard refresh, Back/Forward, anchor trực tiếp, locale không hợp lệ và / khi có/không có host redirect.
Review thủ công metadata, aria-label, lỗi tải, trạng thái kênh và xuống dòng bởi người đọc tốt cả VI lẫn EN.
Đầu vào cần bổ sung: người duyệt dịch, tên dịch vụ chính thức, miền production và URL liên hệ thật; không cản trở việc hoàn tất schema/kế hoạch.
