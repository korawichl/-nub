import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GENZ_NOTIFICATION_MESSAGES,
  getRandomNotificationMessage,
  getCurrentSlotByTime,
} from '../data/notificationMessages';
import {
  checkAndTriggerScheduledReminders,
  clearNotificationMemory,
  sendNotification,
} from '../services/notificationService';
import type { AppSettings } from '../types';

describe('Gen Z Food Reminder Notification System', () => {
  it('contains exactly 50 distinct Gen Z & Skibidi food reminder messages', () => {
    expect(GENZ_NOTIFICATION_MESSAGES).toHaveLength(50);

    const ids = new Set(GENZ_NOTIFICATION_MESSAGES.map((m) => m.id));
    expect(ids.size).toBe(50);
  });

  it('verifies all 50 messages have non-empty text, valid slot and target words', () => {
    const slots = new Set(['morning', 'noon', 'evening', 'general']);

    for (const msg of GENZ_NOTIFICATION_MESSAGES) {
      expect(msg.id).toBeGreaterThanOrEqual(1);
      expect(msg.id).toBeLessThanOrEqual(50);
      expect(msg.text.trim().length).toBeGreaterThan(5);
      expect(slots.has(msg.slot)).toBe(true);
    }

    // Check specific user-requested keywords are present in the catalog
    const allText = GENZ_NOTIFICATION_MESSAGES.map((m) => m.text).join(' ');
    expect(allText).toContain('ตูนจดอาหารรึยัง');
    expect(allText).toContain('ไออ้วนวันนี้กินอะไรไปบ้างไปจดด้วย');
    expect(allText).toContain('ไออ้วนตูนวันนี้กินชานมใช่ไหมทำไมยังไม่บันทึกแคล');
    expect(allText).toContain('ไอติมแท่งใหญ่รสชาไทย');
    expect(allText).toContain('สกิบิดิ');
    expect(allText).toContain('พะยูน');
    expect(allText).toContain('เกินคุณน้า');
    expect(allText).toContain('หมูกระทะ');
  });

  it('categorizes messages into morning (08:00), noon (12:00), evening (17:00), and general', () => {
    const morning = GENZ_NOTIFICATION_MESSAGES.filter((m) => m.slot === 'morning');
    const noon = GENZ_NOTIFICATION_MESSAGES.filter((m) => m.slot === 'noon');
    const evening = GENZ_NOTIFICATION_MESSAGES.filter((m) => m.slot === 'evening');
    const general = GENZ_NOTIFICATION_MESSAGES.filter((m) => m.slot === 'general');

    expect(morning.length).toBe(13);
    expect(noon.length).toBe(14);
    expect(evening.length).toBe(13);
    expect(general.length).toBe(10);
  });

  it('getRandomNotificationMessage returns an appropriate message for the requested slot', () => {
    const morningItem = getRandomNotificationMessage('morning');
    expect(['morning', 'general']).toContain(morningItem.slot);

    const noonItem = getRandomNotificationMessage('noon');
    expect(['noon', 'general']).toContain(noonItem.slot);

    const eveningItem = getRandomNotificationMessage('evening');
    expect(['evening', 'general']).toContain(eveningItem.slot);

    const anyItem = getRandomNotificationMessage('any');
    expect(anyItem.id).toBeGreaterThanOrEqual(1);
    expect(anyItem.id).toBeLessThanOrEqual(50);
  });

  it('getCurrentSlotByTime returns a valid slot identifier', () => {
    const slot = getCurrentSlotByTime();
    expect(['morning', 'noon', 'evening', 'any']).toContain(slot);
  });

  describe('Scheduled Reminder Evaluation', () => {
    const mockSettings: AppSettings = {
      id: 'default_settings',
      theme: 'dark',
      timezone: 'Asia/Bangkok',
      aiProviderId: 'free_builtin',
      notificationsEnabled: true,
      notificationTimes: {
        morning: '08:00',
        noon: '12:00',
        evening: '17:00',
      },
      updatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      clearNotificationMemory();
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('triggers morning reminder when Bangkok time matches 08:05 and not yet fired', async () => {
      // 08:05 Bangkok time = 01:05 UTC (UTC + 7)
      const fakeDate = new Date('2026-11-10T01:05:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(fakeDate);

      const firedSlot = await checkAndTriggerScheduledReminders(mockSettings);
      expect(firedSlot).toBe('morning');

      // Second check within the same day window must NOT double-fire
      const secondCheck = await checkAndTriggerScheduledReminders(mockSettings);
      expect(secondCheck).toBeNull();
    });

    it('triggers noon reminder when Bangkok time matches 12:00 and not yet fired', async () => {
      // 12:00 Bangkok time = 05:00 UTC
      const fakeDate = new Date('2026-11-10T05:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(fakeDate);

      const firedSlot = await checkAndTriggerScheduledReminders(mockSettings);
      expect(firedSlot).toBe('noon');
    });

    it('triggers evening reminder when Bangkok time matches 17:02 and not yet fired', async () => {
      // 17:02 Bangkok time = 10:02 UTC
      const fakeDate = new Date('2026-11-10T10:02:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(fakeDate);

      const firedSlot = await checkAndTriggerScheduledReminders(mockSettings);
      expect(firedSlot).toBe('evening');
    });

    it('does not trigger when outside scheduled time windows', async () => {
      // 03:00 Bangkok time = 20:00 UTC previous day
      const fakeDate = new Date('2026-11-10T20:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(fakeDate);

      const firedSlot = await checkAndTriggerScheduledReminders(mockSettings);
      expect(firedSlot).toBeNull();
    });

    it('respects notificationsEnabled=false setting', async () => {
      // 08:00 Bangkok time
      const fakeDate = new Date('2026-11-10T01:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(fakeDate);

      const disabledSettings: AppSettings = {
        ...mockSettings,
        notificationsEnabled: false,
      };

      const firedSlot = await checkAndTriggerScheduledReminders(disabledSettings);
      expect(firedSlot).toBeNull();
    });
  });

  describe('In-App Notification Dispatch', () => {
    it('dispatches nub:in-app-notification custom event', async () => {
      let receivedDetail: any = null;

      // Mock EventTarget on globalThis.window if not present in test runner
      const eventTarget = new EventTarget();
      const originalWindow = (globalThis as any).window;
      (globalThis as any).window = eventTarget;
      (globalThis as any).CustomEvent = class CustomEvent extends Event {
        detail: any;
        constructor(name: string, opt?: any) {
          super(name);
          this.detail = opt?.detail;
        }
      };

      const handler = (e: Event) => {
        receivedDetail = (e as any).detail;
      };
      eventTarget.addEventListener('nub:in-app-notification', handler);

      await sendNotification('Test Title', 'Test Body', { slot: 'morning' });

      expect(receivedDetail).not.toBeNull();
      expect(receivedDetail.title).toBe('Test Title');
      expect(receivedDetail.body).toBe('Test Body');
      expect(receivedDetail.slot).toBe('morning');

      eventTarget.removeEventListener('nub:in-app-notification', handler);
      (globalThis as any).window = originalWindow;
    });
  });
});
