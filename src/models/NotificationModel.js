import { model } from "mongoose";
import mongoose from "mongoose";
import { notificationSchema } from "../Schemas/NotificationSchema.js";

const Notification = mongoose.model("notification", notificationSchema);

export { Notification };