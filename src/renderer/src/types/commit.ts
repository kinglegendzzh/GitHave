// src/types/commit.ts
export interface HunkDetail {
  OldStart: number;
  OldLines: number;
  NewStart: number;
  NewLines: number;
  Diff: string;
}

export interface FileDiff {
  Filename: string;
  Additions: number;
  Deletions: number;
  Hunks: HunkDetail[];
  FullContent?: string;
  Evaluation: string;
}

export interface CommitRecord {
  Hash: string;
  AuthorName: string;
  AuthorEmail: string;
  Message: string;
  Time: string;
  FileDiffs: FileDiff[];
  CommitCount: number;
  CodeMap: Record<string,string> | null;
}
