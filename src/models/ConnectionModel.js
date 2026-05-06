import { model } from "mongoose";
import { ConnectionSchema } from "../Schemas/ConnectionSchema.js";

const Connection = model("connection", ConnectionSchema);

export { Connection };