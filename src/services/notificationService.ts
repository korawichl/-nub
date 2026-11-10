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

export interface NotificationDiagnostic {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSecureContext: boolean;
  isIos: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isInAppBrowser: boolean;
  hasServiceWorker: boolean;
  statusHeadline: string;
  advice: string;
}

/**
 * Diagnostic helper to understand why notification may not bounce on current device
 */
export function getNotificationDiagnostic(): NotificationDiagnostic {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      permission: 'unsupported',
      isSecureContext: false,
      isIos: false,
      isAndroid: false,
      isStandalone: false,
      isInAppBrowser: false,
      hasServiceWorker: false,
      statusHeadline: 'Server-side / Test environment',
      advice: 'การแจ้งเตือนทำงานได้เฉพาะบนเบราว์เซอร์เท่านั้น',
    };
  }

  const isSupported = isNotificationSupported();
  const permission = isSupported ? Notification.permission : 'unsupported';
  const isSecureContext =
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isInAppBrowser = /Line|FBAN|FBAV|Instagram|Twitter|MicroMessenger/i.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as any).standalone);
  const hasServiceWorker = 'serviceWorker' in navigator;

  let statusHeadline = 'พร้อมใช้งาน';
  let advice = 'ระบบแจ้งเตือนทำงานได้ตามปกติ';

  if (isInAppBrowser) {
    statusHeadline = 'เปิดในเบราว์เซอร์ของ LINE / Facebook';
    advice = 'เบราว์เซอร์ของ LINE หรือ Facebook บล็อกการแจ้งเตือนทั้งหมด กรุณากดปุ่ม ⋯ (ขวาบน) แล้วเลือก "เปิดใน Chrome" หรือ "เปิดใน Safari"';
  } else if (!isSecureContext) {
    statusHeadline = 'ไม่ได้เชื่อมต่อผ่าน HTTPS';
    advice = 'เบราว์เซอร์กำหนดให้การแจ้งเตือนต้องเปิดผ่าน https:// หรือ localhost เท่านั้น หากใช้ผ่าน Wi-Fi IP อาจถูกบล็อก';
  } else if (isIos && !isStandalone) {
    statusHeadline = 'iPhone ต้อง "เพิ่มไปยังหน้าจอโฮม"';
    advice = 'บน iOS/iPhone ให้แตะปุ่มแชร์ [↑] ใน Safari แล้วเลือก "เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen) จากนั้นเปิดแอปจากไอคอนบนหน้าจอโฮมจึงจะรับการแจ้งเตือนได้';
  } else if (permission === 'denied') {
    statusHeadline = 'ถูกบล็อกในเบราว์เซอร์ (Blocked)';
    advice = 'คุณเคยปฏิเสธหรือบล็อกการแจ้งเตือนไว้ กรุณากดไอคอนแม่กุญแจ 🔒 ที่แถบพิมพ์ URL ของเบราว์เซอร์ แล้วเปลี่ยนสิทธิ์การแจ้งเตือนเป็น "อนุญาต" (Allow)';
  } else if (permission === 'default') {
    statusHeadline = 'ยังไม่ได้กดอนุญาต (Pending Permission)';
    advice = 'กรุณากดปุ่ม "ขอเปิดการแจ้งเตือน" หรือ "⚡ สุ่มยิงเลย" แล้วกด "อนุญาต" บนหน้าต่างของเบราว์เซอร์';
  }

  return {
    isSupported,
    permission,
    isSecureContext,
    isIos,
    isAndroid,
    isStandalone,
    isInAppBrowser,
    hasServiceWorker,
    statusHeadline,
    advice,
  };
}

/**
 * Play an audible chime sound using Web Audio API synthesized tones
 * Works offline, zero external audio asset dependencies.
 */
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First chime tone: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Second chime tone: A5 (880 Hz) - cheerful ding-dong
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.18, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.42);
  } catch {
    // Audio context may require user interaction first
  }
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
  // Always trigger audio chime and in-app event so the active tab can see & hear it!
  playNotificationSound();

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

  if (!isNotificationSupported()) {
    return false;
  }

  // If permission is still 'default', prompt the user right now during user gesture!
  if (Notification.permission === 'default') {
    const requested = await requestNotificationPermission();
    if (requested !== 'granted') {
      return false;
    }
  }

  if (Notification.permission !== 'granted') {
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

  let resolvedIcon = '/icon.svg';
  try {
    resolvedIcon = new URL('icon.svg', window.location.href).href;
  } catch {
    // fallback
  }

  const notificationOptions: Record<string, any> = {
    body,
    icon: resolvedIcon,
    badge: resolvedIcon,
    vibrate: [200, 100, 200],
    tag: options?.tag || `nub-reminder-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    ...options,
  };

  // 1. Try Service Worker registration first (works best on Android Chrome / PWA background)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg =
        (await navigator.serviceWorker.getRegistration()) ||
        (await navigator.serviceWorker.ready);

      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions as NotificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('Service worker showNotification failed, trying fallback:', swErr);
    }

    // Try posting message to active service worker controller
    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: notificationOptions,
        });
        return true;
      }
    } catch {
      // ignore
    }
  }

  // 2. Fallback to standard web notification constructor
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
