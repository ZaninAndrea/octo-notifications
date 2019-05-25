# Octo-Notifications

A GitHub App that sends you GitHub notifications via Push Notifications.

## Using

Just head over to [dokku.ml](https://dokku.ml) and sign in with GitHub

## Deploying

The app needs to have as environment variables

-   `CLIENT_ID` and `CLIENT_SECRET` of your GitHub App
-   `MONGO_URL` of the MongoDB where you want to store users' tokens and web push subscriptions
-   `VAPID_PUBLIC` and `VAPID_PRIVATE` keys (you can generate them [here](https://tools.reactpwa.com/vapid))
