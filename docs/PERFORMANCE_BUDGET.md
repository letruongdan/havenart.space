# Ngân sách và phương pháp đo hiệu năng

## Trạng thái và cách sử dụng

- Tất cả số dưới đây là mục tiêu/đề xuất, chưa có benchmark hoặc kết quả đạt thực tế.
- Budget giúp quyết định giảm chi tiết hoặc chuyển fallback; không phải lời hứa FPS trên mọi thiết bị.
- Kể chuyện, đọc nội dung và CTA phải hoạt động ngay cả khi toàn bộ 3D không khởi động.
- Tier gồm `high`, `medium`, `low`, `fallback`; viewport lớn không đủ để kết luận GPU mạnh.
- Đo bằng build production trên thiết bị thật, ghi rõ browser, GPU, màn hình và điều kiện mạng.
- Đối chiếu [scene](SCENE_ARCHITECTURE.md), [asset](ASSET_PIPELINE.md), [lighting](LIGHTING_SPEC.md).

## Định nghĩa để tránh đếm thiếu

- 1 MB trong ngân sách truyền tải này = 1.000.000 byte; bộ nhớ GPU có thể ghi MiB nhưng phải nêu đơn vị.
- `core 3D` là shell, detail exterior, vật liệu/environment tối thiểu cần trước frame 3D đầu tiên.
- `initial scene assets` là mọi tài nguyên cảnh được tải trong giai đoạn khởi động, gồm prefetch sớm.
- Core 3D là tập con của initial scene assets; không cộng lại hai nhóm rồi báo thành tổng khác.
- JS, CSS, font, poster và audio được thống kê riêng; tổng request startup vẫn phải bao gồm chúng.
- Encoded bytes trong manifest giúp so asset ổn định; wire transfer từ HAR ghi riêng theo HTTP compression/cache.
- GPU residency tính geometry buffer, texture, mipmap, render target, shadow map và environment conversion.
- Texture nén tải xuống 500 KB có thể tốn nhiều hơn đáng kể sau decode; không suy GPU memory từ file size.
- JS heap không đại diện tổng RAM và thường không cho biết đầy đủ bộ nhớ GPU.

## Mục tiêu network Phase 1

| Hạng mục | Mục tiêu đề xuất | Cách quyết định |
| --- | --- | --- |
| Core 3D nén | ≤ 8 MB | Nếu vượt, bỏ trang trí/texture khỏi critical path trước |
| Initial scene assets | ≤ 15 MB | Tránh prefetch tham lam trước khi có frame đầu |
| Texture | Chủ yếu 1K/2K | Không 4K mặc định; ngoại lệ phải có ảnh và số đo |
| Poster hero | ≤ 250 KB ở variant mobile | Kiểm tra chất lượng theo kích thước hiển thị thực |
| Font | ≤ 160 KB tổng các subset cần ban đầu | Bảo toàn dấu tiếng Việt; dùng tối đa hai họ font |
| Audio | 0 byte trước opt-in | Tải khi người dùng bật; không chặn core 3D |
| Phase 2 room | Không nằm trong initial Phase 1 | Tải theo manifest và vùng đang cần |

- JS runtime 3D phải lazy load; reduced-motion/fallback từ đầu không tải runtime WebGL.
- Ghi riêng JS transfer và parse/execute; đặt baseline sau khi chốt dependency, không giấu vào 8 MB asset.
- Không chặn hero/CTA để chờ tổng 15 MB; chỉ promote 3D khi core tối thiểu đủ dùng và vị trí đọc phù hợp.
- Mạng chậm giữ poster + DOM đầy đủ; tải xong sau khi đã cuộn xa không tự bật camera catch-up.
- Loading progress chỉ phản ánh các job/byte biết trước, không báo phần trăm giả cho toàn bộ trải nghiệm.

## Budget render theo tier đề xuất

