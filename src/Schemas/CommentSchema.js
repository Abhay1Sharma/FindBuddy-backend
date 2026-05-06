import mongoose, { Schema } from "mongoose";

const CommentSchema = new Schema (
    {
        comment: {
            type: String,
            require: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            require: true,
        },

        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
            require: true,
        },

        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "post",
            require: true,
        },

        edit: {
            type: Boolean,
            defalut: false,
            require: true,
        }

    }, { timestamps: true }
);

export { CommentSchema };