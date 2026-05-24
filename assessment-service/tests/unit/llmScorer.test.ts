import { renderUserPrompt } from '../../src/scoring/prompts';
import { validateCitations, MockLlmScorer, LlmScorer } from '../../src/scoring/llmScorer';
import { ChatMessage } from '../../src/scoring/scorer';
import { config } from '../../src/config';

// Mock config values
jest.mock('../../src/config', () => ({
  config: {
    llmProvider: 'gemini',
    llmApiKey: '',
    useLlmScoring: true,
  },
}));

describe('LLM Scorer Unit Tests', () => {
  const sampleChatHistory: ChatMessage[] = [
    { role: 'AI', content: 'Tell me about yourself.', stage: 'GREETING', timestamp: new Date().toISOString() },
    { role: 'CANDIDATE', content: 'I am a Software Engineer with experience in Python and FastAPI.', stage: 'GREETING', timestamp: new Date().toISOString() },
    { role: 'AI', content: 'What databases have you used?', stage: 'TECHNICAL_QUESTIONS', timestamp: new Date().toISOString() },
    { role: 'CANDIDATE', content: 'I have used PostgreSQL and MongoDB extensively.', stage: 'TECHNICAL_QUESTIONS', timestamp: new Date().toISOString() },
  ];

  describe('Prompt Rendering', () => {
    it('should correctly format chat history and JD requirements', () => {
      const requirements = 'Python, FastAPI, PostgreSQL';
      const prompt = renderUserPrompt(sampleChatHistory, requirements);

      expect(prompt).toContain('JOB DESCRIPTION REQUIREMENTS:');
      expect(prompt).toContain(requirements);
      expect(prompt).toContain('INTERVIEW TRANSCRIPT:');
      expect(prompt).toContain('[CANDIDATE] (Stage: GREETING): I am a Software Engineer');
      expect(prompt).toContain('[CANDIDATE] (Stage: TECHNICAL_QUESTIONS): I have used PostgreSQL');
    });
  });

  describe('Citation Validation', () => {
    it('should accept citations that exist in candidate answers', () => {
      const citations = [
        { quote: 'used PostgreSQL and MongoDB', stage: 'TECHNICAL_QUESTIONS', dimension: 'technical' },
        { quote: 'Python and FastAPI', stage: 'GREETING', dimension: 'relevance' },
      ];

      const validated = validateCitations(citations, sampleChatHistory);
      expect(validated).toHaveLength(2);
      expect(validated[0].quote).toBe('used PostgreSQL and MongoDB');
    });

    it('should ignore case and multiple spaces when validating citations', () => {
      const citations = [
        { quote: '  USED   postgresql and   mongoDB ', stage: 'TECHNICAL_QUESTIONS', dimension: 'technical' },
      ];

      const validated = validateCitations(citations, sampleChatHistory);
      expect(validated).toHaveLength(1);
      expect(validated[0].quote).toBe('USED   postgresql and   mongoDB');
    });

    it('should reject citations that do not exist or are from interviewer', () => {
      const citations = [
        { quote: 'Tell me about yourself', stage: 'GREETING', dimension: 'communication' }, // Interviewer phrase
        { quote: 'I use Kubernetes daily', stage: 'TECHNICAL_QUESTIONS', dimension: 'technical' }, // Non-existent
      ];

      const validated = validateCitations(citations, sampleChatHistory);
      expect(validated).toHaveLength(0);
    });
  });

  describe('MockLlmScorer', () => {
    it('should generate scores and mock citations based on transcript', async () => {
      const scorer = new MockLlmScorer();
      const result = await scorer.score(sampleChatHistory, 'Python, Postgres');

      expect(result.scoring_method).toBe('LLM');
      expect(result.scores).toBeDefined();
      expect(result.scores.technical).toBeGreaterThanOrEqual(0);
      expect(result.scores.communication).toBeGreaterThanOrEqual(0);
      expect(result.scores.relevance).toBeGreaterThanOrEqual(0);
      expect(result.scores.overall).toBeGreaterThanOrEqual(0);
      
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.technical).toContain('Candidate');
      expect(result.reasoning.communication).toBeDefined();
      
      expect(result.citations).toBeDefined();
      expect(result.citations.length).toBeGreaterThan(0);
      
      // Ensure generated citations exist in candidates responses
      const candidateMsgs = sampleChatHistory.filter(m => m.role === 'CANDIDATE').map(m => m.content);
      result.citations.forEach(cit => {
        const quoteContent = cit.quote.replace('...', '');
        const exists = candidateMsgs.some(msg => msg.includes(quoteContent));
        expect(exists).toBe(true);
      });
    });
  });

  describe('LlmScorer Fallback', () => {
    it('should fall back to MockLlmScorer if apiKey is empty', async () => {
      config.llmApiKey = '';
      const scorer = new LlmScorer();
      const result = await scorer.score(sampleChatHistory, 'Python');

      expect(result.scoring_method).toBe('LLM');
      expect(result.citations.length).toBeGreaterThan(0);
    });

    it('should fall back to MockLlmScorer if LLM API request fails', async () => {
      config.llmApiKey = 'invalid-fake-key';
      config.llmProvider = 'gemini';

      // Mock global fetch to throw error
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const scorer = new LlmScorer();
      const result = await scorer.score(sampleChatHistory, 'Python');

      expect(result.scoring_method).toBe('LLM');
      expect(result.citations.length).toBeGreaterThan(0);

      // Restore fetch
      global.fetch = originalFetch;
    });
  });
});
