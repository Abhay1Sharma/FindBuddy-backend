import mongoose from "mongoose";

const PostSchema = mongoose.Schema(
    {
        about: {
            type: String,
            required: true,
        },

        media: {
            type: String,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },

        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
            required: true
        },

        isPostSave: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
        }],

        repost: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }],

        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }],

        formId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "form",
        },

        isEdited: {
            type: Boolean,
            default: false,
        }

    }, { timestamps: true }
);

export { PostSchema };