import mongoose from "mongoose"

const groupChatProfileImageSchema = new mongoose.Schema({
  chat_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Chat" },
  image_url: { type: String, required: true },
  uploaded_by: { type: Number, required: true }, // MySQL user_id
  uploaded_at: { type: Date, default: Date.now },
  cloudinary_public_id: { type: String, required: true },
})

groupChatProfileImageSchema.index({ chat_id: 1 })

export default mongoose.model("GroupChatProfileImage", groupChatProfileImageSchema)
