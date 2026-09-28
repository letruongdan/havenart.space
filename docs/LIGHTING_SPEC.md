# Đặc tả ánh sáng

## Ý đồ và trạng thái

- Câu chuyện ánh sáng là late golden hour → warm sunset → early dusk trong một hành trình liên tục.
- Chuyển đổi phải kín đáo, không làm người xem cảm thấy tua nhanh thời gian.
- Tất cả màu, cường độ, góc, resolution và khoảng chuyển dưới đây là đề xuất cần kiểm chứng.
- Chưa có render tham chiếu đã duyệt hoặc bằng chứng đạt chất lượng hình ảnh.
- Kiến trúc, vật liệu và tỷ lệ là nguồn chất lượng chính; không dùng postprocessing để che mô hình yếu.
- Scene và camera tuân theo [scene architecture](SCENE_ARCHITECTURE.md) và [camera spec](CAMERA_SCROLL_SPEC.md).

## Track ánh sáng duy nhất

- Lighting lấy cùng `renderedStoryProgress` với camera, chapter và hotspot ở mỗi frame.
- Preset chapter chỉ là tham chiếu dữ liệu; không mount/unmount toàn bộ light rig khi đổi chapter.
- Nội suy màu theo không gian màu phù hợp với pipeline render; tránh cộng màu đã mã hóa tùy tiện.
- Cường độ, exposure và môi trường có đường chuyển liên tục; không chạy tween riêng theo thời gian thực.
- Lấy mẫu cùng progress phải cho trạng thái ánh sáng như nhau khi cuộn tiến hoặc lùi.
- Ánh sáng practical tắt dần khi cuộn ngược; không giữ trạng thái “đã bật” từ lần đi trước.
- Không bật auto-exposure độc lập làm hai lần xem cùng progress có độ sáng khác nhau.
- Environment motion có thể theo thời gian, nhưng không được thay đổi trạng thái ngày/đêm của câu chuyện.

## Các mốc mỹ thuật đề xuất

| Progress | Không khí | Sun scale tương đối | Practical scale | Exposure tương đối |
| --- | --- | --- | --- | --- |
| 0,00 | Nắng chiều ấm, trời còn sáng | 1,00 | 0,00 | 1,00 |
| 0,27 | Bóng mềm trước cửa, sắc ấm nhẹ | 0,92 | 0,08 | 1,02 |
| 0,39 | Nắng xuyên khoảng mở, giữ chi tiết nội thất | 0,86 | 0,15 | 1,05 |
| 0,68 | Cuối hoàng hôn, đèn hắt dần rõ | 0,62 | 0,42 | 1,04 |
| 0,87 | Trời ngoài vườn mát hơn, nhà vẫn ấm | 0,38 | 0,72 | 1,00 |
| 1,00 | Chớm xanh giờ tối, chi tiết vườn còn đọc được | 0,28 | 0,85 | 0,98 |

- Các scale là hệ số mỹ thuật, không phải lux/lumen hoặc mô phỏng vật lý đã hiệu chuẩn.
- Nắng đề xuất tương đương sắc ấm 4.000–4.500 K; practical khoảng 2.700–3.000 K.
- Không đồng nhất nhiệt độ màu với giá trị RGB chính xác; xác nhận qua renderer và màn hình tham chiếu.
- Sky contribution chuyển nhẹ từ trung tính sang xanh xám; tránh bầu trời tím neon.
- Hướng mặt trời thay đổi ít, không quét bóng qua cả căn phòng như time-lapse.
- Chương bedroom ở Phase 2 vẫn trong buổi chiều này; nội dung “ánh sáng sáng sớm” không điều khiển rig.

## Rig tối thiểu

- Một directional sun chính tạo cấu trúc bóng, dùng xuyên toàn cảnh.
- Một environment/sky contribution cấp ánh sáng nền và phản xạ vật liệu.
- Practical lighting gồm emissive surface và số ít light không shadow khi cần tạo nhận biết không gian.
- Không đặt point light vào mỗi bóng đèn trang trí; dùng cụm hoặc ánh sáng đã bake cho nguồn nhỏ.
- Nội thất đủ sáng nhờ cửa mở, vật liệu sáng vừa phải và indirect contribution có kiểm soát.
- Tránh ambient quá mạnh khiến chân tường, trần và đồ nội thất mất chiều sâu.
- Ưu tiên một environment nhẹ; chỉ blend hai environment khi đo được bộ nhớ và thời gian upload phù hợp.
- Nếu không đủ budget blend environment, giữ environment ổn định và thay rig/exposure nhẹ liên tục.
- Bake chỉ mô tả thành phần tĩnh hợp lý; không bake bóng nắng cố định rồi xoay sun theo hướng mâu thuẫn.

## Nắng và bóng qua kiến trúc

- Hướng nắng ban đầu đề xuất từ phía trước trái, chiếu chéo qua khoảng mở phù hợp mặt bằng.
- Dựng cửa, lam và mái che với kích thước hợp lý để ánh sáng vào nhà có nguyên nhân nhìn thấy được.
- Shadow frustum bao vùng camera đang quan sát và phần vỏ nhà quan trọng, tránh bao toàn bộ đất vô ích.
- Đề xuất shadow map 2.048 cho high, 1.024 cho medium; low ưu tiên bóng bake/contact đơn giản.
- Các giá trị này là kích thước mục tiêu, không bảo đảm tương thích mọi GPU hoặc đủ chất lượng.
- Shadow bias và normal bias phải được tinh chỉnh theo scale mét; kiểm tra acne và vật thể bị nổi.
- Không bật shadow cho từng lá, mặt nước hoặc chi tiết đèn nhỏ.
- Chỉ update shadow khi sun/đối tượng shadow caster đổi và lợi ích hình ảnh có thể thấy.
- Nếu shadow camera di chuyển theo rail, nội suy vùng bao và kiểm tra shimmering ở cả hai chiều.
- Khi hạ tier, chuyển cấu hình shadow ở thời điểm ổn định; tránh biến mất cả mảng bóng trong một frame.

