import mongoose from "mongoose";
const ProfileSchema = mongoose.Schema(
    {
        profileImage: {
            type: String,
            default: "https://img.freepik.com/premium-vector/vector-flat-illustration-grayscale-avatar-user-profile-person-icon-gender-neutral-silhouette-profile-picture-suitable-social-media-profiles-icons-screensavers-as-templatex9xa_719432-2210.jpg?semt=ais_hybrid&w=740&q=80",
        },

        backgroundImage: {
            type: String,
            default: "https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg",
        },

        introContent: {
            type: String,
            default: "Ready to find a partner and hit the gym"
        },

        aboutContent: {
            type: String,
            default: "Hi, I'm a fitness enthusiast looking for a dedicated partner to stay consistent, share motivation, and crush our gym goals together."
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },

        followers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
        }],

        following : [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "profile",
        }]

    }, { timestamps: true }
);

export { ProfileSchema };