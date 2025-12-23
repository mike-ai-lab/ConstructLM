import { ProcessedFile } from '../types';

export async function streamAWSBedrock(
  modelId: string,
  messages: any[],
  userMessage: string,
  files: ProcessedFile[],
  onChunk: (chunk: string) => void
): Promise<{ inputTokens: number; outputTokens: number; totalTokens: number }> {
  throw new Error('AWS Bedrock integration not configured. Please set up AWS credentials.');
}
