import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITag extends Document {
  name: string;
  slug: string;
}

const TagSchema = new Schema<ITag>({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
});

const Tag: Model<ITag> =
  mongoose.models.Tag || mongoose.model<ITag>("Tag", TagSchema);

export default Tag;
