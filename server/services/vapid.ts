import webPush from 'web-push';

export function generateVapidKeys() {
  return webPush.generateVAPIDKeys();
}
