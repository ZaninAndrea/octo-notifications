# Octo-Notifications

[![forthebadge](https://forthebadge.com/images/badges/60-percent-of-the-time-works-every-time.svg)](https://forthebadge.com) [![forthebadge](https://forthebadge.com/images/badges/its-not-a-lie-if-you-believe-it.svg)](https://forthebadge.com)

A GitHub App that sends you GitHub notifications via Push Notifications.

## Using

Just head over to [dokku.ml](https://dokku.ml) and sign in with GitHub.

Features:

-   real time push notifications
-   mark as read from notification
-   click to go to relevant github page

## Deploying

The app needs to have as environment variables

-   `CLIENT_ID` and `CLIENT_SECRET` of your GitHub App
-   `MONGO_URL` of the MongoDB where you want to store users' tokens and web push subscriptions
-   `VAPID_PUBLIC` and `VAPID_PRIVATE` keys (you can generate them [here](https://tools.reactpwa.com/vapid))
