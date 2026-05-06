import { model } from "mongoose";
import { savePost } from "../Schemas/SavePostSchema.js";

const SavePost = model("savepost", savePost);

export { SavePost };