import 'fake-indexeddb/auto';

process.env.HAVEN_ADMIN_PASSWORD = 'test-bootstrap-only-credential';

import { beforeEach, afterEach, vi } from 'vitest';
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => Response.json({success:false,photos:[]},{status:503}))); });
afterEach(() => vi.unstubAllGlobals());
