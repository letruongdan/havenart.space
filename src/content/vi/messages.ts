/**
 * HavenArt — Từ điển nội dung Tiếng Việt (VI)
 * Contract Version: havenart-contracts-1.1
 */

import type { Dictionary } from '@/types/story';

export const viMessages: Dictionary = {
  brand: {
    name: 'HavenArt',
    tagline: 'Kiến tạo nơi bạn thuộc về.',
    supporting: 'Ngôi nhà bắt đầu từ cách bạn muốn sống.',
    conceptLabel: 'Không gian minh họa ý tưởng thiết kế',
  },
  navigation: {
    skipContent: 'Chuyển đến nội dung chính',
    skipContact: 'Chuyển đến phần liên hệ',
    languageLabel: 'Ngôn ngữ',
  },
  controls: {
    start: 'Bắt đầu khám phá',
    staticMode: 'Xem nội dung tĩnh',
    enableSound: 'Bật âm thanh',
    muteSound: 'Tắt âm thanh',
    closeDetails: 'Đóng chi tiết',
    progressLabel: 'Tiến độ không gian',
  },
  services: {
    title: 'Định hướng thiết kế nhà ở',
    description:
      'HavenArt đồng hành cùng chủ nhà kiến tạo không gian sống dựa trên nhịp sinh hoạt thực tế của gia đình, ưu tiên ánh sáng tự nhiên, vi khí hậu và chất lượng vật liệu bền vững.',
  },
  chapters: {
    exterior: {
      title: 'Kiến tạo nơi bạn thuộc về.',
      story:
        'Một ngôi nhà nhiệt đới đương đại với hình khối kiến trúc rõ ràng, nép mình sau những tán cây xanh và đón nắng chiều ấm áp.',
      intention:
        'Thiết lập mối tương quan hài hòa giữa khối xây dựng và thiên nhiên xung quanh, định vị vẻ đẹp bình yên và riêng tư ngay từ cái nhìn đầu tiên.',
      principles: [
        'Khối kiến trúc tối giản đương đại',
        'Tỷ lệ hài hòa với cảnh quan nhiệt đới',
        'Khoảng đệm cây xanh giảm bức xạ nhiệt',
      ],
      materials: 'Bê tông hoàn thiện thủ công, vữa khoáng tự nhiên, gỗ teak chịu thời tiết và thảm thực vật bản địa.',
      light: 'Ánh nắng cuối chiều chiếu xiên góc thấp, đổ bóng dài mềm mại trên các diện tường đặc rỗng.',
      imageAlt: 'Toàn cảnh mặt tiền biệt thự nhiệt đới HavenArt trong ánh nắng chiều.',
    },
    approach: {
      title: 'Kiến trúc bắt đầu trước ngưỡng cửa.',
      story:
        'Lối đi dẫn vào nhà được nén nhẹ giữa mảng tường đá và bóng mát cây xanh, tạo nhịp dừng cần thiết trước khi bước vào không gian bên trong.',
      intention:
        'Tạo ra một khoảng chuyển tiếp tâm lý, giúp người về rũ bỏ những ồn ào bên ngoài để sẵn sàng cho một nhịp sống thư thái.',
      principles: [
        'Lối tiếp cận dẫn hướng bằng ánh sáng và bóng đổ',
        'Tường phân cách tạo tính riêng tư cho sảnh',
        'Khoảng lùi kiến trúc tôn trọng ranh giới sinh hoạt',
      ],
      materials: 'Đá tự nhiên lát lối đi, tường vữa hoàn thiện nhám và lam gỗ đón gió.',
      light: 'Bóng râm đan xen cùng những vệt nắng len qua tán lá trên nền đá dạo.',
      imageAlt: 'Lối đi tiếp cận sảnh chính với hàng hiên và bóng cây xanh.',
    },
    entrance: {
      title: 'Bước vào một nhịp sống khác.',
      story:
        'Qua ngưỡng cửa chính, cao độ trần hạ thấp vừa phải tạo cảm giác che chở ấm cúng, trước khi mở rộng tầm nhìn xuyên suốt qua phòng khách ra vườn sau.',
      intention:
        'Chuyển đổi nhịp điệu từ ngoại cảnh sang nội thất, thiết lập trục thị giác trong suốt kết nối trực tiếp với thiên nhiên.',
      principles: [
        'Ngưỡng cửa kiến trúc định vị tâm thế bước vào',
        'Hiệu ứng nén - mở không gian tạo cảm xúc',
        'Trục nhìn thẳng ra mảng xanh sân vườn',
      ],
      materials: 'Cửa gỗ tự nhiên dày dặn, sàn đá mài tone ấm liền mạch từ sảnh vào nhà.',
      light: 'Ánh sáng gián tiếp êm dịu, tương phản nhẹ với khoảng sáng chan hòa phía sau phòng khách.',
      imageAlt: 'Sảnh đón nhìn qua khung cửa chính vào không gian sinh hoạt.',
    },
    living: {
      title: 'Một không gian cho những cuộc gặp gỡ.',
      story:
        'Phòng khách được tổ chức như một ốc đảo yên bình, nơi các thành viên quây quần dưới ánh sáng gián tiếp và ngắm nhìn khu vườn qua vách kính trượt lớn.',
      intention:
        'Ưu tiên sự kết nối gia đình và sự giao hòa giữa bên trong với bên ngoài, loại bỏ những vách ngăn không cần thiết.',
      principles: [
        'Không gian mở tối đa tầm nhìn ra thiên nhiên',
        'Ánh sáng hắt gián tiếp tạo cảm giác thư giãn',
        'Vật liệu thô mộc mang lại chiều sâu xúc giác',
      ],
      materials: 'Mảng tường đá travertine tự nhiên, sofa vải linen trung tính, bàn gỗ sồi và vách kính trong suốt.',
      light: 'Nắng hoàng hôn rọi xiên qua cửa kính, hòa quyện cùng ánh đèn trang trí ấm áp phản chiếu trên bề mặt đá.',
      imageAlt: 'Phòng khách ấm cúng với tường đá travertine và cửa kính nhìn ra vườn.',
    },
    garden: {
      title: 'Kiến trúc trả lại chỗ cho thiên nhiên.',
      story:
        'Bước qua hệ cửa kính trượt rộng mở là khoảng hiên sau và khu vườn yên ả, nơi gió trời và tán cây che chở cho những phút giây nghỉ ngơi.',
      intention:
        'Xóa nhòa ranh giới giữa trong và ngoài, để cảnh quan thiên nhiên thực sự trở thành một phần của đời sống hàng ngày.',
      principles: [
        'Mối nối không bậc thềm liên tục giữa sàn trong nhà và hiên',
        'Tán cây bóng mát làm mát tự nhiên cho công trình',
        'Khoảng mở đón gió đối lưu thông thoáng',
      ],
      materials: 'Sàn hiên chống trượt tone đất, sỏi tự nhiên, đất ẩm và mảng cỏ xanh mát.',
      light: 'Trời chập choạng xanh mát bên ngoài, phản chiếu ánh sáng vàng ấm hắt ra từ bên trong ngôi nhà.',
      imageAlt: 'Khu vườn sau với hiên gỗ và cây xanh dưới trời chạng vạng.',
    },
    finale: {
      title: 'Ngôi nhà của bạn nên kể câu chuyện của chính bạn.',
      story:
        'Một không gian kiến trúc trọn vẹn là nơi mọi chi tiết đều được chăm chút để tôn vinh lối sống và cảm xúc bình yên của gia chủ.',
      intention:
        'Mời bạn cùng trò chuyện với kiến trúc sư của HavenArt để hiện thực hóa một không gian sống thuộc về chính gia đình bạn.',
      principles: [
        'Lắng nghe và khởi đầu từ thói quen sinh hoạt thực tế',
        'Thiết kế cân bằng giữa thẩm mỹ và công năng bền vững',
        'Tôn trọng dấu ấn cá nhân của từng chủ nhân',
      ],
      materials: 'Sự hòa hợp tổng thể giữa đá, gỗ, kính, nước và cây xanh nhiệt đới.',
      light: 'Toàn cảnh ngôi nhà tỏa sáng ấm áp trong chiều tà, gợi mở một tổ ấm an yên.',
      imageAlt: 'Toàn cảnh ngôi nhà và khu vườn HavenArt ấm áp khi hoàng hôn buông xuống.',
    },
  },
  hotspots: {
    'travertine-wall': {
      title: 'Tường đá travertine',
      categoryLabel: 'Vật liệu',
      description: 'Bề mặt đá travertine sắc ấm tạo chiều sâu cho góc sinh hoạt dưới ánh sáng gián tiếp.',
      rationale:
        'Trong concept này, kết cấu vân đá tự nhiên giữ cho mảng tường có sức gợi thẩm mỹ cao mà không cần bài trí nhiều đồ trang trí thừa thãi.',
      insight: 'Đá tự nhiên có khả năng hấp thụ và tỏa nhiệt chậm, hỗ trợ điều hòa nhiệt độ phòng khách vào buổi chiều.',
      triggerLabel: 'Khám phá chi tiết tường đá travertine',
    },
    'sliding-glass': {
      title: 'Hệ cửa kính trượt',
      categoryLabel: 'Kiến trúc',
      description: 'Khoảng mở rộng nối chỗ ngồi trong nhà với hiên và khu vườn xanh mát.',
      rationale:
        'Nhịp cửa kính giúp giữ trọn vẹn tầm nhìn ra cảnh quan và tạo lối lưu thông trực tiếp không ngăn cách giữa nội thất và ngoại cảnh.',
      insight: 'Khung nhôm giấu viền tăng tối đa diện tích kính, đón trọn ánh sáng tự nhiên và gió trời đối lưu.',
      triggerLabel: 'Khám phá chi tiết hệ cửa kính trượt',
    },
    'garden-tree': {
      title: 'Cây trong vườn',
      categoryLabel: 'Cảnh quan',
      description: 'Tán cây xanh tạo một tầng bóng râm mát lành và là điểm nhìn thư thái từ phòng khách.',
      rationale:
        'Cây xanh được bố trí có chủ đích để kết nối trải nghiệm sinh hoạt trong nhà với khoảng nghỉ ngoài trời của ngôi nhà.',
      insight: 'Tán lá rụng theo mùa cho phép điều tiết lượng nắng xiên vào nhà giữa mùa hè và mùa đông.',
      triggerLabel: 'Khám phá chi tiết cây trong vườn',
    },
  },
  contact: {
    title: 'Liên hệ kiến trúc sư',
    description:
      'Trao đổi trực tiếp cùng đội ngũ kiến trúc sư HavenArt về dự định và nhu cầu không gian sống của bạn.',
    cta: 'Liên hệ kiến trúc sư',
    unconfigured: 'Chưa cấu hình',
    channels: {
      zalo: 'Zalo',
      messenger: 'Messenger',
      whatsapp: 'WhatsApp',
    },
  },
  status: {
    loading: 'Đang chuẩn bị không gian 3D...',
    fallback: 'Đang hiển thị bản nội dung tĩnh tương thích cao',
    audioLoading: 'Đang tải âm thanh không gian...',
    audioUnavailable: 'Âm thanh chưa khả dụng trên thiết bị này',
    audioPaused: 'Âm thanh tạm dừng',
  },
  metadata: {
    title: 'HavenArt — Kiến tạo nơi bạn thuộc về',
    description:
      'HavenArt — Khám phá ý tưởng thiết kế nhà ở đương đại mang tinh thần Contemporary Tropical Minimalism qua hành trình không gian tương tác.',
    ogTitle: 'HavenArt — Không gian kiến trúc đương đại',
    ogDescription:
      'Hành trình tương tác qua một ngôi nhà nhiệt đới đương đại: ánh sáng tự nhiên, vật liệu mộc mạc và sự kết nối sâu sắc với thiên nhiên.',
    ogAlt: 'Toàn cảnh ngôi nhà HavenArt Contemporary Tropical Minimalism',
  },
};
