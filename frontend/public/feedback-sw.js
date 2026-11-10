/* Durable feedback delivery. No personal application data is cached by this worker. */
self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let item;
    try { item = event.data?.json(); } catch { return; }
    if (!item?.id || !item.user_id) return;
    // A subscription belongs to one authenticated session, including on shared devices.
    const response = await fetch("/api/auth/me", {credentials:"same-origin", cache:"no-store"}).catch(() => null);
    if (!response?.ok) return;
    const account = await response.json();
    if (account.user?.id !== item.user_id) return;
    const windows = await self.clients.matchAll({type:"window", includeUncontrolled:true});
    const visible = windows.filter(client => client.visibilityState === "visible");
    if (visible.length) { visible.forEach(client => client.postMessage({type:"feedback-refresh"})); return; }
    await self.registration.showNotification(item.title, {body:item.body, tag:`server:${item.id}`, silent:true, data:{href:item.href}});
  })());
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const href = event.notification.data?.href;
    const target = new URL(typeof href === "string" && href.startsWith("/") && !href.startsWith("//") ? href : "/today", self.location.origin);
    if (target.origin !== self.location.origin) return;
    const windows = await self.clients.matchAll({type:"window", includeUncontrolled:true});
    const client = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (client) { await client.navigate(target.href); await client.focus(); }
    else await self.clients.openWindow(target.href);
  })());
});
self.addEventListener("install", event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener("activate", event => { event.waitUntil(self.clients.claim()); });
