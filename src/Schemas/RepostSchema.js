import mongoose from "mongoose";

const RepostSchema = mongoose.Schema(
    {
        postOwnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            require: true,
        },

        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "post",
            require: true,
        },

        postOwnerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
            require: true,
        },

        repostFromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            require: true,
        },

        repostFromProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
            require: true,
        },

        isRepost: {
            type: Boolean,
            default: true,
        },

    }, { timestamps: true }
);

export { RepostSchema };