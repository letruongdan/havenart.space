# Đặc tả SEO và nội dung có thể lập chỉ mục

Trạng thái: hợp đồng triển khai; chưa xác nhận domain production, tài khoản liên hệ hoặc tài sản OG.
Chủ trì: frontend và biên tập nội dung; chủ thương hiệu xác nhận thông tin doanh nghiệp trước phát hành.

## URL và môi trường

- Hai route nội dung chính là `/vi` và `/en`; tiếng Việt là trải nghiệm mặc định.
- Khi host hỗ trợ redirect, cấu hình `/` → `/vi` tại host, không đổi theo IP, cookie hoặc user-agent.
- Nếu host không có redirect rule, `/` là trang vào bằng tiếng Việt, có link rõ tới `/vi` và `/en`; không dựa vào middleware.
- Chỉ hai locale hợp lệ được dựng; locale không hỗ trợ trả 404 thay vì sao chép nội dung mặc định.
- Dùng cấu hình `publicOrigin: string | null`; tên thư mục `havenart.space` không chứng minh domain đã hoạt động.
- Production chỉ xuất canonical, sitemap và URL tuyệt đối từ origin HTTPS đã được chủ sở hữu xác nhận.
- Khi origin chưa xác nhận, preview không xuất canonical trỏ tới địa chỉ phỏng đoán.
- Một quy tắc trailing slash thống nhất áp dụng cho redirect, liên kết, canonical và sitemap.
- Preview đặt `noindex, nofollow` qua metadata hoặc header phù hợp; kiểm tra cả bản deploy thực tế.
- `robots.txt` không thay thế chỉ thị noindex: crawler phải truy cập được trang để đọc noindex.
- Nếu preview chứa thông tin chưa được phép công bố, dùng kiểm soát truy cập; noindex không phải bảo mật.
- Production phải gỡ noindex có chủ đích, có bằng chứng kiểm tra sau triển khai.

## Nội dung HTML dựng sẵn

- Phase 1 static export: Server Components prerender HTML tại build cho brand, định vị, toàn bộ câu chuyện Phase 1, dịch vụ và khu vực liên hệ; không cần SSR runtime.
- HTML ban đầu không phụ thuộc WebGL, JavaScript, tải GLB hoặc hoàn tất chuyến đi để chứa nội dung chính.
- Mỗi chương Phase 1 có heading, ý đồ thiết kế và nội dung cô đọng có ích trong DOM.
- Sáu chương gồm exterior, approach, entrance, living, garden và finale; không tuyên bố Phase 2 đã có.
- Các nguyên tắc không gian và nội dung hotspot có bản tương đương DOM, mở được bằng bàn phím.
- Canvas hỗ trợ cách trình bày; không dùng texture chữ làm nguồn nội dung duy nhất.
- Tránh sao chép nguyên nội dung thành nhiều cây DOM riêng cho desktop, mobile và fallback.
- Nội dung phục vụ crawler phải giống nội dung người dùng có thể truy cập; không cloaking.
- Có một `h1` mô tả HavenArt và định vị; dùng `h2` cho dịch vụ, chương và lời mời liên hệ.
- `main`, `section`, `nav` có tên phù hợp; dùng button cho hành động và anchor cho liên kết.
- Thứ tự DOM theo thứ tự đọc câu chuyện ngay cả khi layout cinematic có canvas cố định.
- Hình truyền đạt nội dung có alt theo locale; hình trang trí dùng alt rỗng.

## Phạm vi dịch vụ và sự thật thương hiệu

- Bản nháp dịch vụ bám brief: thiết kế nhà ở; nhà phố, biệt thự, nhà vườn và cải tạo là nhu cầu mục tiêu.
- Chủ thương hiệu phải xác nhận dịch vụ thực tế trước khi xuất bản lời khẳng định năng lực cụ thể.
- Không thêm địa bàn hoạt động, giấy phép hành nghề, lịch sử, giải thưởng, số khách hàng hoặc lời chứng thực.
- Cảnh villa prototype là minh họa thiết kế; không gắn nhãn công trình đã xây hoặc dự án khách hàng.
- Không tự thêm cam kết chi phí, thời gian thi công hoặc kết quả kinh doanh.
- Mọi thông tin chưa biết giữ ở cấu hình dưới dạng `null`; ví dụ phải có nhãn rõ và không render như dữ liệu thật.

