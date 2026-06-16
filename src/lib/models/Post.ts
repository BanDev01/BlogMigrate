import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IComment {
  author: Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  author: Types.ObjectId;
  tags: string[];
  comments: IComment[];
  status: "published" | "draft";
  publishedAt?: Date;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: String }],
    comments: [CommentSchema],
    status: { type: String, enum: ["published", "draft"], default: "draft" },
    publishedAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
