import express, { json, urlencoded } from "express";
import Socket from "socket.io";
import http from "http";
import path from "path";
import mongoose from "mongoose";
import { UserModel } from "./models/user.model";
import { RoomModel } from "./models/room.model";
import bcrypt from "bcrypt";
import cors from "cors"; //NOT IMPORTANT
import jwt from "jsonwebtoken";
import { MessageModel } from "./models/message.model";

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
  if(!user) return res.status(400).json({error: "user not found."})
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

async function createRoom(req, res){
  const roomName = req.body.room;
  const isRoomExists = await RoomModel.exists({ name: roomName });
  // if(isRoomExists){
  //   res.json({
  //     error: "The room name should be unique"
  //   });
  //   return;
  // }

  const newRoom = new RoomModel({
    name: roomName
  });
  try {
    await newRoom.save();
  }catch (err){
    res.json({
      error: err.message
    });
    return;
  }

  res.send(newRoom);
  return;
}

async function getRoom(req, res){
  const roomList = await RoomModel.find();
  res.json(roomList);
  return;
}

async function getRoomMessage(req, res){
  const roomName = req.params.room;
  const list = await MessageModel.find({ room: roomName });
  res.send(list);
  return;
}

// parse url encoded requests
app.use(urlencoded({ extended: true }));
// parse json requests
app.use(json());

app.get("/", (req, res) => {
  res.send("Hi");
})

//Room creation endpoint
app.post("/room", createRoom);

app.get("/room", getRoom);

//User creation endpoint
app.post("/user", createUser);

app.get("/user", getUser);

app.post("/login", login);

//get messages from room

app.get("/message/:room", getRoomMessage);

let userList = [];

io.on("connection", (socket) => {
  
  //join room Event. handles user joining rooms.
  socket.on("joinRoom", async ({ username, room }) => {
    console.log({ username, room });
    // const obj = {
    //   username: username,
    //   room: room
    // }
    const roomExists = await RoomModel.exists({ name: room });
    if (roomExists){
      // check if user is joined another room, block it.
      const newList = userList.filter((item) => item.username == username);
      if (newList.length == 0){
        userList.push({ username, room, socket });
    
        // let newList = userList.filter((name) => name != "farbod")
    
        socket.join(room);//room,
    
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
      }
      }
  });

  //Chat message event. handles sending new chat message from user.
  socket.on("chatMessage", async (message) => {
    const userItem = userList.find((item) => item.socket.id == socket.id);
    const room = userItem["room"]; // == userItem.room

    let newMessage = new MessageModel({
      content: message,
      room: room,
      timestamp: new Date()
    });
    await newMessage.save();
    io.to(userItem.room).emit(
      "message",
      formatMessage(message, userItem.username)
    );
  });
  
  socket.on("disconnect", function(){
    const userItem = userList.find((item) => item.socket.id == socket.id);
    if(userItem)
    userList = userList.filter((item) => item.socket.id != socket.id);
    // send event to other users.
  })
});

server.listen(port, () => {
  console.log("webserver is listening to port " + port);
});
