import mongoose from "mongoose"

mongoose
  .connect("mongodb://127.0.0.1:27017/eventverse")
  .then(() => console.log("MongoDB connected."))
  .catch((err) => console.error("MongoDB error:", err))
