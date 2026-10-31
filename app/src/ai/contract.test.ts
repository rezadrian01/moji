import analyzeReq from '../../../contract/fixtures/analyzeEntry.request.json';
import analyzeRes from '../../../contract/fixtures/analyzeEntry.response.json';
import insightReq from '../../../contract/fixtures/writeInsight.request.json';
import insightRes from '../../../contract/fixtures/writeInsight.response.json';
import {
  type AnalyzeEntryRequest,
  type WriteInsightRequest,
  isAnalyzeEntryResponse,
  isWriteInsightResponse,
} from './contract';

const keys = insightReq.patterns.map((p) => p.key);

describe('fixtures', () => {
  it('requests have the contract shape', () => {
    const a = analyzeReq as AnalyzeEntryRequest;
    expect(a.options.contexts).toHaveLength(6);
    const w = insightReq as WriteInsightRequest;
    expect(w.patterns).toHaveLength(2);
  });
  it('responses pass the guards', () => {
    expect(isAnalyzeEntryResponse(analyzeRes)).toBe(true);
    expect(isWriteInsightResponse(insightRes, keys)).toBe(true);
  });
  it('analyze fixture is an academic note with riskLevel none', () => {
    expect(analyzeRes.riskLevel).toBe('none');
    expect(analyzeRes.suggestions.contexts).toContain('akademik');
  });
});

describe('isAnalyzeEntryResponse', () => {
  it('rejects unknown riskLevel', () => {
    expect(isAnalyzeEntryResponse({ ...analyzeRes, riskLevel: 'high' })).toBe(false);
  });
  it('rejects non-objects and missing suggestions', () => {
    expect(isAnalyzeEntryResponse(null)).toBe(false);
    expect(isAnalyzeEntryResponse({ riskLevel: 'none' })).toBe(false);
  });
  it('rejects unknown context category', () => {
    const bad = { ...analyzeRes, suggestions: { ...analyzeRes.suggestions, contexts: ['bukan'] } };
    expect(isAnalyzeEntryResponse(bad)).toBe(false);
  });
});

describe('isWriteInsightResponse', () => {
  it('rejects extra patternTexts keys', () => {
    const bad = { ...insightRes, patternTexts: { ...insightRes.patternTexts, 'x:y': 'z' } };
    expect(isWriteInsightResponse(bad, keys)).toBe(false);
  });
  it('rejects missing patternTexts keys', () => {
    const bad = { ...insightRes, patternTexts: { [keys[0]]: 'teks' } };
    expect(isWriteInsightResponse(bad, keys)).toBe(false);
  });
  it('rejects empty questions', () => {
    expect(isWriteInsightResponse({ ...insightRes, questions: [] }, keys)).toBe(false);
  });
  it('rejects more than 3 questions', () => {
    expect(isWriteInsightResponse({ ...insightRes, questions: ['a', 'b', 'c', 'd'] }, keys)).toBe(false);
  });
  it('rejects non-string text', () => {
    expect(isWriteInsightResponse({ ...insightRes, text: 5 }, keys)).toBe(false);
  });
});
