const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

const workshopSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề workshop không được trống'],
      trim: true,
      maxlength: [150, 'Tiêu đề tối đa 150 ký tự'],
    },
    description: {
      type: String,
      required: [true, 'Mô tả workshop không được trống'],
      maxlength: [2000, 'Mô tả tối đa 2000 ký tự'],
    },
    topic: {
      type: String,
      required: [true, 'Chủ đề workshop không được trống'],
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Thời gian tổ chức không được trống'],
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: [15, 'Thời lượng tối thiểu 15 phút'],
    },
    meetingLink: {
      type: String,
      required: [true, 'Link phòng họp không được trống'],
      trim: true,
    },
    platform: {
      type: String,
      enum: ['google_meet', 'zoom', 'other'],
      default: 'other',
    },
    maxAttendees: {
      type: Number,
      default: 0, // 0 = không giới hạn
    },
    creditCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    ratings: [ratingSchema],
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'ended'],
      default: 'upcoming',
    },
  },
  { timestamps: true }
);

// Auto-derive status based on scheduledAt
workshopSchema.virtual('computedStatus').get(function () {
  const now = new Date();
  const end = new Date(this.scheduledAt.getTime() + this.durationMinutes * 60000);
  if (now < this.scheduledAt) return 'upcoming';
  if (now <= end) return 'ongoing';
  return 'ended';
});

// Average rating virtual
workshopSchema.virtual('averageRating').get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const total = this.ratings.reduce((sum, r) => sum + r.score, 0);
  return Math.round((total / this.ratings.length) * 10) / 10;
});

workshopSchema.set('toJSON', { virtuals: true });
workshopSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Workshop', workshopSchema);
