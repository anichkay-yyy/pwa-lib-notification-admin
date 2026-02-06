# PWA Push Notification Admin

Админ-панель для управления push-уведомлениями в PWA-приложениях.

## Client Integration Spec

Полная спецификация интеграции клиентского PWA-приложения с сервером уведомлений.

### Предварительные требования

1. Приложение зарегистрировано в админ-панели (получен `appId`)
2. Создан API-ключ для приложения (заголовок `X-API-Key`)
3. У клиента есть активный **Service Worker**
4. Браузер поддерживает [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

### Base URL

```
https://<your-server-host>/api/apps/:appId
```

Все маршруты ниже указаны относительно этого пути.

---

### 1. Получение VAPID public key

```
GET /vapid-public-key
```

**Авторизация:** не требуется

**Ответ:**
```json
{ "vapidPublicKey": "BEl62i..." }
```

---

### 2. Подписка на уведомления

```
POST /subscribe
```

**Заголовки:**
| Заголовок | Обязателен | Описание |
|-----------|-----------|----------|
| `X-API-Key` | да | API-ключ приложения |
| `Content-Type` | да | `application/json` |

**Тело запроса:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_...",
    "auth": "tBHItJI5svbpC7htDI..."
  }
}
```

| Поле | Тип | Обязателен | Описание |
|------|-----|-----------|----------|
| `endpoint` | string | да | URL push-сервиса, полученный от браузера |
| `keys.p256dh` | string | да | ECDH public key (base64url) |
| `keys.auth` | string | да | Auth secret (base64url) |

**Ответ:**
- `201` — `{ "ok": true }`
- `400` — `{ "error": "Invalid subscription data" }` (отсутствуют обязательные поля)
- `401` — `{ "error": "Missing X-API-Key header" }` или `{ "error": "Invalid API key" }`

**Поведение при повторной подписке:** если подписка с таким `endpoint` уже существует для данного приложения, ключи (`p256dh`, `auth`) и `User-Agent` обновятся (upsert).

---

### 3. Отписка

```
POST /unsubscribe
```

**Заголовки:**
| Заголовок | Обязателен | Описание |
|-----------|-----------|----------|
| `X-API-Key` | да | API-ключ приложения |
| `Content-Type` | да | `application/json` |

**Тело запроса:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Ответ:**
- `200` — `{ "ok": true }`
- `400` — `{ "error": "Missing endpoint" }`
- `401` — невалидный или отсутствующий API-ключ

---

### 4. Количество подписчиков

```
GET /subscribers/count
```

**Заголовки:**
| Заголовок | Обязателен | Описание |
|-----------|-----------|----------|
| `X-API-Key` | да | API-ключ приложения |

**Ответ:**
```json
{ "count": 42 }
```

---

### Полный пример интеграции (JavaScript)

```js
const APP_ID = 'your-app-id';
const API_KEY = 'your-api-key';
const SERVER = 'https://your-server.com';

async function subscribeToPush() {
  // 1. Регистрируем Service Worker
  const registration = await navigator.serviceWorker.register('/sw.js');

  // 2. Получаем VAPID public key с сервера
  const res = await fetch(`${SERVER}/api/apps/${APP_ID}/vapid-public-key`);
  const { vapidPublicKey } = await res.json();

  // 3. Конвертируем VAPID key в Uint8Array
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  // 4. Запрашиваем разрешение и подписываемся
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  // 5. Отправляем подписку на сервер
  const response = await fetch(`${SERVER}/api/apps/${APP_ID}/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(subscription),
  });

  console.log('Subscribed:', response.ok);
}

// Утилита: base64url string -> Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
}
```

### Минимальный Service Worker (sw.js)

```js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Notification', {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      image: data.image,
      data: data.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
```

### Формат payload уведомления

Payload отправляется из админ-панели. Единственное обязательное поле — `title`. Остальные поля опциональны и зависят от логики вашего Service Worker.

```json
{
  "title": "Заголовок уведомления",
  "body": "Текст уведомления",
  "icon": "/icon-192.png",
  "badge": "/badge-72.png",
  "image": "/promo.jpg",
  "data": {
    "url": "/promo-page"
  }
}
```

---

### Автоматическая очистка

Сервер автоматически удаляет «мертвые» подписки: если при отправке уведомления push-сервис вернёт `410 Gone` или `404 Not Found`, подписка удаляется из базы.

### Ошибки авторизации

| Код | Ответ | Причина |
|-----|-------|---------|
| `401` | `Missing X-API-Key header` | Заголовок `X-API-Key` не передан |
| `401` | `Invalid API key` | Ключ не найден, не принадлежит приложению или отозван |
