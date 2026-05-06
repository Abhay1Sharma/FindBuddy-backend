import { Schema, mongoose } from "mongoose";

const ConnectionSchema = new Schema(
    {
        isConnected: {
            type: Boolean,
            default: false,
        },

        connectedFrom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
        },

        connectedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
        },

        isAnyRequest: {
            type: Boolean,
            default: false,
        },

        requestFrom: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
        }],

        // requestTo: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "user",
        // },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
        },

    }, { timestamps: true}
)

export { ConnectionSchema };