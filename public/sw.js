self.addEventListener("push", function(event) {
    const pushData = JSON.parse(event.data.text())
    const title = pushData.content
    const options = {
        body: pushData.content,
        actions: [
            {
                title: "Mark as Read",
                action: "mark-as-read",
                icon: "/mark-as-read.png",
            },
        ],
        icon: "https://dokku.ml/logo.png",
        badge: "https://dokku.ml/badge.png",
        data: {
            url: pushData.url,
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
                    event.notification.data.markAsReadToken,
                { method: "POST" }
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
