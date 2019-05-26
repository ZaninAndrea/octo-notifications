self.addEventListener("push", function(event) {
    console.log("[Service Worker] Push Received.")
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`)

    const pushData = JSON.parse(event.data.text())
    const title = pushData.content
    const options = {
        body: pushData.content,
        actions: [{ title: "Mark as Read", action: "mark-as-read" }],
        icon: "https://dokku.ml/logo.png",
        data: {
            url: "https://www.github.com",
            // url:pushData.url || "https://www.github.com"
            badge: "https://dokku.ml/logo.png",
            markAsReadToken: pushData.markAsReadToken,
        },
    }

    const notification = self.registration.showNotification(title, options)
    notification.url = event.waitUntil(notification)
})

self.addEventListener(
    "notificationclick",
    async function(event) {
        if (event.action === "mark-as-read") {
            await fetch(
                "https://dokku.ml/mark-as-read?token=" +
                    event.notification.data.markAsReadToken
            )

            event.notification.close()
        } else {
            var data = event.notification.data
            clients.openWindow(data.url)
            event.notification.close()
        }
    },
    false
)
