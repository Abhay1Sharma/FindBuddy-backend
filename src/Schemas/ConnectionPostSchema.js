import mongoose, { Schema } from "mongoose";

const ConnectionPostSchema = new Schema(
    {
        about: {
            type: String,
            require: true,
        },

        media: {
            type: String,
            require: true,
        },

        user1: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
        },

        user2: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
        },

        isConnectionPost: {
            type: Boolean,
            defautl: false,
        }

    }, { timestamps: true }
);

export { ConnectionPostSchema };