import type { AppSettings, NotificationScheduleTimes } from '../types';
import {
  getRandomNotificationMessage,
  getCurrentSlotByTime,
} from '../data/notificationMessages';
import { getBangkokDateString } from '../utils/date';

export type ReminderSlot = 'morning' | 'noon' | 'evening';

const DEFAULT_SCHEDULE_TIMES: NotificationScheduleTimes = {
  morning: '08:00',
  noon: '12:00',
  evening: '17:00',
};

// Safe storage wrapper for browsers, PWA, and node/test environments
const memoryStore = new Map<string, string>();

export function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStore.get(key) || null;
}

export function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // ignore
  }
  memoryStore.set(key, value);
}

export function clearNotificationMemory(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  } catch {
    // ignore
  }
  memoryStore.clear();
}

/**
 * Check if the browser / platform supports the Web Notifications API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Returns current permission status ('default' | 'granted' | 'denied' | 'unsupported')
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return Notification.permission;
  }
}

export interface InAppNotificationEventDetail {
  title: string;
  body: string;
  slot?: ReminderSlot | 'general' | 'any';
  timestamp: string;
}

/**
 * Send a notification either through Service Worker (preferred for PWA & mobile)
 * or through the standard window.Notification constructor fallback.
 */
export async function sendNotification(
  title: string,
  body: string,
  options?: NotificationOptions & { slot?: ReminderSlot | 'general' | 'any'; vibrate?: number[] }
): Promise<boolean> {
  // Always dispatch in-app event so the active tab can show a live toast banner
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<InAppNotificationEventDetail>('nub:in-app-notification', {
        detail: {
          title,
          body,
          slot: options?.slot || 'any',
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  // Trigger device vibration if supported (pattern: buzz, pause, buzz)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {
      // ignore
    }
  }

  const notificationOptions: Record<string, any> = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    tag: options?.tag || `nub-reminder-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    ...options,
  };

  // Try Service Worker registration first (works best on Android / PWA background)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions as NotificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('Service worker showNotification failed, trying fallback:', swErr);
    }
  }

  // Fallback to standard web notification
  try {
    new Notification(title, notificationOptions as NotificationOptions);
    return true;
  } catch (err) {
    console.warn('Standard Notification constructor failed:', err);
    return false;
  }
}

/**
 * Fire a random Gen Z reminder notification for a specific or current slot
 */
export async function triggerRandomFoodReminder(
  forcedSlot?: ReminderSlot | 'any'
): Promise<{ success: boolean; messageText: string; title: string }> {
  const effectiveSlot =
    forcedSlot && forcedSlot !== 'any'
      ? forcedSlot
      : (getCurrentSlotByTime() as ReminderSlot | 'any');

  const item = getRandomNotificationMessage(effectiveSlot);

  let title = '🔔 nub: เตือนบันทึกอาหาร';
  if (effectiveSlot === 'morning') {
    title = '🌅 nub: ได้เวลาจดมื้อเช้าแล้วตูน!';
  } else if (effectiveSlot === 'noon') {
    title = '☀️ nub: เที่ยงแล้ว อย่าลืมจดแคลนะไออ้วน!';
  } else if (effectiveSlot === 'evening') {
    title = '🌙 nub: มื้อเย็นกินอะไรไป จดด่วน!';
  }

  const success = await sendNotification(title, item.text, {
    slot: effectiveSlot,
    tag: `nub-slot-${effectiveSlot}`,
  });

  return {
    success,
    messageText: item.text,
    title,
  };
}

/**
 * Check whether a specific slot needs to be triggered right now
 */
export async function checkAndTriggerScheduledReminders(
  settings?: AppSettings
): Promise<ReminderSlot | null> {
  // If user explicitly disabled notifications in settings, skip
  if (settings && settings.notificationsEnabled === false) {
    return null;
  }

  const times: NotificationScheduleTimes =
    settings?.notificationTimes || DEFAULT_SCHEDULE_TIMES;

  const now = new Date();
  // Bangkok is UTC+7
  const bangkokHours = (now.getUTCHours() + 7) % 24;
  const bangkokMinutes = now.getUTCMinutes();
  const todayBangkok = getBangkokDateString();

  const parseTarget = (timeStr: string) => {
    const [h, m] = (timeStr || '08:00').split(':').map((v) => parseInt(v, 10));
    return {
      hours: Number.isFinite(h) ? h : 8,
      minutes: Number.isFinite(m) ? m : 0,
    };
  };

  const slots: ReminderSlot[] = ['morning', 'noon', 'evening'];

  for (const slot of slots) {
    const target = parseTarget(times[slot]);
    // Allow a 15-minute window for triggering (e.g. 08:00 to 08:14)
    const isWithinWindow =
      bangkokHours === target.hours &&
      bangkokMinutes >= target.minutes &&
      bangkokMinutes < target.minutes + 15;

    if (isWithinWindow) {
      const storageKey = `nub_notif_fired_${slot}_${todayBangkok}`;
      const alreadyFired = getStorageItem(storageKey);

      if (!alreadyFired) {
        setStorageItem(storageKey, new Date().toISOString());
        await triggerRandomFoodReminder(slot);
        return slot;
      }
    }
  }

  return null;
}

/**
 * Start background scheduler: runs every 45 seconds to check Bangkok time slots
 */
export function startNotificationScheduler(
  getSettings: () => AppSettings | undefined
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check immediately on app boot
  checkAndTriggerScheduledReminders(getSettings()).catch((err) => {
    console.warn('Scheduled reminder check error:', err);
  });

  // Re-check every 45 seconds
  const intervalId = window.setInterval(() => {
    checkAndTriggerScheduledReminders(getSettings()).catch((err) => {
      console.warn('Scheduled reminder check error:', err);
    });
  }, 45000);

  return () => {
    window.clearInterval(intervalId);
  };
}
