import { Schema, model } from 'mongoose';
import { ICategory } from './category.interface';

const categorySchema = new Schema<ICategory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

categorySchema.index(
  { categoryName: 1, parentCategory: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

categorySchema.pre('save', async function () {
  if (!this.isModified('parentCategory') && this.level !== undefined) {
    return;
  }

  if (!this.parentCategory) {
    this.level = 0;
    return;
  }

  if (String(this.parentCategory) === String(this._id)) {
    throw new Error('Category cannot be its own parent');
  }

  const parent = (await this.model('Category')
    .findById(this.parentCategory)
    .select('level')
    .lean()) as { level?: number } | null;

  if (!parent) {
    throw new Error('Parent category not found');
  }

  this.level = (parent.level ?? 0) + 1;
});

export const Category = model<ICategory>('Category', categorySchema);
