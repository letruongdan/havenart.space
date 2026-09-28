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

## Tài sản bên thứ ba đang sử dụng

Chưa có bản ghi. Không có URL, tác giả, giấy phép hoặc tệp mẫu được điền giả vào sổ này.
Nguồn ứng viên chỉ nằm trong kế hoạch lựa chọn; không được coi là tài sản đã cấp phép trước khi kiểm tra.

## Nội dung do dự án tạo

Chưa có asset hình học/render/audio được tạo ở giai đoạn tài liệu này.
Khi tạo procedural geometry hoặc render gốc, ghi đường dẫn tạo, người tạo và nguồn phụ thuộc nếu có.
Không gán CC0 cho nội dung gốc khi chủ sở hữu chưa quyết định cấp phép theo điều kiện đó.

## Điều kiện trước production

- Đối chiếu toàn bộ model, texture, HDRI, audio, ảnh và font được build với bản ghi trong sổ.
- Thêm attribution/notice ở đúng vị trí mà giấy phép yêu cầu, kể cả khi asset đã đổi tên hoặc nén.
- Kiểm tra asset phụ thuộc và tệp nhúng; bằng chứng nguồn phải còn truy xuất hoặc được lưu cùng hồ sơ.
- Không có tài sản bắt buộc trả phí; mọi ngoại lệ ngân sách cần quyết định phạm vi mới trước khi sử dụng.
- Người phụ trách tài sản xác nhận sổ khớp chính xác bản build được phát hành.
