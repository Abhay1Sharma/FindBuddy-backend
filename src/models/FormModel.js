import { model } from "mongoose";
import { FormSchema } from "../Schemas/FormSchema.js";

const Form = model("form", FormSchema);

export { Form };