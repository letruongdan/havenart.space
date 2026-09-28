# Đặc tả sự kiện nội bộ

Trạng thái: hợp đồng analytics-ready; không có SDK, endpoint hay thu thập dữ liệu người dùng đang hoạt động.
Chủ trì: frontend; chủ sản phẩm xác nhận định nghĩa chỉ số trước khi nối hệ thống thu nhận.

## Kiến trúc và giới hạn dữ liệu

- Dùng một `emit` nhận TypeScript discriminated union; không cho tên sự kiện hoặc payload tùy ý. `mode` trong analytics là taxonomy báo cáo, suy từ ExperienceMode và staticReason, không thay enum runtime.
- Mỗi sự kiện có allowlist runtime để loại trường lạ, kể cả khi caller bỏ qua kiểm tra TypeScript.
- Sink production mặc định là no-op; phát hành Phase 1 không phụ thuộc dịch vụ phân tích trả phí.
- Chế độ development có buffer RAM giới hạn 100 sự kiện, bật bằng cờ dev rõ ràng; không ghi console mặc định.
- Không ghi localStorage, cookie, định danh bền vững hoặc gửi request phân tích khi chưa cấu hình sink.
- Sink tương lai là adapter độc lập; lỗi adapter không chặn scroll, audio, hotspot hoặc điều hướng liên hệ.
- Không tự thêm SDK marketing hoặc gửi dữ liệu sang bên thứ ba khi cắm adapter.
- Nếu triển khai thu nhận thực tế, cần quyết định riêng về mục đích, thông báo, cơ sở xử lý, lưu giữ và quyền truy cập.
- Không thu tên, số điện thoại, email, nội dung form/chat, vị trí chính xác, IP hoặc fingerprint trong payload.
- Không gửi URL đầy đủ, query string, referrer, contact URL hoặc chuỗi text người dùng nhập.
- Máy chủ thu nhận tương lai phải xử lý cả log hạ tầng; payload sạch không chứng minh log không lưu IP.

## Envelope dùng chung

| Trường | Kiểu / giới hạn |
| --- | --- |
| `name` | Một trong đúng mười sự kiện bên dưới |
| `schemaVersion` | Literal `1` |
| `sequence` | Số nguyên tăng trong vòng đời document, dùng debug/dedupe tại nguồn |
| `locale` | `vi` hoặc `en` |
| `mode` | `cinematic`, `reduced-motion` hoặc `fallback` |
| `chapterId` | Một ID chương hợp lệ hoặc `null` nếu chưa vào câu chuyện |
| `elapsedMs` | Thời gian tương đối từ khởi tạo document; không timestamp lịch người dùng |

- Không có user ID hoặc session ID mặc định; `sequence` không được dùng để liên kết nhiều lần truy cập.
- Payload mỗi sự kiện chỉ thêm các enum/ID cấu hình trong bảng; không dùng free text.
- Nhãn VI/EN thay đổi không làm thay đổi chapter/hotspot ID hoặc taxonomy.

## Danh mục mười sự kiện

| Sự kiện | Điều kiện phát | Payload riêng |
| --- | --- | --- |
| `experience_started` | Lần đầu có thao tác chủ ý khám phá story: scroll vào, chọn chương hoặc mở hotspot | `trigger: scroll/chapter-nav/hotspot` |
| `chapter_entered` | Chương thực sự hiển thị ổn định theo quy tắc bên dưới | `previousChapterId`, `direction: forward/backward/initial`, `entryIndex` |
| `hotspot_opened` | Panel đổi từ đóng sang mở thành công | `hotspotId`, `category` theo enum |
| `language_changed` | Chuyển sang locale khác đã thành công | `fromLocale`, `toLocale` |
| `audio_enabled` | Người dùng đã yêu cầu bật và âm thanh thực sự sẵn sàng phát | Không thêm |
| `cta_clicked` | Thao tác chủ ý với CTA chính hoặc kênh đã cấu hình | `placement: persistent/mid/finale`, `target: contact-section/zalo/messenger/whatsapp` |
| `zalo_clicked` | Kích hoạt liên kết Zalo hợp lệ | `placement` cùng enum |
| `messenger_clicked` | Kích hoạt liên kết Messenger hợp lệ | `placement` cùng enum |
| `whatsapp_clicked` | Kích hoạt liên kết WhatsApp hợp lệ | `placement` cùng enum |
| `experience_completed` | Finale thực sự được xem theo quy tắc bên dưới | Không thêm |

