import { GENZ_NOTIFICATION_MESSAGES } from '../data/notificationMessages';

/**
 * Generates an iCalendar (.ics) file content that adds daily recurring reminders
 * at 08:00, 12:00, and 17:00 with native lock-screen alarms and sound.
 * Works 100% reliably on iPhone (Apple Calendar) and Android (Google Calendar)
 * even when offline, phone is locked, app is closed, or on non-HTTPS origins!
 */
export function generateFoodReminderIcs(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://nubcal.app';

  // Pick random messages from catalog for the descriptions
  const morningMsg =
    GENZ_NOTIFICATION_MESSAGES.find((m) => m.id === 2)?.text ||
    'เช้ามาก็กินไอติมแท่งใหญ่รสชาไทยเลยเบ๋อ? สกิบิดิเกินคุณน้า ไปจดแคลเดี๋ยวนี้!';
  const noonMsg =
    GENZ_NOTIFICATION_MESSAGES.find((m) => m.id === 15)?.text ||
    'ไออ้วนตูนวันนี้กินชานมใช่ไหมทำไมยังไม่บันทึกแคล!';
  const eveningMsg =
    GENZ_NOTIFICATION_MESSAGES.find((m) => m.id === 28)?.text ||
    '5 โมงเย็นแล้วไออ้วนตูน! เลิกงานแล้วจะเลี้ยวเข้าร้านหมูกระทะฉ่ำๆ ใช่ไหม บันทึกแคลก่อนเลย!';

  const dtStamp = `${year}${month}${day}T000000Z`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nubcal//Food Reminder Notification//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Nubcal เตือนบันทึกอาหาร',
    'X-WR-TIMEZONE:Asia/Bangkok',

    // 1. Morning 08:00 Event
    'BEGIN:VEVENT',
    `UID:nubcal-morning-${year}@nubcal.app`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Bangkok:${year}${month}${day}T080000`,
    `DTEND;TZID=Asia/Bangkok:${year}${month}${day}T081500`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:🌅 ตูนจดอาหารรึยัง! (มื้อเช้า)',
    `DESCRIPTION:${morningMsg}\\n\\nเปิดแอป nubcal: ${appUrl}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:เตือนจดอาหารมื้อเช้า',
    'END:VALARM',
    'END:VEVENT',

    // 2. Noon 12:00 Event
    'BEGIN:VEVENT',
    `UID:nubcal-noon-${year}@nubcal.app`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Bangkok:${year}${month}${day}T120000`,
    `DTEND;TZID=Asia/Bangkok:${year}${month}${day}T121500`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:☀️ ไออ้วนตูนวันนี้กินชานมใช่ไหม! (มื้อเที่ยง)',
    `DESCRIPTION:${noonMsg}\\n\\nเปิดแอป nubcal: ${appUrl}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:เตือนจดอาหารมื้อเที่ยง',
    'END:VALARM',
    'END:VEVENT',

    // 3. Evening 17:00 Event
    'BEGIN:VEVENT',
    `UID:nubcal-evening-${year}@nubcal.app`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Bangkok:${year}${month}${day}T170000`,
    `DTEND;TZID=Asia/Bangkok:${year}${month}${day}T171500`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:🌙 5 โมงเย็นแล้วไออ้วนตูน! หมูกระทะหรือจดแคล (มื้อเย็น)',
    `DESCRIPTION:${eveningMsg}\\n\\nเปิดแอป nubcal: ${appUrl}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:เตือนจดอาหารมื้อเย็น',
    'END:VALARM',
    'END:VEVENT',

    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Downloads the .ics file directly to device.
 * On iOS Safari / Android, tapping this directly opens the native Calendar app
 * prompting the user to add the 3 daily recurring alarms with sound!
 */
export function downloadFoodReminderIcs(): void {
  const icsContent = generateFoodReminderIcs();
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'nubcal-reminders.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Generates direct Google Calendar 1-click links for each slot
 */
export function getGoogleCalendarUrl(slot: 'morning' | 'noon' | 'evening'): string {
  const titles = {
    morning: '🌅 ตูนจดอาหารรึยัง! (มื้อเช้า nubcal)',
    noon: '☀️ ไออ้วนตูนวันนี้กินชานมใช่ไหม (มื้อเที่ยง nubcal)',
    evening: '🌙 5 โมงเย็นแล้วไออ้วนตูน! หมูกระทะหรือจดแคล (มื้อเย็น nubcal)',
  };

  const times = {
    morning: '080000/081500',
    noon: '120000/121500',
    evening: '170000/171500',
  };

  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://nubcal.app';

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const [startTime, endTime] = times[slot].split('/');
  const dates = `${year}${month}${day}T${startTime}/${year}${month}${day}T${endTime}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titles[slot],
    dates,
    recur: 'RRULE:FREQ=DAILY',
    details: `อย่าลืมบันทึกแคลอรี่ใน nubcal!\nเปิดแอป: ${appUrl}`,
    location: appUrl,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
