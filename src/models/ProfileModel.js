import { model } from "mongoose";
import { ProfileSchema } from "../Schemas/ProfileSchema.js";

const Profile = model("profile", ProfileSchema );

export { Profile };