import express from "express";
import Socket from "socket.io";
import http from "http";
import path from "path";

const botName = "Chat Bot";
function formatMessage(message, username = botName) {
  return {
    text: message,
    username,
    time: new Date(),
  };
}

const app = express();
const server = http.createServer(app);
const io = Socket(server);
const port = 3100;

const userList = [];

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    console.log({ username, room });
    // const obj = {
    //   username: username,
    //   room: room
    // }
    userList.push({ username, room, socket });

    socket.join(room);

    socket.emit("message", formatMessage("Welcome to chatroom"));

    socket.broadcast
      .to(room)
      .emit("message", formatMessage(username + " has joined to the chatroom"));

    io.to(room).emit("roomUsers", {
      room,
      users: userList
        .filter((item) => item.room == room)
        .map((item) => ({ username: item.username })),
      // (item) => {return item.username}
    });
  });

  socket.on("chatMessage", (message) => {
    const userItem = userList.find((item) => item.socket.id == socket.id);

    io.to(userItem.room).emit(
      "message",
      formatMessage(message, userItem.username)
    );
  });
  // TODO: add disconnect event
});

server.listen(port, () => {
  console.log("webserver is listening to port " + port);
});
