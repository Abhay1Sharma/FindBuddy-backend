import mongoose, { Schema } from "mongoose";

const savePost = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },

        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "post",
            required: true
        },

        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
            required: true
        },

    }, { timestamps: true }
);

export { savePost };