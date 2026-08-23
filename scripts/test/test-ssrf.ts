import { isSafeWebhookUrl } from './src/security/webhookSecurity.ts';
isSafeWebhookUrl('https://parting-clapper-throttle.ngrok-free.app/api/agent').then(console.log).catch(console.error);
