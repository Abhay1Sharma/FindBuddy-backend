import 'dotenv/config';
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs, { rmSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import multer from 'multer';
import bodyParser from "body-parser";
import flash from "connect-flash";
import LocalStrategy from "passport-local";
import { GoogleGenAI } from "@google/genai";

// Import your models and routers
import Auth from "./routers/Auth.js";
import { storage } from './cloudinary.js';
import { Form } from './src/models/FormModel.js';
import { Post } from './src/models/PostModel.js';
import { User } from "./src/models/UserSchema.js";
import { Notification } from './src/models/NotificationModel.js';
import { Profile } from './src/models/ProfileModel.js';
import { v2 as cloudinary } from "cloudinary";
import { Comment } from './src/models/CommentModel.js';
import { SavePost } from "./src/models/SavaPostModel.js";
import { Repost } from "./src/models/RepostModel.js"
import { Connection } from './src/models/ConnectionModel.js';
import { populate } from 'dotenv';
import { ConnectionPost } from './src/models/ConnectionPostModel.js';
import { handleChat } from './chatbotController.js';

const userSocketMap = new Map(); // userId -> socketId

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log("📁 Created 'uploads' folder automatically.");
}

const PORT = 3001;
const app = express();
const httpServer = createServer(app); // Create the HTTP server
const ai = new GoogleGenAI({ apiKey: "AIzaSyC5gzSgdEZnmANn_ZkUlJydNicL9MKTWto"});

const frontendUrl = process.env.REACT_APP_FRONTEND_URL;
const backendUrl = process.env.REACT_APP_BACKEND_URL;
const dashboardUrl = process.env.REACT_APP_DASHBOARD_URL;

