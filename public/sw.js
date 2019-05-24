self.addEventListener("push", function(event) {
  console.log("[Service Worker] Push Received.");
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  const pushData = JSON.parse(event.data.text());
  const title = pushData.content;
  const options = {
    body: pushData.content,
    data:{
      // url:pushData.url || "https://www.github.com"
      url:"https://www.github.com"
    }
  };

  const notification = self.registration.showNotification(title, options);
  notification.url = 
  event.waitUntil(notification);
});

self.addEventListener('notificationclick', function(event) {  
  var data = event.notification.data;

  var found = false;
  clients.openWindow(data.url)
  
  event.notification.close();

}, false);
