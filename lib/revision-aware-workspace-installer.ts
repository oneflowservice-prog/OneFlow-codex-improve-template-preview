export type WorkspaceFileChange = {
  operation: "write" | "delete";
  path: string;
  content?: string;
};

export type RevisionAwareWorkspaceSnapshot = {
  revision: number;
  files: Array<{ path: string; content: string }>;
};

export type RevisionAwareWorkspaceAdapter = {
  read(): Promise<RevisionAwareWorkspaceSnapshot>;
  patch(input: {
    expectedRevision: number;
    changes: WorkspaceFileChange[];
  }): Promise<void>;
  isRevisionConflict(error: unknown): boolean;
};

export async function installRevisionAwareWorkspaceBundle<T>(input: {
  adapter: RevisionAwareWorkspaceAdapter;
  plan(snapshot: RevisionAwareWorkspaceSnapshot): WorkspaceFileChange[];
  result(snapshot: RevisionAwareWorkspaceSnapshot, changed: boolean): T;
}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const snapshot = await input.adapter.read();
    const changes = input.plan(snapshot);
    if (changes.length === 0) return input.result(snapshot, false);
    try {
      await input.adapter.patch({
        expectedRevision: snapshot.revision,
        changes,
      });
      return input.result(snapshot, true);
    } catch (error) {
      if (attempt === 0 && input.adapter.isRevisionConflict(error)) continue;
      throw error;
    }
  }
  throw new Error("Workspace skill installation could not complete.");
}
