import {
  scoreTechnical,
  scoreCommunication,
  scoreRelevance,
  calculateOverall,
  scoreInterview,
  ChatMessage,
} from '../../src/scoring/scorer';

describe('Scoring Engine', () => {
  describe('scoreTechnical', () => {
    it('should return 50 if there is no candidate chat history', () => {
      const history: ChatMessage[] = [
        { role: 'AI', content: 'Hello, what is your experience with Node.js?', stage: 'GREETING', timestamp: new Date().toISOString() },
      ];
      const score = scoreTechnical(history);
      expect(score).toBe(50);
    });

    it('should score based on fallback keywords if no requirements text is provided', () => {
      const history: ChatMessage[] = [
        { role: 'AI', content: 'Hello', stage: 'GREETING', timestamp: new Date().toISOString() },
        { role: 'CANDIDATE', content: 'I have experience using TypeScript, Node, and Postgres in production. I also know Docker.', stage: 'EXPERIENCE_REVIEW', timestamp: new Date().toISOString() },
      ];
      // TypeScript, Node, Postgres, Docker are fallback keywords
      // 4 matched fallback keywords -> 50 + 4 * 10 = 90
      const score = scoreTechnical(history);
      expect(score).toBe(90);
    });

    it('should score based on requirements text keywords if provided', () => {
      const history: ChatMessage[] = [
        { role: 'AI', content: 'Hello', stage: 'GREETING', timestamp: new Date().toISOString() },
        { role: 'CANDIDATE', content: 'I mainly write Go, Postgres, and Kubernetes.', stage: 'EXPERIENCE_REVIEW', timestamp: new Date().toISOString() },
      ];
      const requirements = 'Must have experience with Go and Kubernetes.';
      // Go, Kubernetes are in requirements. Postgres is not.
      // 2 matched keywords -> 50 + 2 * 10 = 70
      const score = scoreTechnical(history, requirements);
      expect(score).toBe(70);
    });

    it('should cap the score at 100', () => {
      const history: ChatMessage[] = [
        { role: 'AI', content: 'Hello', stage: 'GREETING', timestamp: new Date().toISOString() },
        { role: 'CANDIDATE', content: 'I write typescript express nest postgres mongodb redis aws docker git api rest', stage: 'EXPERIENCE_REVIEW', timestamp: new Date().toISOString() },
      ];
      const score = scoreTechnical(history);
      expect(score).toBe(100);
    });
  });

  describe('scoreCommunication', () => {
    it('should return 50 if there are no candidate messages', () => {
      const score = scoreCommunication([]);
      expect(score).toBe(50);
    });

    it('should return 95 for long responses', () => {
      const history: ChatMessage[] = [
        {
          role: 'CANDIDATE',
          content: 'This is a very long response that has many characters and is meant to demonstrate a candidate who speaks in depth and provides a lot of details about their projects and achievements. This should easily exceed the 120 character limit.',
          stage: 'TECHNICAL',
          timestamp: new Date().toISOString(),
        },
      ];
      const score = scoreCommunication(history);
      expect(score).toBe(95);
    });

    it('should return lower score for short responses', () => {
      const history: ChatMessage[] = [
        { role: 'CANDIDATE', content: 'Fine.', stage: 'TECHNICAL', timestamp: new Date().toISOString() },
      ];
      const score = scoreCommunication(history);
      expect(score).toBe(55);
    });
  });

  describe('scoreRelevance', () => {
    it('should return 50 if history is empty', () => {
      const score = scoreRelevance([]);
      expect(score).toBe(50);
    });

    it('should return high score if candidate answered all questions and has keyword overlap', () => {
      const history: ChatMessage[] = [
        { role: 'AI', content: 'Tell me about database optimization', stage: 'TECHNICAL', timestamp: new Date().toISOString() },
        { role: 'CANDIDATE', content: 'For database optimization, I use indexes and postgres queries.', stage: 'TECHNICAL', timestamp: new Date().toISOString() },
      ];
      // 1-to-1 ratio -> base 85.
      // overlap keywords: "database", "optimization", "postgres"
      // overlap percentage: 100% -> bonus +15 -> 100.
      const score = scoreRelevance(history);
      expect(score).toBe(100);
    });
  });

  describe('calculateOverall', () => {
    it('should compute weighted average correctly', () => {
      const overall = calculateOverall({
        technical: 80,
        communication: 70,
        relevance: 90,
      });
      // 80 * 0.4 + 70 * 0.3 + 90 * 0.3 = 32 + 21 + 27 = 80
      expect(overall).toBe(80);
    });
  });

  describe('scoreInterview', () => {
    it('should return a full scoring result', () => {
      const history: ChatMessage[] = [
        { role: 'AI', content: 'What is Node.js?', stage: 'TECHNICAL', timestamp: new Date().toISOString() },
        { role: 'CANDIDATE', content: 'Node.js is a runtime that lets us run Javascript on the server, using express.', stage: 'TECHNICAL', timestamp: new Date().toISOString() },
      ];

      const result = scoreInterview(history);
      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('weaknesses');
      expect(result).toHaveProperty('recommendation');
      expect(result.scores.overall).toBeGreaterThanOrEqual(50);
    });
  });
});
