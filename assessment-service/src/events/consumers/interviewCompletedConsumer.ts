import { getChannel } from '../connection';
import logger from '../../utils/logger';
import { scoreInterview } from '../../scoring/scorer';
import { LlmScorer } from '../../scoring/llmScorer';
import AssessmentReport from '../../models/assessmentReport';
import { publishSendEmailReport } from '../publishers/emailPublisher';
import { config } from '../../config';

export async function consumeInterviewCompleted(): Promise<void> {
  const channel = getChannel();
  const queue = 'interview.completed';

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    let correlationId = 'unknown';
    let applicationId = 'unknown';

    try {
      const payload = JSON.parse(msg.content.toString());
      const { session_id, application_id, chat_history, correlation_id } = payload;
      correlationId = correlation_id || 'unknown';
      applicationId = application_id || 'unknown';

      logger.info({
        event: 'event.received.interview_completed',
        correlation_id: correlationId,
        session_id,
        application_id,
      });

      await attemptWithRetry(
        async () => {
          // 1. Fetch application and job details from Core Service using internal HTTP endpoint
          const getAppUrl = `${config.coreServiceUrl}/api/internal/applications/${application_id}`;
          logger.info({
            event: 'http.request.core.get_application',
            correlation_id: correlationId,
            url: getAppUrl,
          });

          const appRes = await fetch(getAppUrl, {
            headers: {
              'x-correlation-id': correlationId,
              'Content-Type': 'application/json',
            },
          });

          if (!appRes.ok) {
            throw new Error(`Failed to fetch application details from Core Service. Status: ${appRes.status}`);
          }

          const appData = (await appRes.json()) as any;
          const application = appData?.data?.application;
          if (!application) {
            throw new Error(`Application data not found for ID: ${application_id}`);
          }

          const jobRequirements = application.job?.requirements || '';
          const candidateName = application.candidateName || 'Candidate';
          const jobTitle = application.job?.title || 'Unknown Job';
          const hrEmail = application.job?.hr?.email;

          if (!hrEmail) {
            throw new Error(`HR email not found for job associated with application: ${application_id}`);
          }

          // 2. Perform scoring using LLM or rule-based scoring engine
          let scoringResult: any;
          const startTime = Date.now();
          let methodUsed: 'LLM' | 'RULE_BASED' = 'RULE_BASED';

          if (config.useLlmScoring) {
            try {
              logger.info({
                event: 'scoring.llm.start',
                correlation_id: correlationId,
                application_id,
              });
              const llmScorer = new LlmScorer();
              scoringResult = await llmScorer.score(chat_history, jobRequirements);
              methodUsed = 'LLM';
            } catch (err: any) {
              logger.warn({
                event: 'scoring.llm.failed_consumer_fallback',
                correlation_id: correlationId,
                application_id,
                error: err.message,
              });
              scoringResult = scoreInterview(chat_history, jobRequirements);
              scoringResult.scoring_method = 'RULE_BASED';
            }
          } else {
            logger.info({
              event: 'scoring.rule_based.start',
              correlation_id: correlationId,
              application_id,
            });
            scoringResult = scoreInterview(chat_history, jobRequirements);
            scoringResult.scoring_method = 'RULE_BASED';
          }

          const durationMs = Date.now() - startTime;
          logger.info({
            event: 'scoring.complete',
            correlation_id: correlationId,
            application_id,
            method: scoringResult.scoring_method || methodUsed,
            duration_ms: durationMs,
          });

          // 3. Save report to MongoDB
          // Check if report already exists for this application (ensure idempotency)
          let report = await AssessmentReport.findOne({ application_id });
          if (!report) {
            report = await AssessmentReport.create({
              application_id,
              session_id,
              candidate_name: candidateName,
              job_title: jobTitle,
              scores: scoringResult.scores,
              summary: scoringResult.summary,
              strengths: scoringResult.strengths,
              weaknesses: scoringResult.weaknesses,
              recommendation: scoringResult.recommendation,
              reasoning: scoringResult.reasoning,
              citations: scoringResult.citations,
              detailed_feedback: scoringResult.detailed_feedback,
              scoring_method: scoringResult.scoring_method || methodUsed,
              generated_at: new Date(),
            });
            logger.info({
              event: 'report.created',
              correlation_id: correlationId,
              application_id,
              report_id: report._id,
            });
          } else {
            logger.warn({
              event: 'report.already_exists',
              correlation_id: correlationId,
              application_id,
              message: 'Report already exists for this application. Skipping report creation.',
            });
          }

          // 4. Update application status to COMPLETED via HTTP PATCH to Core Service
          const updateStatusUrl = `${config.coreServiceUrl}/api/internal/applications/${application_id}/status`;
          logger.info({
            event: 'http.request.core.update_status',
            correlation_id: correlationId,
            url: updateStatusUrl,
          });

          const patchRes = await fetch(updateStatusUrl, {
            method: 'PATCH',
            headers: {
              'x-correlation-id': correlationId,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'COMPLETED' }),
          });

          if (!patchRes.ok) {
            throw new Error(`Failed to update application status to COMPLETED in Core Service. Status: ${patchRes.status}`);
          }

          logger.info({
            event: 'application.status_updated.completed',
            correlation_id: correlationId,
            application_id,
          });

          // 5. Publish SEND_EMAIL event (type: REPORT)
          const reportUrl = `${config.frontendUrl}/reports/${application_id}`;
          await publishSendEmailReport(
            hrEmail,
            candidateName,
            jobTitle,
            scoringResult.scores.overall,
            reportUrl,
            correlationId
          );
        },
        correlationId,
        'interview_completed_processing'
      );

      channel.ack(msg);

      logger.info({
        event: 'event.processed.interview_completed',
        correlation_id: correlationId,
        application_id,
        status: 'success',
      });
    } catch (error) {
      logger.error({
        event: 'event.failed.interview_completed_permanently',
        correlation_id: correlationId,
        application_id: applicationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Send to DLQ
      channel.nack(msg, false, false);
    }
  });

  logger.info({ event: 'rabbitmq.consumer.started', queue });
}

async function attemptWithRetry(
  actionFn: () => Promise<void>,
  correlationId: string,
  actionName: string
): Promise<void> {
  let attempts = 0;
  const maxAttempts = 3;
  const backoffDelays = [5000, 15000, 45000]; // 5s, 15s, 45s

  while (attempts < maxAttempts) {
    try {
      attempts++;
      await actionFn();
      return;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn({
        event: `${actionName}.attempt_failed`,
        correlation_id: correlationId,
        attempt: attempts,
        error: errorMessage,
      });

      if (attempts >= maxAttempts) {
        throw err;
      }

      const delay = backoffDelays[attempts - 1] || 5000;
      logger.info({
        event: `${actionName}.retry_delay`,
        correlation_id: correlationId,
        delay_ms: delay,
        next_attempt: attempts + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
