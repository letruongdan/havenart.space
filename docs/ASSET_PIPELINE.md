# Pipeline tài nguyên và thay thế GLB

## Phạm vi và trạng thái

- Kế hoạch này chưa tải asset, chưa mua dịch vụ, chưa xuất GLB và chưa xác minh một nguồn bên thứ ba cụ thể.
- Ngân sách tài nguyên bắt buộc là 0 USD; ưu tiên hình học nguyên bản và asset CC0/public domain có bằng chứng.
- Không yêu cầu model, texture, HDRI, font, âm thanh hoặc dependency trả phí.
- Chi phí hosting và hạn mức dịch vụ phải kiểm chứng riêng; tài liệu này không hứa hosting miễn phí.
- Mọi kích thước, mức nén và chỉ tiêu dưới đây là đề xuất cần thử nghiệm trên scene thực.
- Pipeline phục vụ [scene architecture](SCENE_ARCHITECTURE.md) và [performance budget](PERFORMANCE_BUDGET.md).

## Thứ tự tạo tài nguyên

1. Dựng shell nguyên bản bằng module sàn, tường, mái, cột, cửa và cảnh quan khối lớn.
2. Xác nhận rail liên tục, các khoảng mở và khung hình ở đầy đủ chapter Phase 1.
3. Thêm furniture proxy nguyên bản đúng kích thước và anchor hotspot.
4. Thiết lập vật liệu PBR đơn giản với màu, roughness và tile scale hợp lý.
5. Chỉ bổ sung texture hoặc model ngoài khi nó cải thiện một khung hình hoặc câu chuyện cụ thể.
6. Thay từng vùng bằng GLB chất lượng cao hơn qua cùng hợp đồng origin/scale/anchor.
7. Kiểm chứng hình ảnh, license, network, CPU decode và GPU residency trước khi coi biến thể mới tốt hơn.
- Không chờ một villa GLB hoàn chỉnh mới kiểm chứng camera, UI, i18n và CTA.

## Danh mục đóng gói đề xuất

| Nhóm | Asset logic | Nội dung |
| --- | --- | --- |
| Core | `shell` | Đất, silhouette nhà, sàn, tường, mái, khoảng mở và cảnh quan nền |
| Phase 1 | `exterior` | Cổng, lối tiếp cận, cây phía trước; dùng chung cho approach |
| Phase 1 | `entrance` | Chi tiết ngưỡng cửa, vật liệu sảnh, đèn chọn lọc |
| Phase 1 | `living` | Nội thất, vật liệu và ba anchor ứng viên trong phòng khách |
| Phase 1 | `garden` | Cảnh quan sau, cây hotspot, ánh sáng ngoài trời; dùng chung cho finale |
| Phase 2 | `kitchen`, `courtyard`, `bedroom` | Chi tiết các vùng tương ứng, không lặp shell |
| Phase 2 | `bathroom`, `workspace`, `balcony` | Chi tiết các vùng tương ứng, khai báo cổng kết nối |
| Shared | `materials`, `environment`, `posters`, `audio` | Tài nguyên dùng chung, có owner và version riêng |

- Asset logic không buộc phải là một file; manifest chỉ rõ URI và dependency thực tế.
- Không gộp toàn bộ texture mọi phòng vào một GLB khiến tải living kéo cả Phase 2.
- Nếu GLB nhúng texture dùng chung, đo duplicate bytes và cân nhắc tách texture qua registry.
- Không nén decoder nặng cho mesh quá nhỏ nếu thời gian decode hoặc request lớn hơn phần tiết kiệm.

## Quy ước origin, trục và scale

- World origin là tâm ngưỡng cửa chính `(0,0,0)`; 1 unit = 1 m; Y-up; +Z về vườn sau.
- Mỗi zone có root origin và transform world được manifest khai báo, không suy từ bounding box khi chạy.
- Shell xuất theo world origin; detail zone được phép local origin tại anchor connector của nó.
- Apply transform hợp lý trong công cụ dựng hình; không để negative scale hoặc đơn vị cm ẩn trong root.
- Dùng vật tham chiếu 1 × 1 × 1 m để kiểm tra trước khi xuất và sau khi import.
- Pivot đồ nội thất tại chân đế hoặc điểm đặt; đặt offset mỹ thuật vào child, không thay root contract.
- GLB thay thế giữ root, hướng, bounds envelope và các anchor cùng tên như proxy.
- Mesh nhân bản hoặc instance phải giữ winding, normals và handedness đúng sau transform.
- Sai scale sửa trong nguồn/export; không sửa bằng scale ngẫu nhiên trong component runtime.

## Tên và metadata

- Zone ID dùng chữ thường dạng `living`; mesh dùng tên mô tả như `living_wall_stone_01`.
- Vật liệu dùng tên ổn định như `mat_wood_warm`, `mat_stone_travertine`, `mat_glass_clear`.
- Connector đặt tên như `portal_entrance_living`, có position, hướng và clear width/height.
- Anchor hotspot dùng `anchor_travertine-wall`, `anchor_sliding-glass`, `anchor_garden-tree`.
- Manifest lưu asset ID, variant, content hash, URI, encoded bytes, bounds, transform và source revision.
- Manifest lưu thêm dependencies, license record ID, triangle count, material count và texture inventory.
- Collision proxy cho shell và rail clearance được quản lý riêng khỏi mesh trình diễn chi tiết.
- Không phụ thuộc thứ tự child trong GLB hoặc tên tự sinh của công cụ export.