app.set("trust proxy", 1);
app.use(cors({
    origin: [frontendUrl, dashboardUrl],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// 1. Initialize Socket.io[]
const io = new Server(httpServer, {
    cors: {
        origin: [frontendUrl, dashboardUrl],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// 2. Database Connection
const mongoDbUrl = process.env.REACT_APP_MONGODB_URL;
async function main() {
    await mongoose.connect(mongoDbUrl);
}
main()
    .then(() => console.log("Connection build Successfully ✅"))
    .catch((err) => console.log("Database Connection Error ❌", err));

// 3. Middlewares
// app.use(cors({ origin: [`${frontendUrl}`, `${dashboardUrl}`], credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(flash());

const sessionOptions = {
    secret: "mysupersecret",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        secure: true,
        sameSite: "none",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
};

cloudinary.config({
    cloud_name: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.REACT_APP_CLOUDINARY_API_KEY,
    api_secret: process.env.REACT_APP_CLOUDINARY_API_SECRET,
});

app.use(session(sessionOptions));
app.use('/uploads', express.static('uploads'));

// 4. Passport Setup
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// 5. Routes
app.use("/", Auth);
app.post('/api/chatbot', handleChat);


// 6. Socket.io Logic
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join_private_chat", ({ roomId }) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room: ${roomId}`);
    });

    socket.on("register_user", (userId) => {
        socket.userId = userId;
        userSocketMap.set(userId, socket.id);
        console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on("send_message", async (data) => {
        // data: { roomId, senderId, text, messageType, sharedPostId }
        try {
            socket.to(data.roomId).emit("receive_message", data);

            console.log(`Message sent in room ${data.roomId} by ${data.senderId}`);
        } catch (err) {
            console.error("Socket error:", err);
        }
    });

    socket.on("disconnect", () => {
        for (let [userId, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
                break;
            }
        }
        if (socket.userId) {
            userSocketMap.delete(socket.userId);
        }
        console.log("User disconnected");
    });
});

const upload = multer({ storage: storage });

app.get("/allFormData", async (req, res) => {
    try {
        const allUser = await Form.find({}).populate('userId');
        res.status(200).json(allUser);
    } catch (error) {
        res.status(500).json({ message: "Error fetching data" });
    }
});

app.post("/deletePostComment", async (req, res) => {
    try {
        const { id } = req.body;
        const deleteComment = await Comment.findByIdAndDelete(id);
        const allComment = await Comment.find({}).populate('userId profileId');
        res.status(200).json({ message: "Comment Deleted Successfully !!!", allComment });
    } catch (error) {
        console.log(error);
        res.status(404).json({ error: error });
    }
});

app.post("/formdata", upload.single("profilePicture"), async (req, res) => {
    try {

        const profilePath = req.file ? req.file?.path : "https://i.pinimg.com/736x/f7/82/c8/f782c8360e890a8d488eeda004b26bde.jpg";

        const {
            name, gender, age, fitnessLevel, goal, gymname,
            typeOfBuddy, city, state, country, shifts, userId
        } = req.body;


        const newForm = await new Form({
            name, gender, age, fitnessLevel, goal,
            typeOfBuddy, city, state, country, shifts,
            userId, gymname,
            profilePicture: profilePath,
        }).save();

        const defaultUserProfile = await new Profile({
            userId: userId, introContent: 'Ready to find a partner and hit the gym', aboutContent:
                `Hi, I'm a fitness enthusiast looking for a dedicated partner to stay consistent, share motivation, and crush our gym goals together.`,
            profileImage: profilePath,
            backgroundImage: 'https://www.shutterstock.com/image-vector/default-ui-image-placeholder-wireframes-600nw-1037719192.jpg',
        }).save();

        const defaultConnection = await new Connection({ ownerId: userId }).save();
        await User.findByIdAndUpdate(userId, { hasCompleteProfile: true, formId: newForm._id, profileId: defaultUserProfile._id, connectionId: defaultConnection._id });
        res.status(200).json({ message: "Data received successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error during profile creation." });
    }
});

app.post("/removeRepostContent", async (req, res) => {
    try {
        const { postId, userId } = req.body;
        console.log(req.body);
        const repost = await Repost.findById({ repostFromUserId: userId, postId: postId });
        if (!repost) return res.status(404).json({ message: "RePost not found" });
        let updatedPost = await Post.findByIdAndUpdate(
            postId,
            { $pull: { repost: userId } },
            { new: true }
        );
        console.log

        await Repost.findByIdAndDelete({ repostFromUserId: userId, postId: postId });

        const message = "Post Reposted Successfully";
        console.log(findPost);
        res.status(200).json({ message: message });
    } catch (error) {
        console.log(error);
        res.status(404).json({ error: error });
    }
})

app.post("/loggedUser", async (req, res) => {
    const { decode } = req.body;
    // console.log(req.body);
    try {
        const Id = req.body.id;
        const logged = await User.findOne({ _id: Id });
        res.status(200).json(logged);
    } catch (error) {
        console.log(error);
    }
});

app.get("/allPost", async (req, res) => {
    try {
        const allPost = await Post.find().populate('profileId userId');
        res.status(200).json(allPost);
    } catch (error) {
        res.status(504).json({ message: "Some Error Occurred" });
    }
});

app.post("/editPost", upload.single("editMedia"), async (req, res) => {
    try {
        console.log(req.body);
        const { postId, postAbout } = req.body;
        console.log(postId);
        const post = await Post.findById({ _id: postId });
        if (!post) return res.status(400).json({ message: "Post not exist!!! " });
        console.log("Post Exist.....", post);
        const data = { about: postAbout, isEdited: true };
        if (req.file) {
            data.media = req.file.path;
        }
        const updatedData = await Post.findByIdAndUpdate(postId, data);
        console.log(updatedData);
        res.status(200).json({ message: "Post Updated Successfully ", updatedData });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
})

app.post("/user", async (req, res) => {
    try {
        console.log(req.body);
        const Id = req.body.id;
        const logged = await User.findById(Id).populate('formId profileId');
        res.status(200).json(logged);
    } catch (error) {
        console.log(error);
    }
});

app.post("/profile", async (req, res) => {
    try {
        const { Id } = req.body;
        const profile = await Profile.findOne(Id);
        res.status(200).json(profile);
    } catch (err) {
        console.log(err);
    }
});

app.post("/getUserForm", async (req, res) => {
    const { Id } = req.body;
    const getForm = await Form.findById({ _id: Id });
    res.status(200).json({ data: getForm });
});

app.post("/userPostComments", async (req, res) => {
    try {
        const { postId } = req.body;
        const allComments = await Comment.find({ postId: req.body.postId }).populate("userId postId profileId");
        res.status(200).json({ message: "All Comment Post", allComments });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error });
    }
})

app.post("/comment", async (req, res) => {
    try {
        const { comment, postId, profileId, userId } = req.body;
        const post = await Post.findById({ _id: postId }).populate("userId");
        if (!post) { return };
        const saveComment = await new Comment({ comment: comment, userId: userId, postId: postId, profileId: profileId }).save();
        const allPostComment = await Comment.find({ postId }).populate("userId profileId").sort({ createdAt: -1 });
        const user = await User.findById({ _id: userId });

        const postOwnerId = post.userId._id.toString();
        const postOwnerName = post.userId.username;

        let recipientSocketId = null;
        if (postOwnerId !== userId) {
            const newNotif = await new Notification({
                recipient: postOwnerId,
                sender: userId.toString(),
                type: "COMMENT",
                content: "comment on your post",

            }).save();

            recipientSocketId = userSocketMap.get(postOwnerId);

            if (recipientSocketId) {
                io.to(recipientSocketId).emit("new_notification", {
                    type: 'COMMENT',
                    content: `${user.username} commented on your post`,
                    _id: newNotif._id
                });
            }
        }
        console.log("Who Commented : ", userId);
        console.log("Whose post : ", post.userId._id);
        console.log("Found Socket Id : ", recipientSocketId);
        console.log("Sockets Ids Available : ", Array.from(userSocketMap.keys()));
        res.status(200).json({ message: "comment added", allPostComment });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error })
    }
})

app.post("/editComment", async (req, res) => {
    console.log(req.body);
    try {
        const data = {
            comment: req.body.editComment,
            edit: true
        }
        const updatedComment = await Comment.findByIdAndUpdate(req.body.commentId, data);
        res.status(200).json({ message: "Comment Updated!!!", updatedComment });
    } catch (error) {
        res.status(400).json({ error: error });
    }
});

app.post("/like", async (req, res) => {
    try {
        const { postId, userId } = req.body;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });
        const isLike = post.likes.includes(userId);
        const update = isLike ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } };

        // 1. Update and populate the owner of the post
        const updatedPost = await Post.findByIdAndUpdate(postId, update, { new: true }).populate('userId profileId');

        const postOwnerId = updatedPost.userId._id.toString();
        const postOwnerName = updatedPost.userId.username;

        const user = await User.findById({ _id: userId });
        let recipientSocketId = null; // Define it here so it's accessible for logging

        // 2. Notification Logic]
        if (!isLike && postOwnerId !== userId) {
            // Save to DB
            const newNotif = await new Notification({
                recipient: postOwnerId,
                sender: userId,
                type: 'LIKE',
                postReference: postId,
                content: "liked your post"
            }).save();

            // Find socket using string ID
            recipientSocketId = userSocketMap.get(postOwnerId);

            if (recipientSocketId) {
                io.to(recipientSocketId).emit("new_notification", {
                    type: 'LIKE',
                    content: `${user.username} liked your post`,
                    _id: newNotif._id
                });
            }
        }

        // 3. Debug Logs (Now they will work)
        console.log("--- Debug Like Route ---");
        console.log("Recipient ID (Post Owner):", postOwnerId);
        console.log("Person who Liked:", userId);
        console.log("Available Sockets:", Array.from(userSocketMap.keys()));
        console.log("Found Socket ID:", recipientSocketId || "None (User Offline)");

        res.status(200).json({ message: isLike ? "User liked your post" : "User unlike your post", updatedPost });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

