import React, { useState, useEffect } from 'react';
import type { AppSettings, NotificationScheduleTimes } from '../types';
import { db } from '../db/database';
import {
  GENZ_NOTIFICATION_MESSAGES,
  NotificationMessageItem,
} from '../data/notificationMessages';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  triggerRandomFoodReminder,
  sendNotification,
  getNotificationDiagnostic,
  playNotificationSound,
  type ReminderSlot,
} from '../services/notificationService';
import {
  Bell,
  BellRing,
  Sparkles,
  Clock,
  Volume2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Smartphone,
} from 'lucide-react';

interface NotificationSettingsCardProps {
  settings: AppSettings;
  onNotificationSent?: (title: string, message: string) => void;
}

export const NotificationSettingsCard: React.FC<NotificationSettingsCardProps> = ({
  settings,
  onNotificationSent,
}) => {
  const isSupported = isNotificationSupported();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  const [enabled, setEnabled] = useState<boolean>(settings.notificationsEnabled ?? true);
  const [times, setTimes] = useState<NotificationScheduleTimes>(
    settings.notificationTimes || {
      morning: '08:00',
      noon: '12:00',
      evening: '17:00',
    }
  );

  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'morning' | 'noon' | 'evening' | 'general'>('all');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const diag = getNotificationDiagnostic();

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    setEnabled(settings.notificationsEnabled ?? true);
    if (settings.notificationTimes) {
      setTimes(settings.notificationTimes);
    }
  }, [settings.notificationsEnabled, settings.notificationTimes]);

  const handleRequestPermission = async () => {
    playNotificationSound();
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      setTestStatus('✅ อนุญาตการแจ้งเตือนเรียบร้อยแล้ว! กำลังส่งข้อความทดสอบ...');
      await triggerRandomFoodReminder('any');
      setTimeout(() => setTestStatus(null), 3500);
    } else if (res === 'denied') {
      setTestStatus('❌ การแจ้งเตือนถูกบล็อกในเบราว์เซอร์ กรุณากดไอคอนแม่กุญแจ 🔒 ที่แถบ URL เพื่อเปิดอนุญาต');
    }
  };

  const handleToggleEnabled = async () => {
    const nextVal = !enabled;
    setEnabled(nextVal);

    if (nextVal && permission !== 'granted') {
      await handleRequestPermission();
    }

    await db.settings.update(settings.id, {
      notificationsEnabled: nextVal,
      notificationTimes: times,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleTimeChange = async (slot: keyof NotificationScheduleTimes, value: string) => {
    const nextTimes = { ...times, [slot]: value };
    setTimes(nextTimes);

    await db.settings.update(settings.id, {
      notificationsEnabled: enabled,
      notificationTimes: nextTimes,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleTestRandom = async (slot?: ReminderSlot | 'any') => {
    playNotificationSound();
    if (permission === 'default') {
      await handleRequestPermission();
    }
    setTestStatus('กำลังยิงแจ้งเตือน...');
    const res = await triggerRandomFoodReminder(slot);
    setPermission(getNotificationPermission());
    if (res.success) {
      setTestStatus(`ส่งสำเร็จ! มีเสียงเตือน & การสั่น (${res.title})`);
    } else {
      setTestStatus(`ส่งแบบ In-App แล้ว (${getNotificationDiagnostic().advice})`);
    }
    if (onNotificationSent) {
      onNotificationSent(res.title, res.messageText);
    }
    setTimeout(() => setTestStatus(null), 5000);
  };

  const handleTestSpecificMessage = async (item: NotificationMessageItem) => {
    playNotificationSound();
    if (permission === 'default') {
      await handleRequestPermission();
    }
    let title = '🔔 nub: เตือนบันทึกอาหาร';
    if (item.slot === 'morning') title = '🌅 nub: ได้เวลาจดมื้อเช้าแล้วตูน!';
    if (item.slot === 'noon') title = '☀️ nub: เที่ยงแล้ว อย่าลืมจดแคลนะไออ้วน!';
    if (item.slot === 'evening') title = '🌙 nub: มื้อเย็นกินอะไรไป จดด่วน!';

    const success = await sendNotification(title, item.text, {
      slot: item.slot,
      tag: `nub-test-${item.id}`,
    });
    setPermission(getNotificationPermission());

    setTestStatus(
      success
        ? `ทดสอบข้อความ #${item.id} สำเร็จ! (มีเสียงเตือน)`
        : `แสดงผลในแอปแล้ว (${getNotificationDiagnostic().advice})`
    );
    if (onNotificationSent) {
      onNotificationSent(title, item.text);
    }
    setTimeout(() => setTestStatus(null), 4500);
  };

  const handleResetSchedule = async () => {
    const defaultTimes = { morning: '08:00', noon: '12:00', evening: '17:00' };
    setTimes(defaultTimes);
    await db.settings.update(settings.id, {
      notificationTimes: defaultTimes,
      updatedAt: new Date().toISOString(),
    });
  };

  const filteredMessages = GENZ_NOTIFICATION_MESSAGES.filter((m) => {
    if (galleryFilter === 'all') return true;
    return m.slot === galleryFilter;
  });

  return (
    <section className="card space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9EAF2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="section-title flex items-center gap-2 text-base font-bold text-[#20243A]">
              <BellRing className="w-5 h-5 text-[#6258F5]" />
              <span>แจ้งเตือนเตือนบันทึกอาหาร (Smart Reminders)</span>
            </h2>
            <span className="text-[10px] font-bold text-[#6258F5] bg-[#EFEDFF] px-2 py-0.5 rounded-full border border-[#E0DCFE]">
              Gen Z & สกิบิดิ 50 แบบ
            </span>
          </div>
          <p className="screen-subtitle text-xs text-[#858BA0] mt-1">
            สุ่มข้อความกวนๆ แซวตูนและไออ้วน เตือนให้อัปเดตแคลอรี่วันละ 3 รอบ (เช้า 08:00, เที่ยง 12:00, เย็น 17:00)
          </p>
        </div>

        {/* Master Toggle */}
        <button
          type="button"
          onClick={handleToggleEnabled}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-[#6258F5]' : 'bg-[#E9EAF2]'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Device Guidance Banners */}
      {diag.isInAppBrowser && (
        <div className="p-3.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] flex items-start gap-2.5 text-xs shadow-2xs">
          <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">⚠️ กำลังเปิดในเบราว์เซอร์ของ LINE / Facebook:</strong>
            <p className="mt-0.5 leading-relaxed">
              เบราว์เซอร์ในแอปแชทจะบล็อกระบบ Notification ทั้งหมด กรุณาแตะที่ <strong>จุดสามจุด ⋯ (ขวาบน)</strong> แล้วเลือก <strong>"เปิดในเบราว์เซอร์เริ่มต้น" (Open in Chrome หรือ Safari)</strong> เพื่อให้แจ้งเตือนเด้งได้
            </p>
          </div>
        </div>
      )}

      {diag.isIos && !diag.isStandalone && (
        <div className="p-3.5 rounded-2xl bg-[#EFEDFF] border border-[#E0DCFE] text-[#20243A] flex items-start gap-2.5 text-xs shadow-2xs">
          <Smartphone className="w-5 h-5 text-[#6258F5] shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-[#6258F5]">📱 วิธีเปิดรับแจ้งเตือนสำหรับ iPhone / iPad:</strong>
            <p className="mt-0.5 text-[#858BA0] leading-relaxed">
              Apple Safari กำหนดให้ต้องแตะปุ่มแชร์ <strong>[↑]</strong> ใน Safari แล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong> จากนั้นเปิดแอปจากไอคอนบนหน้าจอโฮม จึงจะเปิดรับการแจ้งเตือนได้
            </p>
          </div>
        </div>
      )}

      {/* Permission Status Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F6F7FB] border border-[#E9EAF2]">
        <div className="flex items-center gap-2.5">
          {permission === 'granted' ? (
            <CheckCircle2 className="w-5 h-5 text-[#27AE82] shrink-0" />
          ) : permission === 'denied' ? (
            <AlertCircle className="w-5 h-5 text-[#EB6478] shrink-0" />
          ) : (
            <Bell className="w-5 h-5 text-[#F59E0B] shrink-0" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#20243A]">
                สถานะการอนุญาตของเบราว์เซอร์:
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  permission === 'granted'
                    ? 'bg-[#E8F8F2] text-[#27AE82]'
                    : permission === 'denied'
                    ? 'bg-[#FFF0F2] text-[#EB6478]'
                    : 'bg-[#FEF3C7] text-[#D97706]'
                }`}
              >
                {permission === 'granted'
                  ? 'อนุญาตแล้ว (Active)'
                  : permission === 'denied'
                  ? 'ถูกบล็อกในเบราว์เซอร์ (Denied)'
                  : 'ยังไม่ได้กดอนุญาต (Default)'}
              </span>
            </div>
            <p className="text-[11px] text-[#858BA0] mt-0.5">
              {permission === 'granted'
                ? 'ระบบจะส่ง Notification เด้งเตือนบนหน้าจอมือถือและเดสก์ท็อปตามเวลาอัตโนมัติ'
                : permission === 'denied'
                ? 'หากต้องการรับการแจ้งเตือน กรุณาแตะที่ไอคอนแม่กุญแจบนแถบ URL แล้วเปลี่ยนสิทธิ์การแจ้งเตือนเป็น "อนุญาต"'
                : 'แตะปุ่ม "เปิดสิทธิ์แจ้งเตือนบนเครื่อง" เพื่อให้เบราว์เซอร์อนุญาตส่งข้อความเตือนคุณ'}
            </p>
          </div>
        </div>

        {permission !== 'granted' && isSupported && (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="btn btn-primary btn-sm whitespace-nowrap self-start sm:self-center shadow-md shadow-[#6258F5]/25 flex items-center gap-1.5 cursor-pointer"
          >
            <BellRing size={14} />
            <span>เปิดสิทธิ์แจ้งเตือนบนเครื่อง</span>
          </button>
        )}
      </div>

      {/* 3 Scheduled Time Slots */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#20243A] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#6258F5]" />
            <span>รอบเวลาแจ้งเตือนรายวัน (Daily Schedule Times)</span>
          </span>
          <button
            type="button"
            onClick={handleResetSchedule}
            className="text-[11px] text-[#6258F5] hover:underline flex items-center gap-1 font-medium"
            title="รีเซ็ตเป็น 08:00, 12:00, 17:00"
          >
            <RotateCcw size={12} />
            <span>คืนค่าเริ่มต้น</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Morning (08:00) */}
          <div className="p-3 rounded-2xl bg-white border border-[#E9EAF2] shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#20243A]">🌅 เช้า (มื้อเช้า)</span>
              <span className="text-[10px] text-[#858BA0]">Bangkok GMT+7</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={times.morning}
                disabled={!enabled}
                onChange={(e) => handleTimeChange('morning', e.target.value)}
                className="input-text text-sm font-semibold text-[#20243A] py-1.5 px-3 rounded-xl flex-1 bg-[#F6F7FB]"
              />
              <button
                type="button"
                onClick={() => handleTestRandom('morning')}
                disabled={!enabled}
                className="btn btn-secondary btn-sm px-2.5"
                title="ทดสอบยิงมุกมื้อเช้า"
              >
                <Play size={12} />
              </button>
            </div>
            <p className="text-[10px] text-[#858BA0] truncate">
              ปลุกตูน, ดักคอไอติมชาไทย, Mewing
            </p>
          </div>

          {/* Noon (12:00) */}
          <div className="p-3 rounded-2xl bg-white border border-[#E9EAF2] shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#20243A]">☀️ เที่ยง (มื้อกลางวัน)</span>
              <span className="text-[10px] text-[#858BA0]">Bangkok GMT+7</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={times.noon}
                disabled={!enabled}
                onChange={(e) => handleTimeChange('noon', e.target.value)}
                className="input-text text-sm font-semibold text-[#20243A] py-1.5 px-3 rounded-xl flex-1 bg-[#F6F7FB]"
              />
              <button
                type="button"
                onClick={() => handleTestRandom('noon')}
                disabled={!enabled}
                className="btn btn-secondary btn-sm px-2.5"
                title="ทดสอบยิงมุกมื้อเที่ยง"
              >
                <Play size={12} />
              </button>
            </div>
            <p className="text-[10px] text-[#858BA0] truncate">
              ดักคอชานม, บุฟเฟต์, สกิบิดิ, Rizz
            </p>
          </div>

          {/* Evening (17:00) */}
          <div className="p-3 rounded-2xl bg-white border border-[#E9EAF2] shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#20243A]">🌙 เย็น (มื้อเย็น)</span>
              <span className="text-[10px] text-[#858BA0]">Bangkok GMT+7</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={times.evening}
                disabled={!enabled}
                onChange={(e) => handleTimeChange('evening', e.target.value)}
                className="input-text text-sm font-semibold text-[#20243A] py-1.5 px-3 rounded-xl flex-1 bg-[#F6F7FB]"
              />
              <button
                type="button"
                onClick={() => handleTestRandom('evening')}
                disabled={!enabled}
                className="btn btn-secondary btn-sm px-2.5"
                title="ทดสอบยิงมุกมื้อเย็น"
              >
                <Play size={12} />
              </button>
            </div>
            <p className="text-[10px] text-[#858BA0] truncate">
              หมูกระทะ, ชาบู, พุงตูน, ตัวแม่จะแคร์เพื่อ
            </p>
          </div>
        </div>
      </div>

      {/* Instant Test Buttons Strip */}
      <div className="p-3.5 rounded-2xl bg-[#EFEDFF]/40 border border-[#E0DCFE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#6258F5] shrink-0" />
          <div>
            <span className="text-xs font-bold text-[#20243A]">
              ทดสอบระบบสุ่มแจ้งเตือนทันที (Instant Test Trigger)
            </span>
            <p className="text-[11px] text-[#858BA0]">
              กดเพื่อทดสอบดูว่าข้อความและการสั่นแจ้งเตือนเด้งบนอุปกรณ์ของคุณถูกต้องหรือไม่
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleTestRandom('any')}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles size={14} />
            <span>⚡ สุ่มยิงเลย (1 ใน 50)</span>
          </button>
        </div>
      </div>

      {testStatus && (
        <div className="p-2.5 bg-[#17213D] text-white text-xs rounded-xl flex items-center gap-2 animate-fade-in">
          <Volume2 size={14} className="text-[#6258F5]" />
          <span>{testStatus}</span>
        </div>
      )}

      {/* Accordion: 50 Gen Z & Skibidi Messages Gallery */}
      <div className="border border-[#E9EAF2] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#F6F7FB] text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-[#20243A]">
              📋 คลังข้อความกวนๆ Gen Z ทั้ง 50 แบบ (Skibidi & Brainrot Catalog)
            </span>
            <span className="text-[10px] font-bold text-[#6258F5] bg-[#EFEDFF] px-2 py-0.5 rounded-full">
              50 รูปแบบ
            </span>
          </div>
          {isGalleryExpanded ? (
            <ChevronUp size={16} className="text-[#858BA0]" />
          ) : (
            <ChevronDown size={16} className="text-[#858BA0]" />
          )}
        </button>

        {isGalleryExpanded && (
          <div className="p-4 bg-[#F6F7FB] border-t border-[#E9EAF2] space-y-3">
            {/* Gallery Filters */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'ทั้งหมด (50)' },
                { id: 'morning', label: '🌅 เช้า 08:00 (13)' },
                { id: 'noon', label: '☀️ เที่ยง 12:00 (14)' },
                { id: 'evening', label: '🌙 เย็น 17:00 (13)' },
                { id: 'general', label: '💥 มีมสุ่ม (10)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGalleryFilter(tab.id as typeof galleryFilter)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                    galleryFilter === tab.id
                      ? 'bg-[#6258F5] text-white shadow-xs'
                      : 'bg-white text-[#858BA0] hover:text-[#20243A] border border-[#E9EAF2]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Messages List */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredMessages.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white border border-[#E9EAF2] rounded-xl flex items-start justify-between gap-3 hover:border-[#6258F5]/40 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-[11px] font-mono font-bold text-[#858BA0] bg-[#F6F7FB] px-1.5 py-0.5 rounded mt-0.5">
                      #{item.id}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-[#20243A] leading-relaxed">
                        {item.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-[#6258F5] bg-[#EFEDFF] px-1.5 py-0.2 rounded">
                          {item.slot === 'morning'
                            ? '🌅 มื้อเช้า'
                            : item.slot === 'noon'
                            ? '☀️ มื้อเที่ยง'
                            : item.slot === 'evening'
                            ? '🌙 มื้อเย็น'
                            : '💥 สุ่มทุกเวลา'}
                        </span>
                        {item.tag && (
                          <span className="text-[9px] text-[#858BA0]">
                            #{item.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTestSpecificMessage(item)}
                    className="btn btn-secondary btn-sm text-[10px] py-1 px-2.5 shrink-0 flex items-center gap-1"
                    title="ทดสอบส่งข้อความนี้ทันที"
                  >
                    <Play size={10} />
                    <span>ลองส่ง</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
