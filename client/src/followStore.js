import { createSignal, createEffect } from 'solid-js';

// Buat signal untuk melacak event follow/unfollow
const [followEvent, setFollowEvent] = createSignal(null);

// Fungsi untuk mengirim event follow/unfollow
export function emitFollowEvent(userId, isNowFollowing) {
  setFollowEvent({
    userId,
    isNowFollowing,
    timestamp: Date.now()
  });
}

// Fungsi untuk mendengarkan event follow/unfollow
export function onFollowEvent(callback) {
  // Gunakan createEffect SolidJS untuk bereaksi terhadap perubahan
  createEffect(() => {
    const event = followEvent();
    if (event && event.timestamp && callback) {
      // Hanya panggil callback untuk event baru (bukan nilai null awal)
      callback(event.userId, event.isNowFollowing);
    }
  });
  
  // Kembalikan fungsi cleanup no-op untuk konsistensi
  return () => {};
}

// Ekspor signal follow event untuk komponen mendengarkan
export { followEvent };