## Metadata song ngữ

| Trường | Quy tắc |
| --- | --- |
| `title` | Tên HavenArt và mô tả thiết kế nhà ở, bản VI/EN riêng |
| `description` | Tóm tắt triết lý ánh sáng, thông gió, vật liệu và nhu cầu sống; không nhồi từ khóa |
| `lang` | `vi` trên `/vi`, `en` trên `/en` |
| `canonical` | Tự tham chiếu route locale trên origin đã xác nhận |
| `hreflang` | `vi` ↔ `/vi`, `en` ↔ `/en`, `x-default` → `/vi` |
| Open Graph | Tiêu đề, mô tả, URL, locale và ảnh thật cho từng route |
| Ảnh chia sẻ | Ảnh/render có quyền sử dụng, kích thước và alt chính xác; không URL giả |

- Metadata lấy từ cùng dictionary locale với nội dung đã biên tập, không rải chuỗi trong component.
- Đích ảnh OG đề xuất là 1200 × 630; kiểm tra crop trên trình xem chia sẻ trước phát hành.
- Có thể dùng render gốc từ scene do dự án tạo sau khi scene đủ chất lượng và nguồn tài sản hợp lệ.
- Không phát hành đường dẫn ảnh chưa tồn tại hoặc nhận một ảnh internet làm ảnh thương hiệu chưa cấp phép.
- Ảnh OG, poster fallback và font tự host đều phải qua kiểm tra giấy phép.

## Sitemap, robots và dữ liệu có cấu trúc

- Sitemap production tạo tại build, gồm các route locale công khai, canonical và trả 200; loại preview, lỗi và URL placeholder.
- `lastmod` chỉ phản ánh lần thay đổi nội dung có ý nghĩa; không tự đổi thành thời gian mỗi request.
- Robots production cho phép các trang công khai và chỉ đường sitemap bằng origin thật.
- Trả đúng HTTP 404 cho nội dung không tồn tại; không soft-404 với hero trả 200.
- Hoãn schema Organization/ProfessionalService đến khi có đủ thông tin thật được chủ thương hiệu duyệt.
- Không suy diễn địa chỉ, giờ mở cửa, rating, review, telephone hoặc `sameAs` từ tên thương hiệu.
- Bất kỳ JSON-LD nào được thêm phải khớp nội dung hiện hữu và vượt qua validator phù hợp.
- Không hứa rich result, xếp hạng hoặc lượng lead từ việc thêm metadata/schema.

## Liên hệ và khả năng chuyển đổi

- Zalo, Messenger và WhatsApp là ba kênh dự định; URL và định danh mặc định là `null`.
- Preview hiển thị nhãn “Chưa cấu hình” / “Not configured” và control vô hiệu khi chưa có URL thật.
- Không dùng `href="#"`, số điện thoại ví dụ hoặc đường dẫn trang cá nhân ngẫu nhiên làm CTA.
- CTA chính dẫn tới khu vực chọn kênh; mỗi kênh dùng URL thật đã kiểm tra định dạng và chủ sở hữu.
- Điều kiện production: xác minh đủ ba kênh dự định, hoặc ghi nhận thay đổi phạm vi được chủ sở hữu chấp thuận.
- Người dùng reduced motion, tắt JavaScript hoặc không có WebGL vẫn đọc nội dung và dùng liên kết thật.

## Điều kiện nghiệm thu

- Kiểm tra HTML response `/vi` và `/en`: heading, dịch vụ, sáu chương và CTA tồn tại trước hydration.
- Kiểm tra locale switch, quy tắc `/`, 404, canonical và alternate không tạo vòng lặp hoặc trộn locale.
- Kiểm tra bản preview vẫn noindex; bản production dùng origin đã xác nhận và không còn noindex.
- Kiểm tra sitemap chỉ chứa URL truy cập được; robots tham chiếu đúng sitemap production.
- Kiểm tra ảnh OG thật trả 200, đúng MIME/dimension và có bản ghi giấy phép.
- Duyệt VI/EN cùng chủ thương hiệu: không có thông tin doanh nghiệp, dự án hoặc liên hệ bịa đặt.
- Lưu kết quả HTML, ảnh xem chia sẻ và checklist URL trong hồ sơ nghiệm thu; không coi audit điểm số là đủ.