app.post("/repost", async (req, res) => {
    try {
        console.log("Start Go...");
        const { profileId, userId, postId, repostBy, repostuserId, repostUserProfileId } = req.body;
        const repost = {
            postOwnerId: userId,
            postOwnerProfileId: profileId,
            postId: postId,
            repostFromUserId: repostBy,
            repostFromProfileId: repostUserProfileId,
        }

        let post = await Post.findById({ _id: postId });
        if (!post) return res.status(404).json({ message: "This Post does not exist" });
        console.log("Goal 1");

        const isAlreadySaved = post.repost.includes(repostBy);
        let message = "";
        let updatedPost;
        let newSave;


        if (isAlreadySaved) {
            updatedPost = await Post.findByIdAndUpdate(
                postId,
                { $pull: { repost: repostBy } },
                { new: true }
            );

            await Repost.findOneAndDelete({ postId: postId, repostFromUserId: repostBy });

            message = "Repost Remove Successfully";
            console.log("Goal 2");
            console.log(post.repost);
            newSave = await Post.findById({ _id: postId });
        } else {
            updatedPost = await Post.findByIdAndUpdate(
                postId,
                { $addToSet: { repost: repostBy } },
                { new: true }
            );

            console.log("Goal 3");

            newSave = new Repost(repost);
            await newSave.save();
            message = "Repost Successfully";
        }

        post = await Post.findById({ _id: postId });
        console.log(post);

        res.status(200).json({ message: message, newSave });
    } catch (error) {
        console.log(error);
    }
});

