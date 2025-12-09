import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Check if push notifications are supported by the browser
 */
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Check if running on iOS Safari (requires PWA installation)
 */
export const isIOSSafari = () => {
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i);
  return iOSSafari;
};

/**
 * Check if running as installed PWA
 */
export const isInstalledPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

/**
 * Get VAPID public key from server
 */
export const getVapidPublicKey = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/notifications/vapid-public-key`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.publicKey;
  } catch (error) {
    console.error('Error fetching VAPID public key:', error);
    throw error;
  }
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async (token) => {
  try {
    // Check if service worker is ready
    const registration = await navigator.serviceWorker.ready;
    
    // Get VAPID public key from server
    const publicKey = await getVapidPublicKey(token);
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    
    // Send subscription to server
    await axios.post(`${API_URL}/notifications/subscribe`, 
      { subscription },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async (token) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe();
      
      // Remove subscription from server
      await axios.post(`${API_URL}/notifications/unsubscribe`,
        { endpoint: subscription.endpoint },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
};

/**
 * Check if user is currently subscribed
 */
export const checkSubscriptionStatus = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Convert VAPID key from URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
