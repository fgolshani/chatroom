import mongoose from "mongoose";

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    content: String,
    username: String,
    timestamp: Date,
    room: String
});

export const MessageModel = mongoose.model("MessageModel", MessageSchema);