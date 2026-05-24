export interface ChatMessage {
  role: 'AI' | 'CANDIDATE';
  content: string;
  stage: string;
  timestamp: string;
}

export interface Scores {
  technical: number;
  communication: number;
  relevance: number;
  overall: number;
}

export interface ScoringResult {
  scores: Scores;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'ADVANCE_TO_NEXT_ROUND' | 'CONSIDER' | 'REJECT';
}

const FALLBACK_KEYWORDS = [
  'react',
  'node',
  'typescript',
  'python',
  'javascript',
  'docker',
  'git',
  'api',
  'database',
  'sql',
  'rest',
  'express',
  'nest',
  'postgres',
  'mongodb',
  'redis',
  'aws',
  'cloud',
  'ci/cd',
  'microservices',
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'to', 'from', 'in', 'on', 'at', 'by', 'for',
  'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'up', 'down', 'of', 'that', 'this', 'these', 'those', 'it', 'its',
  'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'me',
  'him', 'us', 'them', 'what', 'which', 'who', 'whom', 'whose', 'why', 'how',
  'am', 'so', 'as', 'if', 'no'
]);

function extractKeywords(text: string): Set<string> {
  const words = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  return new Set(words.filter(w => !STOP_WORDS.has(w)));
}

export function scoreTechnical(chatHistory: ChatMessage[], requirementsText?: string): number {
  const candidateMessages = chatHistory.filter(m => m.role === 'CANDIDATE').map(m => m.content.toLowerCase());
  if (candidateMessages.length === 0) return 50;

  // Determine candidate keywords
  const candidateKeywords = new Set<string>();
  candidateMessages.forEach(msg => {
    extractKeywords(msg).forEach(kw => candidateKeywords.add(kw));
  });

  // Extract job keywords
  let jobKeywords = new Set<string>();
  if (requirementsText) {
    jobKeywords = extractKeywords(requirementsText);
  }

  // If no job keywords could be extracted, fallback
  if (jobKeywords.size === 0) {
    FALLBACK_KEYWORDS.forEach(kw => jobKeywords.add(kw));
  }

  // Count matches
  let matches = 0;
  jobKeywords.forEach(kw => {
    if (candidateKeywords.has(kw)) {
      matches++;
    }
  });

  // Scoring logic: base 50, +10 points per matched keyword, capped at 100
  const score = 50 + matches * 10;
  return Math.min(100, score);
}

export function scoreCommunication(chatHistory: ChatMessage[]): number {
  const candidateMessages = chatHistory.filter(m => m.role === 'CANDIDATE');
  if (candidateMessages.length === 0) return 50;

  let totalChars = 0;
  candidateMessages.forEach(m => {
    totalChars += m.content.length;
  });

  const avgLength = totalChars / candidateMessages.length;

  if (avgLength >= 120) return 95;
  if (avgLength >= 70) return 85;
  if (avgLength >= 30) return 70;
  return 55;
}

export function scoreRelevance(chatHistory: ChatMessage[]): number {
  const candidateMessages = chatHistory.filter(m => m.role === 'CANDIDATE');
  const aiMessages = chatHistory.filter(m => m.role === 'AI');
  if (candidateMessages.length === 0 || aiMessages.length === 0) return 50;

  // Ratio check
  const ratio = candidateMessages.length / aiMessages.length;
  let baseScore = ratio >= 0.8 ? 85 : 70;

  // Question-Answer keyword sharing check
  let keywordOverlapCount = 0;
  let evaluatedPairs = 0;

  for (let i = 0; i < chatHistory.length - 1; i++) {
    if (chatHistory[i].role === 'AI' && chatHistory[i + 1].role === 'CANDIDATE') {
      evaluatedPairs++;
      const aiKws = extractKeywords(chatHistory[i].content);
      const candidateKws = extractKeywords(chatHistory[i + 1].content);

      let shared = false;
      for (const kw of aiKws) {
        if (candidateKws.has(kw)) {
          shared = true;
          break;
        }
      }
      if (shared) {
        keywordOverlapCount++;
      }
    }
  }

  const overlapPercentage = evaluatedPairs > 0 ? (keywordOverlapCount / evaluatedPairs) * 100 : 0;
  if (overlapPercentage >= 40) {
    baseScore += 15;
  } else if (overlapPercentage >= 20) {
    baseScore += 5;
  }

  return Math.min(100, Math.max(50, baseScore));
}

export function calculateOverall(scores: Omit<Scores, 'overall'>): number {
  return Math.round(
    scores.technical * 0.4 +
    scores.communication * 0.3 +
    scores.relevance * 0.3
  );
}

export function generateSummary(scores: Scores): string {
  if (scores.overall >= 80) {
    return 'The candidate performed exceptionally well across all dimensions, demonstrating strong technical knowledge, clear communication, and highly relevant responses.';
  }
  if (scores.overall >= 65) {
    return 'The candidate showed acceptable proficiency. They responded adequately to technical and situational questions, though some areas could be elaborated.';
  }
  return "The candidate's responses were brief or lacked the technical detail required for this position.";
}

export function identifyStrengths(scores: Omit<Scores, 'overall'>): string[] {
  const strengths: string[] = [];
  if (scores.technical >= 75) strengths.push('Good grasp of the required technical stack.');
  if (scores.communication >= 75) strengths.push('Clear and structured communication style.');
  if (scores.relevance >= 75) strengths.push('Answers were highly relevant and addressed questions directly.');
  
  if (strengths.length === 0) {
    strengths.push('Polite and responsive participant.');
  }
  return strengths;
}

export function identifyWeaknesses(scores: Omit<Scores, 'overall'>): string[] {
  const weaknesses: string[] = [];
  if (scores.technical < 70) weaknesses.push('Needs to deepen knowledge in key technical areas.');
  if (scores.communication < 70) weaknesses.push('Responses were somewhat brief; could provide more context.');
  if (scores.relevance < 70) weaknesses.push('Some responses did not fully address the interviewer\'s questions.');
  
  if (weaknesses.length === 0) {
    weaknesses.push('No critical weaknesses identified.');
  }
  return weaknesses;
}

export function scoreInterview(chatHistory: ChatMessage[], requirementsText?: string): ScoringResult {
  const technical = scoreTechnical(chatHistory, requirementsText);
  const communication = scoreCommunication(chatHistory);
  const relevance = scoreRelevance(chatHistory);
  const overall = calculateOverall({ technical, communication, relevance });

  const scores: Scores = { technical, communication, relevance, overall };
  const summary = generateSummary(scores);
  const strengths = identifyStrengths(scores);
  const weaknesses = identifyWeaknesses(scores);

  let recommendation: 'ADVANCE_TO_NEXT_ROUND' | 'CONSIDER' | 'REJECT' = 'REJECT';
  if (overall >= 80) {
    recommendation = 'ADVANCE_TO_NEXT_ROUND';
  } else if (overall >= 65) {
    recommendation = 'CONSIDER';
  }

  return {
    scores,
    summary,
    strengths,
    weaknesses,
    recommendation,
  };
}
