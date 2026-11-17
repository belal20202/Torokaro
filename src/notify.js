import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const nid = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2000000000; };

export async function schedule(key, title, body, at) {
  if (!Capacitor.isNativePlatform() || at <= Date.now()) return false;
  try {
    const p = await LocalNotifications.requestPermissions();
    if (p.display !== 'granted') return false;
    await LocalNotifications.schedule({ notifications: [{ id: nid(key), title, body, schedule: { at: new Date(at), allowWhileIdle: true } }] });
    return true;
  } catch { return false; }
}

export async function cancel(key) {
  if (!Capacitor.isNativePlatform()) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: nid(key) }] }); } catch { }
}
