import passportLocalMongoose from "passport-local-mongoose";
import { UserSchema } from "../Schemas/UserSchema.js"; // Added .js and changed to import
import mongoose, { model } from "mongoose";

UserSchema.plugin(passportLocalMongoose.default || passportLocalMongoose);

const User = model("user", UserSchema);

export { User };