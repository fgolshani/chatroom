import mongoose from "mongoose";

const Schema = mongoose.Schema;

const roomSchema = new Schema({
    name: {
        type: String,
        unique: true
    }
})

export const RoomModel = mongoose.model("RoomSchema", roomSchema);