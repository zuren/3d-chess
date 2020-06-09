const http = require("http")
const express = require("express")
const shortid = require("shortid")
const socketio = require("socket.io")

const PORT = process.env.PORT || 3000
const PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>chess!</title>
  <link rel="stylesheet" href="/static/index.css">
  <script src="/socket.io/socket.io.js"></script>
  <script type="module" src="/static/script.js" defer></script>
</head>
<body>
  <div class="game"></div>
  <div class="sidebar">
    <ul class="chat-messages" id="chat-messages"></ul>
    <form id="chat-form" class="chat-form"><input autocomplete="off" id="chat-input" type="text" placeholder="say anything"><input type="submit" value="send"></form>
  </div>
</body>
</html>
`

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const subscriptions = {}

app.use("/static", express.static("public"))

app.get("/", (_req, res) => {
  const id = shortid.generate()
  res.redirect(`/${id}`)
})

app.get("/:id", (req, res) => {
  res.set("Content-Type", "text/html")
  res.status(200)
  res.send(PAGE_HTML)
})

io.on("connection", socket => {
  const socketRooms = []
  let username = null

  socket.on("room:subscribe", msg => {
    username = msg.username

    socketRooms.push(msg.roomId)
    subscriptions[msg.roomId] = subscriptions[msg.roomId] || []
    subscriptions[msg.roomId].push(socket)
    subscriptions[msg.roomId].forEach(s => {
      s.emit("room:event", { roomId: msg.roomId, type: "USER_JOINED", username })
      s.emit("room:event", { roomId: msg.roomId, type: "USER_COUNT", count: subscriptions[msg.roomId].length })
    })
  })

  socket.on("room:event", msg => {
    subscriptions[msg.roomId] = subscriptions[msg.roomId] || []
    subscriptions[msg.roomId].forEach(s =>
      s.emit("room:event", msg))

    if (msg.type === "CHAT_MESSAGE" && msg.message === "/flip") {
      const message = Math.random() < 0.5 ? "heads" : "tails"
      subscriptions[msg.roomId].forEach(s => s.emit("room:event", { type: "CHAT_MESSAGE", username: "🖥", message }))
    }
  })

  socket.on("disconnect", () => {
    socketRooms.forEach(roomId => {
      subscriptions[roomId] = subscriptions[roomId].filter(s => s !== socket)
      subscriptions[roomId].forEach(s => {
        s.emit("room:event", { roomId, type: "USER_LEFT", username })
        s.emit("room:event", { roomId, type: "USER_COUNT", count: subscriptions[roomId].length })
      })
    })
  })
})

server.listen(PORT, () => console.log(`running on http://127.0.0.1:${PORT}`))
