import mongoose from "mongoose"

const chatSchema = new mongoose.Schema({
  chat_type: {
    type: String,
    enum: ["personal", "committee", "group"],
    required: true,
  },
  participants: [
    {
      user_id: { type: Number, required: true }, // MySQL user_id
      name: { type: String, required: true },
      joined_at: { type: Date, default: Date.now },
    },
  ],
  committee_id: { type: Number, required: false }, // For committee chats
  group_name: { type: String, required: false }, // For group chats
  group_admin: { type: Number, required: false }, // MySQL user_id of group admin
  messages: [
    {
      sender_id: { type: Number, required: true }, // MySQL user_id
      sender_name: { type: String, required: true },
      content: { type: String, required: true },
      message_type: {
        type: String,
        enum: ["text", "image", "video"],
        default: "text",
      },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  last_message: {
    content: String,
    sender_name: String,
    timestamp: { type: Date, default: Date.now },
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
})

chatSchema.index({ "participants.user_id": 1 })
chatSchema.index({ chat_type: 1 })
chatSchema.index({ updated_at: -1 })

export default mongoose.model("Chat", chatSchema)
