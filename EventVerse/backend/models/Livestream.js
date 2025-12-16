import mongoose from "mongoose"

const livestreamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  streamer_id: {
    type: String,
    required: true,
  },
  stream_url: String,
  thumbnail_url: String,
  isLive: {
    type: Boolean,
    default: false,
  },
  viewers: [
    {
      user_id: String,
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  viewerCount: {
    type: Number,
    default: 0,
  },
  startedAt: Date,
  endedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model("Livestream", livestreamSchema)