## Tiến độ, cuộn ngược và chống đếm trùng

- Ranh giới chương lấy từ cấu hình story; cinematic dùng `renderedStoryProgress`, không dùng raw scroll khác nguồn.
- Reduced motion/fallback dùng chương DOM đang đọc; bộ giải quyết chương phải trả một ID duy nhất.
- Đích `chapter_entered`: chương hiện tại ổn định 300 ms khi document visible; cấu hình ngưỡng tập trung.
- Nếu lướt qua chương dưới ngưỡng, không phát sự kiện giả cho chương chưa thực sự xem.
- Nếu A → B → A đều đủ ngưỡng, phát ba lần; lần trở về A có `direction: backward` và `entryIndex` mới.
- Rung progress quanh ranh giới không phát liên tục; reset ứng viên khi đổi chương, chỉ commit sau ngưỡng.
- Không phát lại chỉ vì React render, Strict Mode, resize, đổi quality hoặc thay thế renderer.
- Chuyển locale giữ nguyên bộ đếm trong lần điều hướng client cùng document; không giả lập chapter mới.
- Một document mới là lượt mới; không nhận diện người cũ và không hứa loại trùng giữa tab hay thiết bị.
- `experience_started` và `experience_completed` tối đa một lần mỗi document; tải scene không tự tính là bắt đầu.
- Cinematic cần renderedStoryProgress ≥ 0.99; mọi mode cần khu vực CTA finale thấy ít nhất 50% trong viewport trong 1.000 ms liên tục.
- Chỉ tính thời gian khi tab visible; tab ẩn hủy bộ đếm dwell, không hoàn thành trong nền.
- Nếu người dùng vào thẳng finale, bắt đầu khi có thao tác khám phá; hoàn thành chỉ sau started và đủ dwell.
- `hotspot_opened` phát lại khi người dùng đóng rồi mở; chọn lại panel đang mở không phát thêm.
- `language_changed` không phát khi chọn locale đang dùng hoặc điều hướng đổi locale thất bại.
- `audio_enabled` phát mỗi lần bật thành công sau trạng thái tắt; resume tab và retry tự động không phát lại.
- Lỗi audio và nút kênh chưa cấu hình không phát sự kiện thành công.

## Sự kiện CTA và cách đọc chỉ số

- CTA chính mở khu vực liên hệ: phát một `cta_clicked` với `target: contact-section`.
- Một click kênh thật phát một `cta_clicked` cùng một sự kiện riêng của kênh, ngay trước điều hướng.
- Hai sự kiện trên mô tả một hành động; không cộng tổng chúng để báo cáo số lượt liên hệ.
- Một handler sở hữu phát sự kiện; ngăn trùng do bubbling, handler anchor/button hoặc listener toàn cục.
- Chuột, chạm và bàn phím dùng cùng handler kích hoạt; không phát thêm từ `pointerdown` hay hover.
- Không chặn điều hướng để đợi analytics, không mở cửa sổ trắng trước rồi mới chờ sink.
- Click liên hệ là ý định liên hệ, không chứng minh tin nhắn đã gửi, cuộc tư vấn hoặc lead đủ điều kiện.
- Tỷ lệ hoàn thành = document đã completed / document đã started chỉ có nghĩa khi sink có cách tổng hợp hợp lệ.
- Lượt xem chương có cả lần quay lại; báo cáo reach cần tách số chương duy nhất trong một document.
- Lead đủ điều kiện cần quy trình xác nhận kinh doanh riêng; không có sự kiện qualified lead trong Phase 1.

## Điều kiện nghiệm thu

- Kiểm tra đủ mười tên sự kiện và payload enum; unknown event, trường lạ và dữ liệu ngoài allowlist bị loại.
- Đi tiến A → B, lùi A, rung biên, nhảy finale: xác minh số phát đúng quy tắc dwell và entryIndex.
- Đổi VI/EN, đổi renderer và mô phỏng Strict Mode không tự tăng started/completed/chapter.
- Xác minh contact chưa cấu hình không phát, contact thật phát cặp đúng một lần bằng bàn phím và chuột.
- Xác minh audio bị chặn không phát enabled; resume khi quay lại tab không tính như bật mới.
- Kiểm tra Network/Storage ở production mặc định: không analytics request, cookie hoặc persistent identifier.
- Sink lỗi, đầy buffer hoặc ném exception đều không làm hỏng hành trình và liên kết liên hệ.
