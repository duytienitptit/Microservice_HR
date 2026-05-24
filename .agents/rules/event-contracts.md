# RabbitMQ Event Contracts — DO NOT change event names or payload shapes

## Event: CV_UPLOADED

- **Publisher:** Core Service
- **Consumer:** RAG Service
- **Exchange:** `cv.events` (direct)
- **Queue:** `cv.uploaded`

```json
{
  "application_id": "uuid",
  "cv_file_path": "/storage/cv/abc.pdf",
  "job_id": "uuid",
  "correlation_id": "uuid"
}
```

## Event: CV_READY

- **Publisher:** RAG Service
- **Consumer:** Core Service
- **Exchange:** `cv.events` (direct)
- **Queue:** `cv.ready`

```json
{
  "application_id": "uuid",
  "status": "success | failed",
  "chunk_count": 42,
  "extracted_email": "candidate@email.com",
  "extracted_name": "Nguyen Van A",
  "correlation_id": "uuid"
}
```

> **Note:** `extracted_email` and `extracted_name` are extracted from the CV text by RAG Service using regex patterns. These fields may be `null` if extraction fails — Core Service should handle this gracefully (HR can manually input later).

## Event: INTERVIEW_COMPLETED

- **Publisher:** AI Service
- **Consumer:** Assessment Service
- **Exchange:** `interview.events` (direct)
- **Queue:** `interview.completed`

```json
{
  "session_id": "uuid",
  "application_id": "uuid",
  "chat_history": [
    { "role": "AI|CANDIDATE", "content": "...", "stage": "...", "timestamp": "ISO" }
  ],
  "correlation_id": "uuid"
}
```

## Event: SEND_EMAIL (type: REPORT)

- **Publisher:** Assessment Service
- **Consumer:** Assessment Service (self)
- **Exchange:** `notification.events` (direct)
- **Queue:** `send.email`

```json
{
  "type": "REPORT",
  "hr_email": "hr@company.com",
  "candidate_name": "Nguyen Van A",
  "job_title": "Backend Engineer",
  "overall_score": 76,
  "report_url": "https://app.com/reports/uuid",
  "correlation_id": "uuid"
}
```

## Event: SEND_EMAIL (type: INVITE)

- **Publisher:** Core Service
- **Consumer:** Assessment Service
- **Exchange:** `notification.events` (direct)
- **Queue:** `send.email` (reuse — phân biệt qua trường `type`)

```json
{
  "type": "INVITE",
  "candidate_email": "candidate@email.com",
  "candidate_name": "Nguyen Van A",
  "job_title": "Backend Engineer",
  "magic_link_url": "https://app.com/interview/{magic_link_token}",
  "correlation_id": "uuid"
}
```

## Event: SEND_EMAIL (type: REJECTION)

- **Publisher:** Core Service
- **Consumer:** Assessment Service
- **Exchange:** `notification.events` (direct)
- **Queue:** `send.email` (reuse — phân biệt qua trường `type`)

```json
{
  "type": "REJECTION",
  "candidate_email": "candidate@email.com",
  "candidate_name": "Nguyen Van A",
  "job_title": "Backend Engineer",
  "correlation_id": "uuid"
}
```

## Exchange & Queue Layout

```
Exchange: cv.events (type: direct)
  ├── Queue: cv.uploaded        → Consumer: RAG Service
  └── Queue: cv.ready           → Consumer: Core Service

Exchange: interview.events (type: direct)
  └── Queue: interview.completed → Consumer: Assessment Service

Exchange: notification.events (type: direct)
  └── Queue: send.email          → Consumer: Assessment Service (self)
      (type: "INVITE" | "REPORT" | "REJECTION" — phân biệt loại email qua trường type)

Dead Letter Exchange: dlx.events
  ├── Queue: dlq.cv.uploaded
  ├── Queue: dlq.interview.completed
  └── Queue: dlq.send.email
```
