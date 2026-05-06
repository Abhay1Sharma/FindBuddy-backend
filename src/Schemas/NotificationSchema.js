import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },

        type: {
            type: String,
            enum: ['LIKE', 'COMMENT', 'FOLLOW', 'CHAT', 'CONNECT'],
            required: true
        },

        postReference: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'post'
        }, // Optional: link to the post

        content: {
            type: String
        },

        isRead: {
            type: Boolean,
            default: false
        },

        createdAt: {
            type: Date,
            default: Date.now
        },

    }
);

export { notificationSchema };