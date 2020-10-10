import mongoose from "mongoose";

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: String,
    username: {
        unique: true,
        type: String
    },
    password: String,
    role: {
        type: String,
        default: "user"
    },
    salt: String
});

export const UserModel = mongoose.model("UserModel", UserSchema);