| Chỉ số | High | Medium | Low | Fallback |
| --- | --- | --- | --- | --- |
| Mục tiêu FPS | 60 | 45–60 | ≥ 30 | DOM thông thường |
| Visible triangles | ≤ 1,2 triệu | ≤ 650.000 | ≤ 250.000 | 0 WebGL |
| Draw calls/frame | ≤ 200 | ≤ 130 | ≤ 80 | 0 WebGL |
| DPR tối đa | 1,5 | 1,25 | 1,0 | Theo trình duyệt |
| Sun shadow map | 2.048 | 1.024 | Bake hoặc tắt dynamic | Ảnh |
| Shadow-casting lights | 1 | 1 | 0 | 0 |
| Postprocessing | AA; AO/bloom có điều kiện | AA nhẹ; không AO mặc định | Không pass nặng | Không |
| Resident detail zones | Tối đa 3 | Tối đa 2 | Tối đa 2 với LOD thấp | 0 |
| Ước lượng GPU residency | ≤ 256 MiB | ≤ 160 MiB | ≤ 96 MiB | 0 WebGL |
| CPU decoded asset budget | ≤ 192 MiB | ≤ 128 MiB | ≤ 80 MiB | Ảnh/DOM |

- Shell và tài nguyên chung tính vào mọi budget; giới hạn detail không cho phép shell vượt ngân sách.
- Count draw calls gồm shadow/postprocessing pass thực tế; ghi cả main pass và tổng để tránh báo cáo mơ hồ.
- DPR còn bị cap theo pixel count; đề xuất ≤ 4 triệu pixel/frame trên high và ≤ 1,5 triệu trên low.
- Mobile khởi đầu low hoặc medium có điều kiện; không lấy DPR thiết bị 3 làm DPR canvas mặc định.
- GPU memory là ước lượng bảo thủ nếu API không cung cấp số trực tiếp; báo rõ phương pháp và sai số.
- Số lượng triangles thấp không tự bảo đảm nhanh nếu fill rate, transparency hoặc shader đang là bottleneck.

## Frame-time và tải nội dung

- 60 FPS tương ứng khoảng 16,7 ms/frame; 30 FPS khoảng 33,3 ms/frame, gồm phần việc cần hoàn tất cho frame.
- Mục tiêu desktop high: median ≤ 16,7 ms và p95 ≤ 25 ms trên thiết bị đại diện đã ghi rõ.
- Mục tiêu mobile low: median ≤ 33,3 ms và p95 ≤ 45 ms khi đã nóng máy ổn định.
- Ghi render/GPU time nếu có công cụ đáng tin cậy; luôn phân biệt với khoảng cách giữa rAF callback.
- Long task lúc decode/upload phải được log riêng; tránh kết luận tất cả stutter do GPU.
- Decode ở worker khi pipeline hỗ trợ; ưu tiên giới hạn số job song song và chia upload lớn.
- Đề xuất tối đa hai request detail và một decode/upload job nặng đồng thời, cần đo lại theo thiết bị.
- Không render background tab; pause motion/audio phù hợp và giới hạn delta-time khi trở lại.
- DOM input, đổi locale, hotspot và CTA phải đáp ứng kể cả lúc model đang decode.

## Bộ điều chỉnh chất lượng

