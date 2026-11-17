import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const b64 = u8 => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function shareFile(data, name, mime) {
  const u8 = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  if (Capacitor.isNativePlatform()) {
    const r = await Filesystem.writeFile({ path: name, data: b64(u8), directory: Directory.Cache });
    await Share.share({ title: name, url: r.uri, dialogTitle: 'حفظ / مشاركة' });
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([u8], { type: mime }));
    a.download = name; a.click();
  }
}
