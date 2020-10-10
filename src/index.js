import express, { json, urlencoded } from "express";
import Socket from "socket.io";
import http from "http";
import path from "path";
import mongoose from "mongoose";
import { UserModel } from "./models/user.model";
import bcrypt from "bcrypt";
import cors from "cors"; //NOT IMPORTANT
import jwt from "jsonwebtoken";

const SECRET = "secret";

mongoose.connect("mongodb://localhost/chatroom",{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true}               
).then(()=> {
  console.log("connected");
})

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
const port = 3000;

app.use(cors()); //NOT IMPORTANT

app.use(express.static(path.join(__dirname, "public")));

async function createUser(req, res){
    // const username = req.body.username;
  // const password = req.body.password;
  // const name = req.body.name;

  const { username, password, name } = req.body;
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  // const newUser = new UserModel({
  //   username: username,
  //   password: password,
  //   name: name
  // })

  const newUser = new UserModel({ username,
    password: hashedPassword
    ,name,
    salt
  });

  // newUser.save().then((userDocument) => {
  //   console.log(userDocument);
  //   res.send(userDocument);
  // }).catch((err) => {
  //   res.send(err)
  // })

  try {
    const foundUser = await UserModel.exists( { username } )
    if (!foundUser){
      const createdUser = await newUser.save();
      res.send(createdUser);
    } else {
      res.status(400).json({
        error: "The username is not unique"
      });
    }
  } catch(err) {
    res.status(400).send(err);
  }
}

async function getUser(req, res){
// const username = req.query.username;
  // const test = req.params;
  // console.log(test);
  // const list = await UserModel.find({username: username });
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader){
    return res.status(401).json({error: "Access Denied"});
  }
  const token = authorizationHeader.split(" ")[1];
  const payload = jwt.verify(token, SECRET);
  
  // if (payload.role == "admin"){
  //   // DO
  // }

  if(payload.username){
    const list = await UserModel.find();
    return res.send(list);
  } else {
    return res.status(401).json({error: "Access Denied"});
  }
}

async function login(req, res){
  const { username, password } = req.body;
  const user = await UserModel.findOne({ username });
  const hashedPassword = await bcrypt.hash(password, user.salt);

  if(hashedPassword == user.password){
    const token = jwt.sign({
      username: user.username,
      role: user.role
    }, SECRET);
    res.json({token})
  } else {
    res.status(401).json({
      error: "Invalid username or password"
    });
  }
}

// parse url encoded requests
app.use(urlencoded({ extended: true }))
// parse json requests
app.use(json())

app.get("/", (req, res) => {
  res.send("Hi");
})

//User creation endpoint
app.post("/user", createUser);

app.get("/user", getUser);

app.post("/login", login);

const userList = [];

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