## Vật liệu và phản xạ

- Gỗ dùng vân đúng tỷ lệ thật; roughness không đồng nhất nhưng tránh noise quá mạnh.
- Đá travertine/limestone giữ sắc ấm nhẹ, không thay thành đá trắng bóng hoặc vàng bóng.
- Microcement và vữa có biến thiên nhỏ; roughness giúp đọc mặt phẳng trong ánh sáng xiên.
- Kính trong có tint rất nhẹ và phản xạ đủ đọc, không biến toàn mặt dựng thành gương.
- Phương án low cho kính giảm transmission/refraction và layer trong suốt chồng nhau.
- Tránh kính hai mặt không cần thiết vì làm tăng overdraw và khó sắp xếp transparency.
- Gương hoặc nước phản chiếu ưu tiên environment/probe hợp lý; planar reflection chỉ dùng nếu đo đạt budget.
- Emissive practical không đủ thay nguồn sáng vật lý; dùng để nhìn thấy bóng đèn, không giả định nó chiếu sáng tự động.
- Texture màu và texture dữ liệu phải khai báo đúng color space khi triển khai pipeline.
- Mọi thay đổi material phải được xem lại dưới ánh sáng cả đầu và cuối hành trình.

## Postprocessing có giới hạn

- Tone mapping và output color space được chốt một lần, ghi lại trong cấu hình renderer.
- Ưu tiên antialiasing chi phí phù hợp; không xếp nhiều lớp AA mà không đo.
- AO chỉ thêm khi giải thích được các tiếp xúc kiến trúc, tắt ở low.
- Bloom nếu dùng chỉ ảnh hưởng practical sáng; không làm trắng cửa kính hoặc mất texture đá.
- Depth of field mặc định tắt trong Phase 1 để giữ kiến trúc rõ và tránh đổi nét gây khó chịu.
- Không dùng vignette nặng, chromatic aberration, film grain hoặc lens flare làm phong cách chủ đạo.
- Lưu ảnh đối chiếu có/không hiệu ứng để chứng minh lợi ích trước khi giữ lại.
- Bảng budget đầy đủ nằm tại [performance](PERFORMANCE_BUDGET.md).

## DOM, hotspot và khả năng đọc

- Typography và CTA đặt trong DOM; tương phản chữ được kiểm chứng trên khung hình sáng và tối nhất.
- Nền chữ có thể là scrim nhẹ có giới hạn, không phủ lớp đen lớn lên kiến trúc.
- Marker hotspot không dựa chỉ vào đổi màu; có label/focus và bản tương đương trong DOM.
- Marker bị che bởi tường phải ẩn; ánh sáng yếu không được làm mất thông tin hotspot trong bản đọc.
- Chế độ reduced motion dùng ảnh tĩnh được xuất cùng các mốc, đủ câu chuyện và CTA, không import WebGL.
- Poster fallback cần color grading nhất quán; lỗi ảnh vẫn còn toàn bộ nội dung chữ.

## Phân tầng và failure policy

| Tier | Rig dự kiến | Giới hạn hiệu ứng |
| --- | --- | --- |
| High | Một sun có shadow, environment, practical chọn lọc | AO/bloom nhẹ chỉ sau profiling |
| Medium | Một sun shadow nhỏ hơn, practical ít hơn | Không reflection pass; AO mặc định tắt |
| Low | Environment nhẹ, sun đơn giản, ưu tiên ánh sáng bake | Không postprocessing nặng, không dynamic reflection |
| Fallback | Ảnh xuất sẵn và DOM đầy đủ | Không renderer hoặc shader |

- Decorative light/texture lỗi: dùng material trung tính hoặc tắt hiệu ứng, giữ scene còn đọc được.
- Environment lỗi: dùng màu nền và ambient rig tối thiểu đã dự trù; không hiển thị canvas đen.
- Rig/shader cốt lõi lỗi lặp: chuyển full static DOM theo [scene architecture](SCENE_ARCHITECTURE.md).
- Audio không được điều khiển ánh sáng; bật/tắt sound không làm thay đổi bầu không khí thị giác.

## Kiểm chứng trước nghiệm thu

- Xuất ảnh ở progress 0 / 0,27 / 0,39 / 0,54 / 0,68 / 0,87 / 1 cho từng tier dự kiến.
- Kiểm tra không có flash exposure tại biên chapter, khi đảo chiều, đổi tier hoặc tải xong GLB.
- Xem trên màn hình sáng/tối và mobile portrait để phát hiện nội thất tối bệt hoặc cửa cháy sáng.
- Đánh giá bóng đúng khoảng mở, không light leak qua tường, không xuyên mái và không bóng nổi.
- So sánh bộ đếm draw calls, render pass và GPU frame time trước/sau từng hiệu ứng tùy chọn.
- Ghi thông số được duyệt và ảnh tham chiếu; không coi bảng đề xuất này là kết quả đã đạt.
