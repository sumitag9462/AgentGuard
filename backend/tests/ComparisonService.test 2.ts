import { ComparisonService } from '../src/services/evaluation/ComparisonService';
import { Evaluation } from '../src/models/Evaluation';
import { Failure } from '../src/models/Failure';
import { Trace } from '../src/models/Trace';

jest.mock('../src/models/Evaluation', () => ({
  Evaluation: {
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn()
  }
}));

jest.mock('../src/models/Failure', () => ({ Failure: { find: jest.fn() } }));
jest.mock('../src/models/Trace', () => ({ Trace: { find: jest.fn() } }));

describe('ComparisonService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null if no previous evaluation exists', async () => {
    (Evaluation.findById as jest.Mock).mockResolvedValue({ agentId: 'agent-1', timestamp: new Date() });
    
    // Mock the chain findOne().sort()
    const sortMock = jest.fn().mockResolvedValue(null);
    (Evaluation.findOne as jest.Mock).mockReturnValue({ sort: sortMock });

    const result = await ComparisonService.autoCompareWithPrevious('eval-123');
    expect(result).toBeNull();
  });
});
