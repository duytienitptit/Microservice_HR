# Assessment & Notification Service

## Tech Stack

| | |
|---|---|
| **Runtime** | Node.js 20+ / TypeScript (strict mode) |
| **Framework** | Express.js |
| **ORM** | Mongoose |
| **Database** | MongoDB (`assessment_db`) |
| **Test** | Jest + Supertest |
| **Logging** | Winston |
| **Port** | 3004 |

## Responsibilities

- **Consumes:** `INTERVIEW_COMPLETED_EVENT` with full chat history
- Score candidate across multiple dimensions
- Generate structured assessment report → store in MongoDB
- Update application status to `COMPLETED` via HTTP call to Core Service
- Send email notification to HR with report link
- **Publishes + Consumes:** `SEND_EMAIL_EVENT` (self-consuming for async email delivery)

## Scoring Dimensions

| Dimension | Description |
|---|---|
| `technical_score` | Accuracy and depth of technical answers |
| `communication_score` | Clarity and structure of responses |
| `relevance_score` | Alignment with job requirements |
| `overall_score` | Weighted composite score |

### Phase 1 (Current) — Rule-based Scoring
- Keyword matching against job requirements
- Response length analysis
- Answer completeness checking
- No LLM integration

### Phase 2 (Future) — LLM-based Scoring
- LLM-powered evaluation with reasoning
- Citation from interview transcript

## MongoDB Document Schema

```json
{
  "_id": "ObjectId",
  "application_id": "uuid",
  "session_id": "uuid",
  "scores": {
    "technical": 75,
    "communication": 82,
    "relevance": 68,
    "overall": 76
  },
  "summary": "Candidate demonstrated solid knowledge of REST APIs...",
  "strengths": ["Clear communication", "Structured problem solving"],
  "weaknesses": ["Limited knowledge of distributed systems"],
  "recommendation": "ADVANCE_TO_NEXT_ROUND",
  "generated_at": "ISODate"
}
```

## API Routes

| Prefix | Module |
|---|---|
| `/api/reports` | List all reports (HR only, paginated) |
| `/api/reports/:applicationId` | Full assessment report for an application (HR only) |

## Key Rules

- Email sending: Nodemailer (SMTP) or SendGrid
- Retry email delivery up to 3 times with exponential backoff (5s/15s/45s)
- After max retries → DLQ + dashboard alert
- Reports are immutable once generated — no update/delete endpoints
