export interface TextInspection {
  readonly bytes: number;
  readonly characters: number;
  readonly lines: number;
  readonly words: number;
}

export class TextInspector {
  public inspect(text: string): TextInspection {
    const trimmed = text.trim();
    return {
      bytes: Buffer.byteLength(text, 'utf8'),
      characters: [...text].length,
      lines: text.length === 0 ? 0 : text.split(/\r\n?|\n/u).length,
      words: trimmed.length === 0 ? 0 : trimmed.split(/\s+/u).length,
    };
  }
}

export interface CapabilityServices {
  readonly text: TextInspector;
}
