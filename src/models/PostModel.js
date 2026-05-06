import { model } from "mongoose";
import { PostSchema } from "../Schemas/PostSchema.js";

const Post = model("post", PostSchema );

export { Post };