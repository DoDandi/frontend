'use client';

const KEY = 'yeolgi-device-id';

/** 기기별 익명 ID (localStorage의 UUID) */
export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          });
    localStorage.setItem(KEY, id);
  }
  return id;
}
