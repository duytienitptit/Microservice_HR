import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessmentReport extends Document {
  application_id: string;
  session_id: string;
  candidate_name?: string;
  job_title?: string;
  scores: {
    technical: number;
    communication: number;
    relevance: number;
    overall: number;
  };
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  generated_at: Date;
  reasoning?: {
    technical: string;
    communication: string;
    relevance: string;
  };
  citations?: Array<{
    quote: string;
    stage: string;
    dimension: string;
  }>;
  detailed_feedback?: string;
  scoring_method?: 'LLM' | 'RULE_BASED';
}

const AssessmentReportSchema: Schema = new Schema(
  {
    application_id: { type: String, required: true, unique: true, index: true },
    session_id: { type: String, required: true, unique: true, index: true },
    candidate_name: { type: String, default: '' },
    job_title: { type: String, default: '' },
    scores: {
      technical: { type: Number, required: true },
      communication: { type: Number, required: true },
      relevance: { type: Number, required: true },
      overall: { type: Number, required: true },
    },
    summary: { type: String, required: true },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendation: { type: String, required: true },
    generated_at: { type: Date, default: Date.now },
    reasoning: {
      technical: { type: String },
      communication: { type: String },
      relevance: { type: String },
    },
    citations: [
      {
        quote: { type: String },
        stage: { type: String },
        dimension: { type: String },
      },
    ],
    detailed_feedback: { type: String },
    scoring_method: { type: String, enum: ['LLM', 'RULE_BASED'], default: 'RULE_BASED' },
  },
  {
    versionKey: false,
  }
);

export default mongoose.model<IAssessmentReport>('AssessmentReport', AssessmentReportSchema, 'assessment_reports');
