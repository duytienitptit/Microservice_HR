import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailLog extends Document {
  type: 'INVITE' | 'REPORT' | 'REJECTION';
  recipient: string;
  subject: string;
  status: 'SENT' | 'FAILED';
  sent_at: Date;
  error?: string;
}

const EmailLogSchema: Schema = new Schema(
  {
    type: { type: String, enum: ['INVITE', 'REPORT', 'REJECTION'], required: true },
    recipient: { type: String, required: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ['SENT', 'FAILED'], required: true },
    sent_at: { type: Date, default: Date.now },
    error: { type: String },
  },
  {
    versionKey: false,
  }
);

export default mongoose.model<IEmailLog>('EmailLog', EmailLogSchema, 'email_logs');
