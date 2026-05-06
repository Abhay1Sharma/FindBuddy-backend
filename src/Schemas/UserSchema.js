import mongoose from "mongoose";
const UserSchema = mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: false
        },

        username: {
            type: String,
            required: true,
            unique: true
        },

        googleId: {
            type: String
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        hasCompleteProfile: {
            type: Boolean,
            default: false,
        },

        formId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "form"
        },

        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile"
        },

        connectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "connection",
        },

    }, { timestamps: true }
);

export { UserSchema };