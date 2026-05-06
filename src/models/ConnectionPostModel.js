import mongoose, { model } from "mongoose";
import { ConnectionPostSchema } from "../Schemas/ConnectionPostSchema.js";

const ConnectionPost = model("connectionpost", ConnectionPostSchema);

export { ConnectionPost };