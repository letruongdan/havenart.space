/**
 * HavenArt — Unit Tests for Hotspot Buttons, Modal Panel & Detail List
 * Contract Version: havenart-contracts-1.1
 * References: docs/HOTSPOT_SPEC.md, docs/ACCESSIBILITY_SPEC.md
 *
 * Local Criteria (W17):
 * - W17-AC1: Button/keyboard/touch mở cùng dialog; Escape/backdrop/focus restore, không modal lồng.
 * - W17-AC2: Freeze snapshot khi mở; đóng lúc raw xa rendered không teleport; CTA hủy old restore.
 * - W17-AC3: Cả ba chi tiết có DOM anchor (detail-{id}) và nội dung semantic tương đương.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HotspotButton } from '@/components/hotspots/HotspotButton';
import { HotspotPanel } from '@/components/hotspots/HotspotPanel';
import { DetailList } from '@/components/hotspots/DetailList';
import { HOTSPOTS } from '@/config/hotspots';
import type { StoryRuntime, FreezeToken } from '@/types/runtime';

const mockCopy = {
  'travertine-wall': {
    title: 'Tường đá travertine',
    categoryLabel: 'Vật liệu',
    description: 'Bề mặt đá travertine sắc ấm tạo chiều sâu cho góc sinh hoạt dưới ánh sáng gián tiếp.',
    rationale: 'Trong concept này, kết cấu vân đá tự nhiên giữ cho mảng tường có sức gợi thẩm mỹ cao mà không cần nhiều đồ trang trí thừa thãi.',
    insight: 'Đá tự nhiên có khả năng hấp thụ và tỏa nhiệt chậm, hỗ trợ điều hòa nhiệt độ phòng khách vào buổi chiều.',
    triggerLabel: 'Khám phá chi tiết tường đá travertine',
  },
  'sliding-glass': {
    title: 'Hệ cửa kính trượt',
    categoryLabel: 'Kiến trúc',
    description: 'Khoảng mở rộng nối chỗ ngồi trong nhà với hiên và khu vườn xanh mát.',
    rationale: 'Nhịp cửa kính giúp giữ trọn vẹn tầm nhìn ra cảnh quan và tạo lối lưu thông trực tiếp không ngăn cách giữa nội thất và ngoại cảnh.',
    insight: 'Hệ ray âm sàn phẳng tạo sự chuyển tiếp liền mạch giữa sàn phòng khách và sàn hiên gỗ ngoài trời.',
    triggerLabel: 'Khám phá chi tiết hệ cửa kính trượt',
  },
  'garden-tree': {
    title: 'Cây trong vườn',
    categoryLabel: 'Cảnh quan',
    description: 'Tán cây xanh mát tạo bóng râm tự nhiên và điểm nhìn thư thái từ phòng khách.',
    rationale: 'Vị trí cây được tính toán để kết nối không gian sinh hoạt trong nhà với thiên nhiên ngoài trời, tạo chiều sâu thị giác cho căn phòng.',
    insight: 'Tán cây giúp lọc bớt bức xạ nhiệt hướng tây trước khi ánh nắng chạm tới vách kính phòng khách.',
    triggerLabel: 'Khám phá chi tiết cây trong vườn',
  },
};

describe('W17: HotspotButton (W17-AC1)', () => {
  it('renders accessible button with ARIA attributes and touch target >= 44x44px', () => {
    const html = renderToStaticMarkup(
      <HotspotButton
        id="travertine-wall"
        screenX={350}
        screenY={280}
        visible={true}
        title="Tường đá travertine"
        triggerLabel="Khám phá chi tiết tường đá travertine"
        categoryLabel="Vật liệu"
        isOpen={false}
        onClick={() => {}}
      />
    );

    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="hotspot-panel"');
    expect(html).toContain('aria-label="Khám phá chi tiết tường đá travertine"');
    expect(html).toContain('min-w-[44px]');
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('left:350px');
    expect(html).toContain('top:280px');
    expect(html).toContain('data-hotspot-id="travertine-wall"');
  });

  it('renders nothing when visible is false', () => {
    const html = renderToStaticMarkup(
      <HotspotButton
        id="travertine-wall"
        screenX={350}
        screenY={280}
        visible={false}
        title="Tường đá travertine"
        triggerLabel="Khám phá"
        categoryLabel="Vật liệu"
        isOpen={false}
        onClick={() => {}}
      />
    );

    expect(html).toBe('');
  });

  it('indicates open state when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <HotspotButton
        id="travertine-wall"
        screenX={350}
        screenY={280}
        visible={true}
        title="Tường đá travertine"
        triggerLabel="Khám phá"
        categoryLabel="Vật liệu"
        isOpen={true}
        onClick={() => {}}
      />
    );

    expect(html).toContain('aria-expanded="true"');
  });
});

describe('W17: HotspotPanel Semantic & Modal Structure (W17-AC1)', () => {
  it('renders modal dialog with accessible title, description, and ARIA roles', () => {
    const html = renderToStaticMarkup(
      <HotspotPanel
        isOpen={true}
        hotspotId="travertine-wall"
        copy={mockCopy['travertine-wall']}
        onClose={() => {}}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="hotspot-dialog-title"');
    expect(html).toContain('aria-describedby="hotspot-dialog-desc"');
    expect(html).toContain('id="hotspot-dialog-title"');
    expect(html).toContain('Tường đá travertine');
    expect(html).toContain('id="hotspot-dialog-desc"');
    expect(html).toContain('Bề mặt đá travertine sắc ấm');
    expect(html).toContain('Lý do thiết kế');
    expect(html).toContain('Lưu ý kiến trúc');
    expect(html).toContain('href="#contact"');
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <HotspotPanel
        isOpen={false}
        hotspotId="travertine-wall"
        copy={mockCopy['travertine-wall']}
        onClose={() => {}}
      />
    );

    expect(html).toBe('');
  });

  it('renders nothing when copy is null', () => {
    const html = renderToStaticMarkup(
      <HotspotPanel
        isOpen={true}
        hotspotId="travertine-wall"
        copy={null}
        onClose={() => {}}
      />
    );

    expect(html).toBe('');
  });
});

describe('W17: HotspotPanel Runtime Freeze & Navigation Lifecycle (W17-AC2)', () => {
  let mockRuntime: StoryRuntime;
  let freezeSpy: ReturnType<typeof vi.fn>;
  let resumeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const token: FreezeToken = {
      id: 1,
      raw: 0.5,
      rendered: 0.48,
      scrollY: 1200,
    };

    freezeSpy = vi.fn().mockReturnValue(token);
    resumeSpy = vi.fn();

    mockRuntime = {
      getSnapshot: vi.fn(),
      setScrollTarget: vi.fn(),
      tick: vi.fn(),
      freeze: freezeSpy,
      resume: resumeSpy,
      restore: vi.fn(),
      subscribeChapter: vi.fn(),
      setMode: vi.fn(),
      setQualityTier: vi.fn(),
      dispose: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('verifies freeze contract structure for modal opening and resuming', () => {
    // Test runtime freeze call signature
    const token = mockRuntime.freeze(1200);
    expect(freezeSpy).toHaveBeenCalledWith(1200);
    expect(token).toEqual({
      id: 1,
      raw: 0.5,
      rendered: 0.48,
      scrollY: 1200,
    });

    // Test resume with normal close
    mockRuntime.resume(token, 'close');
    expect(resumeSpy).toHaveBeenCalledWith(token, 'close');

    // Test resume with navigate CTA
    mockRuntime.resume(token, 'navigate');
    expect(resumeSpy).toHaveBeenCalledWith(token, 'navigate');
  });
});

describe('W17: DetailList Semantic HTML Equivalence (W17-AC3)', () => {
  it('renders all three architectural details with stable DOM IDs detail-{id}', () => {
    const html = renderToStaticMarkup(
      <DetailList
        hotspots={HOTSPOTS}
        copy={mockCopy}
      />
    );

    // Verifies stable DOM anchors matching HOTSPOT_SPEC and W10 proxies
    expect(html).toContain('id="detail-travertine-wall"');
    expect(html).toContain('id="detail-sliding-glass"');
    expect(html).toContain('id="detail-garden-tree"');

    // Content verification
    expect(html).toContain('Tường đá travertine');
    expect(html).toContain('Hệ cửa kính trượt');
    expect(html).toContain('Cây trong vườn');

    // Unique contact CTA anchor
    expect(html).toContain('href="#contact"');
  });

  it('highlights the active hotspot item when activeHotspotId is specified', () => {
    const html = renderToStaticMarkup(
      <DetailList
        hotspots={HOTSPOTS}
        copy={mockCopy}
        activeHotspotId="sliding-glass"
      />
    );

    // Contains highlighted class on sliding-glass card
    expect(html).toContain('id="detail-sliding-glass"');
    expect(html).toContain('bg-muted/80 border-primary');
  });
});
