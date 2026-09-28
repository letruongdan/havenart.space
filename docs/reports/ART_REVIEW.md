# HavenArt — Đánh giá Mỹ thuật và Thẩm mỹ Kiến trúc (Gate G4)

- **Thời điểm đánh giá:** 28/09/2026
- **Candidate Commit:** `fa147748ab563e6c5d5760198f86fcdbd1096e8e`
- **Phiên bản hợp đồng:** `havenart-contracts-1.1`
- **Tài liệu đối chiếu:** [`docs/UX_STORYBOARD.md`](file:///d:/LandingPage/havenart.space/docs/UX_STORYBOARD.md), [`docs/LIGHTING_SPEC.md`](file:///d:/LandingPage/havenart.space/docs/LIGHTING_SPEC.md), [`docs/SCENE_ARCHITECTURE.md`](file:///d:/LandingPage/havenart.space/docs/SCENE_ARCHITECTURE.md)

---

## 1. Định vị Thẩm mỹ: Kiến trúc Nhiệt đới Hiện đại (Tropical Modernism)

HavenArt định vị là không gian sống sang trọng nhưng tĩnh lặng và hòa hợp với thiên nhiên. Thẩm mỹ của dự án được xây dựng dựa trên sự cân bằng tinh tế giữa hình khối kiến trúc mạnh mẽ, vật liệu tự nhiên có độ cảm xúc xúc giác cao (tactility) và ánh sáng chuyển dịch theo thời gian:

- **Bố cục tổng thể (Villa Envelope):**
  - Khu đất tiêu chuẩn $24\text{ m} \times 52\text{ m}$.
  - Khối nhà chính $16\text{ m} \times 15.5\text{ m}$, chiều cao trần $3.8\text{ m}$ tạo cảm giác thoáng đãng, thoát nhiệt tốt đặc trưng của khí hậu nhiệt đới.
  - Không sử dụng hình hộp kín rồi giấu tường (sealed box hack). Các khoảng mở cửa được tạo bằng hình học thực tế:
    - Khoảng mở cửa đón tiếp (Front Entrance): $X \in [-1.4, 1.4]\text{ m}$ ($2.8\text{ m}$ rộng, $2.6\text{ m}$ cao).
    - Khoảng mở cửa sau ra vườn (Rear Sliding Door): $X \in [0.8, 3.8]\text{ m}$ ($3.0\text{ m}$ rộng, $2.8\text{ m}$ cao).

---

## 2. Trải nghiệm 4 Không gian Kiến trúc (Phase 1 Architectural Zones)

### Zone 1: Ngoại thất & Lối tiếp cận (Exterior & Approach — Chapters 01–02)
- **Cảm thụ không gian:** Khởi đầu với góc nhìn bao quát công trình nép mình sau hàng cây nhiệt đới. Con đường lát đá rửa tự nhiên dẫn dắt bước chân từ tốn, tĩnh tâm trước khi bước vào ngưỡng cửa.
- **Thực thi 3D:** Khối kiến trúc bền vững, hàng hiên vươn dài che nắng nhiệt đới, cây xanh bố trí zic-zac tạo chiều sâu phối cảnh.

### Zone 2: Ngưỡng cửa & Sảnh đón (Entrance Threshold — Chapter 03)
- **Cảm thụ không gian:** Khoảnh khắc chuyển tiếp (transition threshold) từ ngoại cảnh rực rỡ vào không gian tĩnh lặng bên trong. Hệ trần nan gỗ teak tiêu âm làm dịu ánh sáng và âm thanh.
- **Thực thi 3D:** Khoảng mở cửa hình học cho phép camera lướt qua mượt mà, không va chạm tường (clearance $\ge 1.2\text{ m}$).

### Zone 3: Phòng khách & Trung tâm sinh hoạt (Living Room — Chapter 04)
- **Cảm thụ không gian:** Trái tim của ngôi nhà nơi con người kết nối với nhau và với thiên nhiên. Điểm nhấn là mảng tường đá travertine tự nhiên thô mộc, tương phản với bộ bàn ghế gỗ teak ấm áp và hệ cửa kính trượt khổ lớn mở trọn tầm nhìn ra vườn sau.
- **Vật liệu PBR (LivingMaterials):**
  - *Travertine Stone:* Bề mặt mờ có độ xốp tự nhiên (roughness $0.85$), màu be ấm, không gây lóa bloom dưới ánh chiều.
  - *Teak Wood:* Vân gỗ tự nhiên, độ bóng satin nhẹ nhàng (roughness $0.5$).
  - *Patinated Bronze:* Điểm xuyết kim loại đồng cổ điển, tạo cảm giác sang trọng kín đáo.
  - *Linen & Woven Wool:* Vải bọc sofa màu cát tự nhiên, tăng tính ấm cúng.

### Zone 4: Sân hiên & Vườn nhiệt đới (Garden Patio & Finale — Chapters 05–06)
- **Cảm thụ không gian:** Bước ra khu vườn rợp bóng cây cổ thụ. Tầm nhìn mở rộng lên cao (camera elevated rise $Y=6\text{ m}, Z=29\text{ m}$), bao quát toàn bộ ngôi nhà ấm áp đang lên đèn trong ánh hoàng hôn muộn.
- **Thực thi 3D:** Điểm neo cây đại thụ trung tâm (`garden-tree`), thảm cỏ nhiệt đới và mặt nước phản chiếu ánh chạng vạng.

---

## 3. Câu chuyện Ánh sáng (The Lighting Journey)

Hành trình cuộn đồng thời là một chuyến du hành thời gian của ánh sáng chiều nhiệt đới (`sampleLighting`):

```text
Progress p = 0.0          p = 0.35                  p = 0.70                p = 1.0
[Golden Afternoon] ------> [Sunset Warmth] --------> [Late Sunset] --------> [Twilight Dusk]
Mặt trời góc thấp 14°      Ánh sáng vàng cam         Hắt ấm nội thất         Bầu trời xanh thẫm
Bóng đổ dài qua sân       Ấm áp len lỏi qua rèm     Tương phản trong - ngoài Ngôi nhà bừng sáng đèn
```

- **Đơn định & Không chói mắt:** 1 nguồn sáng chính duy nhất (directional light) tính toán vector hướng mặt trời theo hàm lượng giác liên tục, triệt tiêu hiện tượng giật bóng hoặc nhảy preset. Cường độ phơi sáng (exposure) được kẹp cố định, đảm bảo khả năng đọc chữ trên giao diện luôn đạt độ tương phản chuẩn WCAG 2.2 AA.

---

## 4. Thẩm mỹ Nghe & Kiểu chữ (Soundscape & Typography)

- **Âm thanh thủ tục (Procedural Soundscapes):** 3 tệp âm thanh CC0-1.0 tạo ra âm thanh gió qua lá cây, tiếng tĩnh lặng trong phòng và tiếng thì thầm của khu vườn lúc chiều muộn mà không có tiếng ồn lặp gây khó chịu. Chuyển đổi giữa các không gian bằng thuật toán equal-power crossfade êm dịu.
- **Kiểu chữ (Typography):**
  - Tối đa 2 họ phông chữ: Serif cổ điển tinh tế cho tiêu đề thương hiệu (`HavenArt`) và Sans-serif hình học rõ ràng cho các thông số kỹ thuật và nội dung bài viết.
  - Hỗ trợ đầy đủ dấu thanh tiếng Việt không bị lệch dòng hay vỡ font.

---

## 5. Kết luận Đánh giá Mỹ thuật

Toàn bộ các yếu tố hình khối, không gian, vật liệu, ánh sáng, âm thanh và poster của Phase 1 đã đạt được sự hài hòa và thống nhất mỹ thuật cao độ theo đúng tinh thần "Kiến tạo nơi bạn thuộc về".

**Chữ ký nghiệm thu mỹ thuật:** HavenArt Architectural Visual Team (Đạt chuẩn thẩm mỹ Phase 1).