## Geometry và vật liệu

- Loại mặt không thể thấy nhưng giữ mặt phía sau cần thiết khi camera quay ngược hoặc nhìn qua kính.
- Dùng instance cho cây hoặc chi tiết lặp khi geometry/material thật sự giống nhau.
- LOD được thiết kế theo silhouette; không giảm đến mức cửa hoặc chân bàn đổi hình khi nhìn gần.
- Ưu tiên ít material slot; merge mesh chỉ khi không phá culling, picking hoặc cập nhật theo zone.
- Đề xuất texture 1K/2K; 4K chỉ có ngoại lệ được đo và cần khung hình gần chứng minh lợi ích.
- Base color không bake bóng mạnh nếu ánh sáng runtime còn thay đổi.
- Roughness, metalness, normal và AO dùng dữ liệu đúng channel/color space, không xử lý như ảnh màu.
- Ưu tiên vật liệu tileable với scale mét rõ ràng; normal nhẹ hơn thường tốt hơn noise quá mạnh.
- Kính/transmission có biến thể đơn giản để low tier không phụ thuộc shader đắt.

## Nén và xuất

- Chuẩn trao đổi là glTF/GLB; chọn exporter và validator theo tài liệu chính thức ở thời điểm triển khai.
- Chọn Meshopt hoặc Draco theo hiệu quả thực đo; không áp cả hai codec geometry chồng lên cùng dữ liệu.
- KTX2/Basis là ứng viên texture compression khi định dạng đích, loader và decoder đã kiểm chứng tương thích.
- Decoder/transcoder được phục vụ có kiểm soát cùng ứng dụng hoặc nguồn được cấu hình rõ ràng.
- Không hardcode phiên bản thư viện “mới nhất”; chốt ma trận tương thích và lockfile lúc dựng dự án.
- Lưu nguồn chưa nén và bản xuất tối ưu; không dùng file đã nén làm nguồn chỉnh sửa duy nhất.
- So sánh geometry/UV, normal, transparency và màu trước–sau nén tại các mốc camera.
- Tính cả thời gian worker, CPU decode, peak buffer và upload GPU, không chỉ nhìn dung lượng file.
- Đặt content hash trong URL hoặc manifest để thay asset không dùng nhầm cache cũ.

## License và nguồn tài nguyên

- Mọi asset bên thứ ba phải có bản ghi trong [ASSET_LICENSES.md](../ASSET_LICENSES.md) trước khi phân phối.
- Trường bắt buộc: tên, URL nguồn gốc, tác giả, license, attribution, file dùng và sửa đổi.
- Ghi thêm ngày truy cập, URL/trích dẫn điều khoản và bằng chứng license gắn đúng asset/version.
- “Tải miễn phí” không đồng nghĩa được dùng thương mại hoặc được phân phối lại trong web bundle.
- Không dùng tài nguyên license mơ hồ; chọn proxy nguyên bản thay vì đánh cược quyền sử dụng.
- Ưu tiên CC0/public domain; nếu dùng license có attribution, đặt credit ở vị trí được điều khoản chấp nhận.
- Font và âm thanh cũng là asset phải ghi nguồn/license; không chỉ kiểm tra model và texture.
- Geometry procedural nguyên bản ghi provenance và cách tạo, không gán CC0 cho chính nó khi chưa có quyết định cấp phép.
- Không xem ảnh công trình tải từ website studio khác là poster mặc nhiên được quyền dùng.

## Load, swap và cleanup

- Runtime dùng registry cache có reference count; zone instance không sở hữu texture dùng chung.
- Shell luôn pin; active + neighbor/predictive detail theo giới hạn số vùng và bytes.
- Load GLB xong chưa đủ: validate manifest, resolve dependency và upload GPU trước trạng thái ready.
- Giữ proxy khi detail chưa sẵn; chỉ swap tại frame boundary, không làm đổi anchor hoặc camera pose.
- Thay detail tránh nhân đôi geometry trong nhiều frame; nếu crossfade đắt hoặc gây ghosting, ưu tiên swap kín đáo.
- Evict detail gỡ clone/mixer/listener/buffer riêng rồi release dependency; registry dispose khi không còn ref/pin.
- Không dispose shared material/texture trong cleanup component chỉ vì một room đã unmount.
- Trang trí lỗi dùng proxy cùng kích thước; lỗi core/shell dùng full static DOM.
- Retry có giới hạn, đề xuất một lần cho lỗi mạng tạm thời; không vòng lặp tải vô hạn.
- Giải nén bị hủy hoặc request lỗi phải trả mọi reference đã acquire và buffer tạm.

## Bằng chứng nghiệm thu mỗi asset

- Ghi checksum, encoded bytes, số tam giác, vật liệu, texture, ước lượng GPU memory và thời gian decode/upload.
- Kiểm tra scale bằng vật 1 m, root transform và anchor connector bằng bảng đối chiếu.
- Render đối chiếu proxy/GLB ở cùng camera/lighting progress; kiểm tra không xuyên rail hoặc che CTA.
- Thử tiến–lùi qua vùng ba lần để kiểm tra resident/texture/geometry không tăng liên tục.
- Kiểm tra low tier, lỗi network và swap proxy; không chỉ kiểm tra desktop high.
- Kết quả cùng bằng chứng license là đầu vào [nghiệm thu](ACCEPTANCE_CRITERIA.md), chưa được tạo ở giai đoạn kế hoạch.
