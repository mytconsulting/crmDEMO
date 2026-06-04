// ============================================================
// NOTIFICATION UTILITIES + WEB PUSH
// ============================================================

const NOTIFICATION_ICON = "/logo-icon.jpg";

// VAPID public key for Web Push subscriptions
const VAPID_PUBLIC_KEY = "BIEX1mphwNW0PDc5S5IfPdMKcXFz2Al6RP58ju-_Ps3VgYPDUXP3txUpFKCprqE06i0DdKKdhxDk1yM2VAneUEY";

// Persistent AudioContext
let _audioCtx = null;

function getAudioContext() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume();
  }
  return _audioCtx;
}

/**
 * Unlock audio on first user interaction.
 */
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {
    // Ignore
  }
}

/**
 * Request browser notification permission.
 */
export async function requestPermission() {
  if (!("Notification" in window)) return "unsupported";
  unlockAudio();
  const result = await Notification.requestPermission();
  return result;
}

export function isPermissionGranted() {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

export function getPermissionState() {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Play a notification chime (~1.5 seconds).
 * Three-tone ascending chime, long enough for Bluetooth speakers.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Three ascending tones: C5 → E5 → G5 (major chord)
    const notes = [
      { freq: 523, start: 0, duration: 0.4 },     // C5
      { freq: 659, start: 0.35, duration: 0.4 },   // E5
      { freq: 784, start: 0.7, duration: 0.6 },    // G5 (longer final note)
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      // Smooth fade in and out
      gain.gain.setValueAtTime(0, now + note.start);
      gain.gain.linearRampToValueAtTime(0.25, now + note.start + 0.05);
      gain.gain.setValueAtTime(0.25, now + note.start + note.duration - 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration);
    }
  } catch (e) {
    // Silently fail
  }
}

/**
 * Convert URL-safe base64 to Uint8Array (needed for push subscription)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to Web Push and save subscription to Supabase.
 * This enables background notifications even when the app is closed.
 */
export async function subscribeToPush(supabase) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[Push] Not supported in this browser");
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log("[Push] New subscription created");
    } else {
      console.log("[Push] Already subscribed");
    }

    // Save subscription to Supabase (with tenant_id for RLS)
    const subJson = subscription.toJSON();
    const { data: { session } } = await supabase.auth.getSession();
    const tenantId = session?.user?.id;

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("[Push] Error saving subscription:", error);
    } else {
      console.log("[Push] Subscription saved to Supabase");
    }

    return subscription;
  } catch (err) {
    console.error("[Push] Subscription failed:", err);
    return null;
  }
}

/**
 * Show a notification via the Service Worker.
 */
async function showNotificationViaSW(title, { body = "", tag = "" } = {}) {
  try {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        body,
        tag,
      });
      return true;
    }

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: NOTIFICATION_ICON,
        tag,
        renotify: !!tag,
        vibrate: [200, 100, 200],
      });
      return true;
    }
  } catch (e) {
    // Fall through
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: NOTIFICATION_ICON,
      tag,
      renotify: !!tag,
    });
    setTimeout(() => notification.close(), 5000);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Send a notification with sound.
 */
export function sendNotification(title, { body = "", tag = "" } = {}) {
  playNotificationSound();

  if (!isPermissionGranted()) return null;

  showNotificationViaSW(title, { body, tag });
  return true;
}
