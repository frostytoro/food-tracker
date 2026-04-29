import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface ReminderState {
  lastReminderDate: string | null;
}

const DEFAULT_STATE: ReminderState = {
  lastReminderDate: null
};

export class ReminderStateStore {
  constructor(private readonly filePath: string) {}

  async getState(): Promise<ReminderState> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return JSON.parse(raw) as ReminderState;
    } catch {
      return DEFAULT_STATE;
    }
  }

  async saveState(state: ReminderState): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), 'utf8');
  }
}

