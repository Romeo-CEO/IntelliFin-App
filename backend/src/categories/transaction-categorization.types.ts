import { CategorizationConfidence } from '@prisma/client';

export interface CategorizationSuggestion {
  categoryId: string;
  confidence: CategorizationConfidence;
  ruleId?: string;
  score: number;
  reason?: string;
}

export interface CategorizationResult {
  transactionId: string;
  categoryId: string | null;
  suggestions: CategorizationSuggestion[];
  appliedSuggestion?: CategorizationSuggestion | null;
  appliedAt?: Date;
  appliedBy?: string;
  metadata?: Record<string, any>;
}