1. Chọn tier khởi đầu thận trọng từ capability, viewport và dữ liệu phiên; không chỉ dựa user-agent.
2. Warm-up đề xuất 3 giây, bỏ frame do tab background/resize khỏi mẫu quyết định.
3. Theo dõi cửa sổ trượt 5 giây; ghi median, p95, số long task và lý do hạ tier.
4. High hạ medium nếu median > 22 ms hoặc p95 > 35 ms trong hai cửa sổ liên tiếp.
5. Medium hạ low nếu median > 30 ms hoặc p95 > 45 ms trong hai cửa sổ liên tiếp.
6. Low chuyển static khi median > 45 ms hoặc p95 > 70 ms kéo dài thêm hai cửa sổ, hoặc render lỗi lặp.
7. Mỗi lần đổi tier có cooldown đề xuất 10 giây; không dao động liên tục tại ngưỡng.
- Đây là heuristic cần hiệu chỉnh bằng pilot; không gọi các ngưỡng trên là tiêu chuẩn ngành.
- Mặc định chỉ tự hạ tier trong một phiên; nâng lại qua reload hoặc thao tác người dùng rõ ràng.
- Một stutter tải asset không đủ kết luận yếu; nhưng đỉnh memory hoặc lỗi context được xử lý ngay.
- Thứ tự giảm: postprocessing → DPR → shadow → môi trường động → texture/LOD → static.
- Camera rail, chapter, ánh sáng chủ đạo và nội dung không đổi ý nghĩa khi tier giảm.
- Nếu cần đổi GLB variant, giữ proxy/tài nguyên cũ đến frame swap an toàn; tránh nhân đôi residency vượt budget.

## Streaming và kiểm soát bộ nhớ

- Shell luôn resident; active detail + neighbor/predictive prefetch dùng chung hạn mức bytes.
- Số vùng là trần phụ; nếu hai vùng đã vượt budget thì phải dùng LOD/proxy hoặc evict trước.
- Dự đoán hướng cuộn chỉ thay ưu tiên tải, không tự thay chapter hoặc pose camera.
- Đổi hướng bỏ prefetch thừa trước, giữ active đang hiển thị; không reload qua lại mỗi frame ở biên.
- Dùng hysteresis retention đề xuất 2 giây cho neighbor nếu còn budget, nhưng không trì hoãn giải phóng khi thiếu bộ nhớ.
- Registry refcount quản lý shared resources; zone cleanup không dispose texture còn dùng ở shell/neighbor.
- Ghi peak trong lúc swap/decode, không chỉ đo trạng thái ổn định sau khi GC chạy.
- Ba lượt đi từ đầu đến cuối rồi quay lại không được tạo xu hướng tăng resource count không giới hạn.
- Context loss lặp hoặc lỗi core chuyển static DOM; decorative load lỗi chỉ dùng proxy.

## Ma trận đo tối thiểu

| Tình huống | Bằng chứng cần thu |
| --- | --- |
| Desktop GPU tích hợp, 1080p | FPS/frame-time qua toàn rail; draw calls; peak residency |
| Desktop GPU rời, viewport rộng | Pixel cap, shadow/postprocessing, final reveal |
| Android tầm trung thật, portrait | Nhiệt sau 5 phút; touch scroll; low tier; GPU/context behavior |
| iPhone/Safari thật, portrait | Bộ nhớ, resize viewport, background/resume và fallback |
| Mạng mô phỏng chậm, cache lạnh | Hero/CTA sớm, core bytes, decode/upload, không canvas đen |
| Reduced motion và WebGL unavailable | Network chứng minh không tải runtime WebGL từ đầu; nội dung đủ |

- Nếu chưa có thiết bị, ghi “chưa đo” và phạm vi còn thiếu; không chuyển kết quả giả lập thành kết quả thiết bị thật.
- Chạy cold cache và warm cache riêng; không chọn lần chạy nhanh nhất để báo cáo tổng quát.
- Lấy ít nhất ba lượt tương đương cho mỗi cấu hình đề xuất; ghi median và các ngoại lệ rõ nguyên nhân.
- Chụp các mốc 0 / 0,39 / 0,54 / 0,68 / 0,87 / 1 để đối chiếu tốc độ với chất lượng còn giữ lại.
- Báo cáo gồm build hash, thiết bị, browser, tier, mạng, viewport, nhiệt/điện nếu biết và dữ liệu thô.
- Chỉ đánh dấu đạt trong [nghiệm thu](ACCEPTANCE_CRITERIA.md) sau khi có bằng chứng, không dựa vào các bảng dự kiến này.
