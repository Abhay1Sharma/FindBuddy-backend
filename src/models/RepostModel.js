import { model } from "mongoose";
import { RepostSchema } from "../Schemas/RepostSchema.js";

const Repost = model("repost", RepostSchema);

export { Repost };