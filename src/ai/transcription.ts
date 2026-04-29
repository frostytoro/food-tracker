import { createReadStream } from 'node:fs';
import type OpenAI from 'openai';

export class AudioTranscriptionService {
  constructor(
    private readonly openai: OpenAI,
    private readonly model: string
  ) {}

  async transcribeFile(filePath: string): Promise<string> {
    const response = await this.openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: this.model
    });

    return response.text;
  }
}
