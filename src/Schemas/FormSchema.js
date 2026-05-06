import mongoose from "mongoose";

const FormSchema = mongoose.Schema(
    {
        name: {
            type: String,
            require: true
        },

        gender: {
            type: String,
            require: true,
        },

        age: {
            type: Number,
            require: true,
        },

        fitnessLevel: {
            type: String,
            require: true,
        },

        goal: {
            type: String,
            require: true,
        },

        typeOfBuddy: {
            type: String,
            require: true,
        },

        country: {
            type: String,
            required: true,
        },

        state: {
            type: String,
            required: true,
        },

        city: {
            type: String,
            required: true,
        },

        shifts: {
            type: String,
            requied: true,
        },

        gymname: {
            type: String,
            required: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },

        profilePicture: {
            type: String,
            require: true,
        },

    }, { timestamps: true }
);

export { FormSchema };