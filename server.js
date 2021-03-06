const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const webpush = require("web-push")
const http = require("http")
const fetch = require("isomorphic-fetch")
const moment = require("moment")
const Client = require("./mongo")
const jwt = require("jsonwebtoken")

async function fetchUserUrl(url, type, token) {
    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }).then(res => res.json())

        const icon =
            type === "Issue" && res.state === "open"
                ? "https://dokku.ml/issue-opened.png"
                : type === "Issue" && res.state === "closed"
                ? "https://dokku.ml/issue-closed.png"
                : type === "PullRequest" && res.state === "open"
                ? "https://dokku.ml/git-pull-request.png"
                : type === "Issue" && res.state === "closed"
                ? "https://dokku.ml/git-merge.png"
                : "https://dokku.ml/logo.png"

        return { url: res.html_url, icon }
    } catch (e) {
        return {
            url: "https://github.com",
            icon: "https://dokku.ml/logo.png",
        }
    }
}

async function main() {
    const { AccessToken } = await Client

    const { createServer } = http

    const vapidKeys = {
        subject: "mailto:hello@github-notifications.glitch.me",
        publicKey: process.env.VAPID_PUBLIC,
        privateKey: process.env.VAPID_PRIVATE,
    }

    webpush.setVapidDetails(
        vapidKeys.subject,
        vapidKeys.publicKey,
        vapidKeys.privateKey
    )

    const app = express()
    app.use(cors())
    app.use(bodyParser.json())
    const fetchNotifications = async () => {
        const accessTokens = await AccessToken.findAll({})

        accessTokens.map(accessToken =>
            fetch(
                "https://api.github.com/notifications?since=" +
                    moment()
                        .subtract(1, "minutes")
                        .subtract(100, "milliseconds")
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
                .then(async res => {
                    // skip empty arrays or errors
                    if (!res.length) return

                    for (let notification of res) {
                        if (notification.unread) {
                            let content = notification.subject.title

                            const { url, icon } = await fetchUserUrl(
                                notification.subject.url,
                                notification.subject.type,
                                accessToken.token
                            )
                            const markAsReadToken = jwt.sign(
                                {
                                    id: notification.id,
                                    userId: accessToken.userId,
                                },
                                process.env.SECRET
                            )

                            console.log(accessToken.subscriptions)

                            accessToken.subscriptions.map(
                                notificationSubscription =>
                                    webpush
                                        .sendNotification(
                                            notificationSubscription,
                                            JSON.stringify({
                                                content,
                                                markAsReadToken,
                                                icon,
                                                url,
                                                date: notification.updated_at,
                                            })
                                        )
                                        .catch(console.log)
                            )
                        }
                    }
                })
        )
    }

    app.post("/mark-as-read", async (req, res) => {
        try {
            const { id, userId } = jwt.verify(
                req.query.token,
                process.env.SECRET
            )
            const accessTokenFound = await AccessToken.findOne({
                userId,
            })

            // mark notification as read
            await fetch("https://api.github.com/notifications/threads/" + id, {
                method: "PATCH",
                headers: {
                    Authorization: "Bearer " + accessTokenFound.token,
                },
            })

            res.send("Ok")
        } catch (e) {
            res.send("Invalid token")
        }
    })

    app.post("/webPushSubscribe", async (req, res) => {
        const notificationSubscription = req.body
        const accessTokenFound = await AccessToken.findOne({
            userId: req.query.userId,
        })

        if (accessTokenFound) {
            const subscriptionFound = accessTokenFound.subscriptions.find(
                sub => sub.endpoint === notificationSubscription.endpoint
            )

            if (!subscriptionFound) {
                await AccessToken.updateOne(
                    { userId: req.query.userId },
                    {
                        $push: {
                            subscriptions: notificationSubscription,
                        },
                    }
                )
            }

            fetchNotifications()
        }

        res.send("ok")
    })

    app.get("/github-callback", async (req, res) => {
        const result = await fetch(
            `https://github.com/login/oauth/access_token?client_id=${
                process.env.CLIENT_ID
            }&client_secret=${process.env.CLIENT_SECRET}&code=${
                req.query.code
            }`,
            {
                headers: {
                    Accept: "application/json",
                },
            }
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

        const tokenFound = await AccessToken.findOne({
            userId: userId.toString(),
        })

        if (!tokenFound) {
            await AccessToken.insertOne({
                token: result.access_token,
                userId: userId.toString(),
                subscriptions: [],
            })
        }

        res.redirect("/subscribe?userId=" + userId)
    })

    app.use(express.static("public"))

    app.get("/", function(req, res) {
        res.sendFile(__dirname + "/views/index.html")
    })
    app.get("/subscribe", function(req, res) {
        res.sendFile(__dirname + "/views/subscribe.html")
    })

    const port = process.env.PORT || 3000
    createServer(app).listen(port, () =>
        console.log(`Example app listening on port ${port}!`)
    )

    setInterval(fetchNotifications, 60 * 1000)
}

main()
