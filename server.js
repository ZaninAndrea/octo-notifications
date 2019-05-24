const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const webpush = require("web-push");
const http = require("http");
const fetch = require("isomorphic-fetch")
const btoa = require("btoa")
const moment = require("moment")

const { createServer } = http;

const vapidKeys = {
  "subject": "mailto:hello@github-notifications.glitch.me",
  "publicKey": "BGxFCMN557K54skPUp-JLqbMfbc5u_3uyB8Zx4-VgGN4c4XqixyQ1Pbh5lSfosXIMSo9V3OvQlWdKj1WlSF8W14",
  "privateKey": "6zA_8iUrNvO8mXHoSXnjXf1xPOzLOMznK_b8JvY6acY"
};

webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = express();
app.use(cors());
app.use(bodyParser.json());

let subscriptions = {};
const accessTokens = []

const fetchNotifications = () => 
  accessTokens.map((accessToken)=>
    fetch('https://api.github.com/notifications\?since\='+moment().subtract(1, 'days').toISOString(), {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer '+accessToken.token,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    }).then(res => res.json()).then(res => {
        for(let notification of res){
          if(notification.unread){
            let content = notification.subject.title
            console.log(content)

            accessToken.subscriptions.map(notificationSubscription =>
              webpush.sendNotification(
                notificationSubscription,
                JSON.stringify({
                  content,
                  url:notification.subject.url,
                  date: notification.updated_at
                })
              )
            );
          }
        }
      console.log("sent to " + Object.values(subscriptions).length);
  })
)

app.post("/webPushSubscribe", (req, res) => {
  const notificationSubscription = req.body;

  if (
    Object.keys(subscriptions).indexOf(
      notificationSubscription.endpoint
    ) === -1
  ) {
    if(accessTokens[req.query.userId]){
      accessTokens[req.query.userId].subscriptions = notificationSubscription
    }

    fetchNotifications()
  }

  res.send("ok");
});

app.get("/github-callback", async (req, res)=>{
  const result = await fetch(`https://github.com/login/oauth/access_token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&code=${req.query.code}`, {headers:{"Accept":"application/json"}}).then(res=>res.json())
  accessTokens.push({
    token:result.access_token
  })
  const userId = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer '+result.access_token,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    }).then(res=>res.json()).then(res=>res.id)
  
  res.redirect("/?userId="+userId)
})

app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


createServer(app).listen(3000, () =>
  console.log("Example app listening on port 3000!")
);


setInterval(fetchNotifications, 60*1000);
