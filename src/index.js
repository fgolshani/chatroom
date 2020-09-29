// const express = require("express");
import express from "express";
import { sayHi } from "./utils";
const app = express();
const port = 3001;

app.get("/", (req, res) => {
  sayHi();
  res.send("test2");
});

app.listen(port, () => {
  console.log("webserver is listening to port " + port);
});
