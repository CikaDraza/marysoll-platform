// public/service-worker.js
// fallow-ignore-file unused-file
// (registruje se runtime kao string putanja u usePushNotifications:
//  navigator.serviceWorker.register("/service-worker.js"))
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const notificationIcon = data.icon || "/marysoll_elegant_logo.png";
    const options = {
      body: data.body,
      icon: notificationIcon,
      badge: notificationIcon,
      tag: data.tag,
      data: {
        url: data.url || "/",
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Try to find an existing window on the same origin and navigate it
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if ("navigate" in client) {
            return client.navigate(targetUrl).then(function (c) {
              return c ? c.focus() : null;
            });
          }
        }
        // No existing window — open a new one
        return clients.openWindow(targetUrl);
      }),
  );
});
