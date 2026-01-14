import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { PreferenceSettings } from 'src/common/schemas/preference.schemas';
import { User } from 'src/users/user.schema';

export type PreferenceDocument = Preference & Document;

@Schema({
  timestamps: true,
  collection: 'preferences',
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class Preference {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  user: User;

  @Prop({
    type: {
      // Thème 
      theme: {
        type: String,
        enum: [
          'BLUE_THEME',
          'AQUA_THEME',
          'PURPLE_THEME',
          'GREEN_THEME',
          'CYAN_THEME',
          'ORANGE_THEME',
          'DARK_BLUE_THEME',
          'DARK_AQUA_THEME',
          'DARK_PURPLE_THEME',
          'DARK_GREEN_THEME',
          'DARK_CYAN_THEME',
          'DARK_ORANGE_THEME',
        ],
        default: 'BLUE_THEME',
      },
      // Layout sidebar: false = Vertical, true = Horizontal
      sidebarLayout: {
        type: Boolean,
        default: false,
      },
      // Direction: false = LTR, true = RTL
      rtlLayout: {
        type: Boolean,
        default: false,
      },
      // Container option: true = Boxed, false = Full
      boxedLayout: {
        type: Boolean,
        default: false,
      },
      // Type sidebar: false = Full, true = Collapse
      miniSidebar: {
        type: Boolean,
        default: false,
      },
      // Card style: false = Shadow, true = Border
      borderCard: {
        type: Boolean,
        default: false,
      },
    },
    default: {
      theme: 'BLUE_THEME',
      sidebarLayout: false,
      rtlLayout: false,
      boxedLayout: false,
      miniSidebar: false,
      borderCard: false,
    },
    _id: false,
  })
  settings: PreferenceSettings;

  // Virtual field for ID
  @Prop({
    virtual: true,
    get() {
      return this._id ? this._id.toString() : this._id;
    },
  })
  id: string;
}

export const PreferenceSchema = SchemaFactory.createForClass(Preference);

// Index
PreferenceSchema.index({ user: 1 }, { unique: true });

// Middleware for validation
PreferenceSchema.pre('save', function (next) {
  const preference = this as PreferenceDocument;

  // Validation: miniSidebar can only be true if sidebarLayout is false
  if (preference.settings.miniSidebar && preference.settings.sidebarLayout) {
    next(
      new Error(
        'miniSidebar ne peut être activé que si sidebarLayout est false (mode Vertical)',
      ),
    );
    return;
  }

  next();
});