app.get("/getPost/:Id", async (req, res) => {
    try {
        console.log(req.params.Id);
        const Id = req.params.Id;
        let post = await Post.find({ _id: Id }).populate('profileId userId');
        console.log(post);
        if (post.length === 0) {
            post = await Repost.find({ _id: Id }).populate('postOwnerId postId postOwnerProfileId repostFromUserId repostFromProfileId');
        }
        res.status(200).json({ message: "Post Fetch Successfully!!!", post });
    } catch (error) {
        console.log(error);
        res.status(404).json({ message: "No Content Find" });
    }
})

app.get("/allRePost", async (req, res) => {
    try {
        const allRePost = await Repost.find({}).populate('postOwnerId postId postOwnerProfileId repostFromUserId repostFromProfileId');
        res.status(200).json({ message: "All Repost fetched Successfully !!!", allRePost });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error });
    }
});

app.get("/notifications/:userId", async (req, res) => {
    try {
        const list = await Notification.find({ recipient: req.params.userId })
            .populate([
                {
                    path: 'recipient',
                    populate: { path: 'profileId' } // Deep populate the recipient's profile
                },
                {
                    path: 'sender',
                    populate: { path: 'profileId' } // Deep populate the recipient's profile
                },
                'postReference',
            ]) // Get sender details
            .sort({ createdAt: -1 });

        res.status(200).json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// app.post("/postContent", upload.single("media"), async (req, res) => {
//     try {
//         console.log("File received:", req.file);
//         console.log("Body received:", req.body);

//         const data = {
//             userId: req.body.userId,
//             profileId: req.body.profileId,
//             about: req.body.about?.trim()
//         };

//         if (req.file) {
//             data.media = req.file ? req.file.path : null;
//         }

//         console.log(data);

//         const savePost = await new Post(data).save();
//         res.status(200).json({ message: "Post Created", savePost });
//     } catch (error) {
//         console.error("Error:", error);
//         res.status(500).json({ error: error.message });
//     }
// });

// app.post("/postContent", upload.single("media"), async (req, res) => {
//     try {
//         // 1. Check if a file was actually uploaded
//         if (!req.file) {
//             return res.status(400).json({ error: "No media file provided" });
//         }

//         const data = {
//             userId: req.body.userId,
//             profileId: req.body.profileId,
//             about: req.body.about?.trim(),
//             // req.file.path contains the Cloudinary URL
//             media: req.file.path
//         };

//         // 2. Log for debugging
//         console.log("Saving post with media:", data.media);

//         const savePost = await new Post(data).save();

//         res.status(200).json({
//             message: "Post Created Successfully! ✅",
//             savePost
//         });

//     } catch (error) {
//         // If Cloudinary rejects the video (e.g., too large), it hits this block
//         console.error("Upload Error:", error);
//         res.status(500).json({
//             error: "Upload failed. Ensure the video is under 100MB and a valid format."
//         });
//     }
// });

app.post("/postContent", async (req, res) => {
    try {
        const { userId, profileId, about, media } = req.body;

        if (!media && !about) {
            return res.status(400).json({ error: "Empty post not allowed" });
        }

        const savePost = await new Post({
            userId,
            profileId,
            about: about?.trim(),
            media
        }).save();

        res.status(200).json({
            message: "Post Created Successfully ✅",
            savePost
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/cloudinary-signature", (req, res) => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
        { timestamp },
        process.env.REACT_APP_CLOUDINARY_API_SECRET
    );

    res.json({
        timestamp,
        signature,
        cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.REACT_APP_CLOUDINARY_API_KEY
    });
});

app.post("/messageIds", async (req, res) => {
    try {
        const { senderId, ownerId } = req.body;
        let recipientSocketId = null;

        const owner = await User.findById({ _id: ownerId });
        const sender = await User.findById({ _id: senderId });

        if (senderId !== ownerId) {
            // Save to DB
            const newNotif = await new Notification({
                recipient: senderId.toString(),
                sender: ownerId.toString(),
                type: 'CHAT',
                content: "wants to talk you"
            }).save();

            // Find socket using string ID
            recipientSocketId = userSocketMap.get(senderId.toString());

            if (recipientSocketId) {
                io.to(recipientSocketId).emit("new_notification", {
                    type: 'CHAT',
                    content: `${owner.username} wants talk to you`,
                    _id: newNotif._id
                });
            }
        }
    } catch (error) {
        console.log(error);
    }
})

app.post("/chat/upload", upload.single("chatMedia"), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });
        // Returns the Cloudinary URL from req.file.path
        res.status(200).json({ url: req.file.path });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/followers", async (req, res) => {
    try {
        // console.log(req.body);
        const { profileId, userId } = req.body;
        const profile = await Profile.findById({ _id: profileId }).populate('userId');
        const user = await User.findById({ _id: userId });

        if (!profile) {
            return res.status(404).json({ message: "Profile Not Found " });
        }

        const userProfileId = user.profileId._id;

        const isUserFollow = profile.followers.includes(userProfileId);
        const updateData = isUserFollow ? { $pull: { followers: userProfileId } } : { $addToSet: { followers: userProfileId } };

        const data = await Profile.findByIdAndUpdate(profileId, updateData, { new: true });

        const updateFollowingData = isUserFollow ? { $pull: { following: profileId } } : { $addToSet: { following: profileId } };
        const updateUser = await Profile.findByIdAndUpdate(userProfileId, updateFollowingData);
        const sender = user._id.toString();
        const receiver = profile.userId._id.toString();
        let recipientSocketId = null;

        if (!isUserFollow && sender !== receiver) {
            const newNotif = await new Notification({
                recipient: profile.userId._id.toString(),
                sender: user._id.toString(),
                recipientProfile: profile._id.toString(),
                senderProfile: user.profileId._id.toString(),
                type: 'FOLLOW',
                content: "follow your profile"
            }).save();

            recipientSocketId = userSocketMap.get(profile.userId._id.toString());
            console.log(recipientSocketId);

            if (recipientSocketId) {
                io.to(recipientSocketId).emit("new_notification", {
                    type: 'FOLLOW',
                    content: `${user.username} follow your profile`,
                    _id: newNotif._id
                });
            }
        }

        console.log("Reciever ", profile.userId._id.toString());
        console.log("Sender ", user._id.toString());
        console.log("Available Sockets:", Array.from(userSocketMap.keys()));

        res.status(200).json({ message: isUserFollow ? "User Unfollow the User" : "User follow the user", data });
    } catch (error) {
        // console.log(error);
        res.status(400).json({ error: error.message });
    }
});

app.post("/allUserFollowers", async (req, res) => {
    try {
        const { userProfileId } = req.body;
        if (!userProfileId) return res.status(400).json({ error: "userProfileId is required" });

        const userFollowers = await Profile.findById(userProfileId).populate({
            path: 'followers',
            populate: {
                path: 'userId',
            }
        });

        if (!userFollowers) {
            return res.status(404).json({ error: "Profile not found" });
        }

        res.status(200).json({
            message: "Followers retrieved successfully",
            count: userFollowers.followers.length,
            data: userFollowers.followers
        });

    } catch (error) {
        console.error("Follower Fetch Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/allUserFollowings", async (req, res) => {
    try {
        const { userProfileId } = req.body;
        if (!userProfileId) return res.status(400).json({ error: "userProfileId is required" });

        const userFollowings = await Profile.findById(userProfileId).populate({
            path: 'following',
            populate: {
                path: 'userId',
                // select: 'username email'
            }
        });

        if (!userFollowings) {
            return res.status(404).json({ error: "Profile not found" });
        }

        res.status(200).json({
            message: "Followings retrieved successfully",
            count: userFollowings.following.length,
            data: userFollowings.following
        });

    } catch (error) {
        console.error("Follower Fetch Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/userPosts", async (req, res) => {
    try {
        const userposts = await Post.find({ userId: req.body.id }).populate('profileId userId');
        res.status(200).json({ userposts });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
})

app.post("/savePost", async (req, res) => {
    try {
        const { UserId, PostId, PostUserId, ProfileId } = req.body;

        const post = await Post.findById(PostId);
        if (!post) return res.status(404).json({ message: "This Post does not exist" });

        const isAlreadySaved = post.isPostSave.includes(UserId);
        let message = "";
        let updatedPost;

        if (isAlreadySaved) {
            updatedPost = await Post.findByIdAndUpdate(
                PostId,
                { $pull: { isPostSave: UserId } },
                { new: true }
            );

            await SavePost.findOneAndDelete({ userId: UserId, postId: PostId });

            message = "Post Unsaved Successfully";
        } else {
            updatedPost = await Post.findByIdAndUpdate(
                PostId,
                { $addToSet: { isPostSave: UserId } },
                { new: true }
            );

            const newSave = new SavePost({
                userId: UserId,
                postId: PostId,
                postUserId: PostUserId,
                profileId: ProfileId,
            });
            await newSave.save();
            message = "Post Saved Successfully";
        }

        res.status(200).json({ message, savePost: updatedPost });
    } catch (error) {
        console.error("Error in savePost:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/allSavedPosts", async (req, res) => {
    try {
        const { user } = req.body;
        const allUserSavedPosts = await SavePost.find({ userId: user }).populate("userId profileId postId");
        res.status(200).json({ message: "All User Save Posts ", allUserSavedPosts });
    } catch (error) {
        res.status(404).json({ error: error });
    }
});

app.post("/UnSavePost", async (req, res) => {
    try {
        const { UserId, SavePostId, postId } = req.body;
        const UnSavePost = await SavePost.findByIdAndDelete(SavePostId);
        await Post.findByIdAndUpdate(postId, { $pull: { isPostSave: UserId } });
        res.status(200).json({ message: "Post Removed!!", UnSavePost });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

app.post("/checkRequest", async (req, res) => {
    try {
        const { ownerId } = req.body;
        const userConnection = await Connection.find({ ownerId });
        res.status(200).json({ message: "User Connection!!!!", userConnection });
    } catch (error) {
        res.status(400).json({ error: error });
    }
});

app.post("/connectionsProfile", async (req, res) => {
    try {
        const { connectionId } = req.body;
        const userConnection = await Connection.findById({ _id: connectionId }).populate('connectedTo');
        res.status(200).json({ message: "User Connection!!!!", userConnection });
    } catch (error) {
        res.status(400).json({ error: error });
    }
});


app.post("/checkConnections", async (req, res) => {
    try {
        const { connectionId } = req.body;
        const userConnection = await Connection.findById({ _id: connectionId }).populate(
            {
                path: 'requestFrom',
                populate: {
                    path: 'profileId',
                },
            }
        );
        res.status(200).json({ message: "User Connection!!!!", userConnection });
    } catch (error) {
        res.status(400).json({ error: error });
    }
})


app.post("/isAnyReq", async (req, res) => {
    try {
        const { userId } = req.body;
        const connections = await Connection.find({ userId });
        res.status(200).json({ message: "Your Connections ", connections });
    } catch (error) {
        res.status(300).json({ error: error });
    }
})

app.post("/makeConnection", async (req, res) => {
    try {
        const { ownerId, loggedUserId } = req.body;
        const profileOwner = await User.findById({ _id: ownerId });
        const loggedUser = await User.findById({ _id: loggedUserId });
        if (profileOwner === null || loggedUser === null) return res.status(404).json({ message: "Sorry profiles not found" });
        const userId = profileOwner.connectionId;

        const makeConnections = await Connection.findById({ _id: userId });
        if (makeConnections.isConnected) return res.status(208).json({ message: "Already has a connections" });

        const isUserExist = makeConnections.requestFrom.includes(loggedUserId);
        const updateUser = isUserExist ? { $set: { isAnyRequest: false }, $pull: { requestFrom: loggedUserId } } : { $set: { isAnyRequest: true }, $addToSet: { requestFrom: loggedUserId } };


        let recipientSocketId = null;

        if (!isUserExist) {
            const newNotif = await new Notification({
                recipient: profileOwner?._id.toString(),
                sender: loggedUser?._id.toString(),
                recipientProfile: profileOwner?.profileId.toString(),
                senderProfile: loggedUser?.profileId.toString(),
                type: 'CONNECT',
                content: "wants to make you as gym buddy"
            }).save();


            recipientSocketId = userSocketMap.get(profileOwner?._id.toString());
            console.log(recipientSocketId);

            if (recipientSocketId) {
                io.to(recipientSocketId).emit("new_notification", {
                    type: 'CONNECT',
                    content: `${loggedUser?.username} wants to make you as gym buddy`,
                    _id: newNotif._id
                });
            }
        }

        const makeRequest = await Connection.findByIdAndUpdate(
            userId,
            {
                ...updateUser,
            },
            { new: true }
        );

        res.status(200).json({ message: "You made a connection", makeRequest });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error });
    }
})

app.post("/acceptConnection", async (req, res) => {
    try {
        const { userId, userConnectionId, loggedUserId, loggedUserConnectionId } = req.body;

        const user = await User.findById({ _id: userId });
        const loggedUser = await User.findById({ _id: loggedUserId });

        if (!user || !loggedUser) {
            return res.status(404).json({ message: " User Not Found " });
        }

        const userConnection = await Connection.findById({ _id: userConnectionId });
        const loggedUserConnection = await Connection.findById({ _id: loggedUserConnectionId });

        if (!userConnection || !loggedUserConnection) {
            return res.status.json({ message: "Connection Status Not Found" });
        }

        let recipientSocketId = null;

        const updatedUserConnection = await Connection.findByIdAndUpdate(loggedUserConnectionId, { isAnyRequest: false, isConnected: true, connectedTo: user.profileId });
        const updatedLoggedUserConnection = await Connection.findByIdAndUpdate(userConnectionId, { isAnyRequest: false, isConnected: true, connectedTo: loggedUser.profileId });

        const newNotif = await new Notification({
            recipient: user?._id.toString(),
            sender: loggedUser?._id.toString(),
            recipientProfile: user?.profileId.toString(),
            senderProfile: loggedUser?.profileId.toString(),
            type: 'CONNECT',
            content: "accept to make you as gym buddy"
        }).save();


        recipientSocketId = userSocketMap.get(user?._id.toString());
        console.log(recipientSocketId);

        if (recipientSocketId) {
            io.to(recipientSocketId).emit("new_notification", {
                type: 'CONNECT',
                content: `${loggedUser?.username} accept to make you as gym buddy`,
                _id: newNotif._id,
            });
        }

        const data = {
            about: `⚡ Energy alert! ${user.username} and ${loggedUser.username} just became workout buddies, and this duo is about to set the gym on fire! 🔥 No more dragging through sets alone or finding excuses to skip — these two are locking in, leveling up, and pushing each other harder than ever before. Think stronger lifts, faster runs, bigger energy, and zero days off. This isn't just a buddy match; it's a full-on power move. Watch them crush goals, break limits, and bring the heat every single workout. Who else feels the hype? Drop a 💪 to cheer them on! 🚀`,
            media: "https://cdnl.iconscout.com/lottie/premium/preview-watermark/celebration-ribbon-animation-gif-download-5829504.mp4",
            user1: user._id,
            user2: loggedUser._id,
            isConnectionPost: true,
        }

        const successConnectionsPost = await new ConnectionPost(data).save();
        res.status(200).json({ message: "Connection estabilshed successfully!" });
    } catch (error) {
        console.log(error);
        res.status(404).json({ error: error });
    }
});

app.post("/fetchUserConnections", async (req, res) => {
    try {
        const { connectionId } = req.body;
        const fetchConnection = await Connection.find({ _id: connectionId });
        res.status(200).json({ message: "User Connection fetched!!!", fetchConnection });
    } catch (error) {
        console.log(error);
        res.status(404).json({ error: error });
    }
})

app.post("/rejectRequest", async (req, res) => {
    try {
        const { connectionId } = req.body;
        const userConnectionStatus = await Connection.findById({ _id: connectionId });
        const rejectRequest = await Connection.findByIdAndUpdate(connectionId, { isAnyRequest: false });
    } catch (error) {
        console.log(error);
    }
})

app.get("/allConnectionsPosts", async (req, res) => {
    try {
        const allconnectionposts = await ConnectionPost.find({}).populate(
            [{
                path: 'user1',
                populate: {
                    path: 'profileId'
                }
            },

            {
                path: 'user2',
                populate: {
                    path: 'profileId'
                }
            }]
        );
        res.status(200).json({ message: "All Connections Post", allconnectionposts });
    } catch (error) {
        console.log(error);
        res.status(404).json({ error: error });
    }
})

app.post("/leaveConnection", async (req, res) => {
    try {
        const user1ConnectionId = req.body.userInfos.connectionId;
        const user = await Connection.findById({ _id: user1ConnectionId }).populate({
            path: 'connectedTo',
            populate: {
                path: 'userId',
            }
        });
        const user2ConnectionId = user.connectedTo.userId.connectionId;
        const deletedConnection1 = await Connection.findByIdAndUpdate(user1ConnectionId, { isConnected: false, connectedTo: null });
        const deletedConnection2 = await Connection.findByIdAndUpdate(user2ConnectionId, { isConnected: false, connectedTo: null });
        res.status(200).json({ message: "Connection deleted successfully !!!" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error });
    }
})

app.post("/UnSavePostfromHome", async (req, res) => {
    try {
        const { UserId, postId } = req.body;
        const savePost = await SavePost.find({ postId });
        const UnSavePost = await SavePost.findByIdAndDelete(id);
        await Post.findByIdAndUpdate(postId, { isPostSave: false });
        res.status(200).json({ message: "Post Removed!!", UnSavePost });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

app.post("/updateForm", upload.single("profilePicture"), async (req, res) => {

    try {

        const { userId } = req.body;

        const profilePictureUrl = req.file ? req.file.path : "https://i.pinimg.com/736x/f7/82/c8/f782c8360e890a8d488eeda004b26bde.jpg";
        const data = req.body;
        data.profilePicture = profilePictureUrl;

        const user = await User.findById({ _id: userId });
        const _id = user.formId;
        const form = await Form.findByIdAndUpdate(_id, data);
        res.status(200).json({ message: "Routine Updated Successfully!!!" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }
});

app.delete("/deletePost/:id", async (req, res) => {
    try {
        const post = await Repost.deleteMany({ postId: req.params.id });
        const deletedPost = await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Post Deleted ", deletedPost });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const uploadFields = upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 }
]);

app.post("/updateIntro", uploadFields, async (req, res) => {
    try {
        const { userId, intro, about } = req.body;
        const updateData = {};

        if (intro && intro !== 'undefined') updateData.introContent = intro;
        if (about && about !== 'undefined') updateData.aboutContent = about;

        // 3. Handle File Uploads
        if (req.files) {
            if (req.files['profileImage']) {
                updateData.profileImage = `${req.files['profileImage'][0].path}`;
            }
            if (req.files['backgroundImage']) {
                updateData.backgroundImage = `${req.files['backgroundImage'][0].path}`;
            }
        }

        // 4. Database Operations
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const profileId = user.profileId;

        const updatedProfile = await Profile.findByIdAndUpdate(
            profileId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "Profile updated successfully",
            profile: updatedProfile
        });

    } catch (err) {
        console.error("Route Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/api/chatbot", async (req, res) => {
    // 1. Destructure the request body coming from Hero.js
    const { message, history } = req.body;
    console.log(req.body);

    // Safety fallback: Validate that a message actually arrived
    if (!message) {
        return res.status(400).json({ error: "Message content is required" });
    }

    try {
        // 2. Map your React chat logs format to the structured format the SDK expects
        const contents = [
            ...history.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            })),
            { role: 'user', parts: [{ text: message }] }
        ];

        // 3. Send the structured context array to the model
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: `
                    You are "BuddyAI", the official virtual fitness assistant for FindBuddy.
                    FindBuddy connects workout partners based on gym routines and geographic proximity.
                    Your tone is encouraging, minimalistic, and clear.
                `
            }
        });

        // 4. Return the text string answer directly back to Axios
        res.status(200).json({ reply: response.text });

    } catch (error) {
        console.error("Gemini API Error details:", error);
        res.status(500).json({ error: "Internal Server Processing Error" });
    }
});

// 8. START THE SERVER (Use httpServer, only once)
httpServer.listen(PORT, () => {
    console.log(`FindBuddy Server running on port: ${PORT}`);
});