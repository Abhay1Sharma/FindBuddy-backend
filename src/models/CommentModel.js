import { model } from "mongoose";
import { CommentSchema } from "../Schemas/CommentSchema.js";

const Comment = model("comment", CommentSchema);

export { Comment };