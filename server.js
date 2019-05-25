const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const webpush = require("web-push")
const http = require("http")
const fetch = require("isomorphic-fetch")
const btoa = require("btoa")
const moment = require("moment")

const { createServer } = http

const vapidKeys = {
    subject: "mailto:hello@github-notifications.glitch.me",
    publicKey:
        "BGxFCMN557K54skPUp-JLqbMfbc5u_3uyB8Zx4-VgGN4c4XqixyQ1Pbh5lSfosXIMSo9V3OvQlWdKj1WlSF8W14",
    privateKey: "6zA_8iUrNvO8mXHoSXnjXf1xPOzLOMznK_b8JvY6acY",
}

webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
)

const app = express()
app.use(cors())
app.use(bodyParser.json())

const accessTokens = []

const fetchNotifications = () =>
    accessTokens.map(accessToken =>
        fetch(
            "https://api.github.com/notifications?since=" +
                moment()
                    .subtract(1, "days")
                    .toISOString(),
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer " + accessToken.token,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        )
            .then(res => res.json())
            .then(res => {
                for (let notification of res) {
                    if (notification.unread) {
                        let content = notification.subject.title
                        console.log(content)
                        console.log(accessToken.subscriptions)

                        accessToken.subscriptions.map(
                            notificationSubscription =>
                                webpush.sendNotification(
                                    notificationSubscription,
                                    JSON.stringify({
                                        content,
                                        url: notification.subject.url,
                                        date: notification.updated_at,
                                    })
                                )
                        )
                    }
                }
            })
    )

app.post("/webPushSubscribe", (req, res) => {
    const notificationSubscription = req.body
    const accessTokenFound = accessTokens.find(
        token => token.userId === req.query.userId
    )

    console.log(req.query.userId, accessTokens)

    console.log(accessTokenFound)
    if (accessTokenFound) {
        const subscriptionFound = accessTokenFound.subscriptions.find(
            sub => sub.endpoint === notificationSubscription.endpoint
        )

        console.log(subscriptionFound)

        if (!subscriptionFound) {
            accessTokenFound.subscriptions.push(notificationSubscription)
        }

        fetchNotifications()
    }

    res.send("ok")
})

app.get("/github-callback", async (req, res) => {
    const result = await fetch(
        `https://github.com/login/oauth/access_token?client_id=${
            process.env.CLIENT_ID
        }&client_secret=${process.env.CLIENT_SECRET}&code=${req.query.code}`,
        { headers: { Accept: "application/json" } }
    ).then(res => res.json())

    const userId = await fetch("https://api.github.com/user", {
        method: "GET",
        headers: {
            Authorization: "Bearer " + result.access_token,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    })
        .then(res => res.json())
        .then(res => res.id)

    const tokenFound = accessTokens.find(
        accessToken => accessToken.userId === userId
    )

    if (!tokenFound) {
        accessTokens.push({
            token: result.access_token,
            userId,
            subscriptions: [],
        })
    }

    res.redirect("/?userId=" + userId)
})

app.use(express.static("public"))

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/views/index.html")
})

const port = process.env.PORT || 3000
createServer(app).listen(port, () =>
    console.log(`Example app listening on port ${port}!`)
)

setInterval(fetchNotifications, 60 * 1000)
