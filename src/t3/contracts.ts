// External T3 MCP schemas observed on 7 October 2026.
// Unknown model fields match T3's wire contract; callers select explicit catalog IDs.
export interface T3Tools {
  t3_project_list: {
    input: {
      cursor?: number | null;
      limit?: number | null;
      [key: string]: unknown;
    };
    output: {
      nextCursor: number | null;
      projects: Array<T3Tools["t3_project_read"]["output"]>;
      [key: string]: unknown;
    };
  };
  t3_project_read: {
    input: { projectId: string; [key: string]: unknown };
    output: {
      autoPull?: boolean | null;
      createdAt: string;
      defaultModelSelection: {
        instanceId?: unknown | null;
        model: unknown;
        options?: unknown | null;
        provider?: unknown | null;
        [key: string]: unknown;
      } | null;
      defaultThreadEnvMode?: "local" | "worktree" | null;
      deletedAt: string | null;
      faviconPath?: string | null;
      id: string;
      projectIcon?:
        | {
            color:
              | "gray"
              | "red"
              | "orange"
              | "amber"
              | "yellow"
              | "lime"
              | "green"
              | "emerald"
              | "teal"
              | "cyan"
              | "sky"
              | "blue"
              | "indigo"
              | "violet"
              | "purple"
              | "fuchsia"
              | "pink"
              | "rose";
            kind: "lucide";
            monogram?: string | null;
            monogramText?: string | null;
            name: string;
            [key: string]: unknown;
          }
        | { emoji: string; kind: "emoji"; [key: string]: unknown }
        | {
            color:
              | "gray"
              | "red"
              | "orange"
              | "amber"
              | "yellow"
              | "lime"
              | "green"
              | "emerald"
              | "teal"
              | "cyan"
              | "sky"
              | "blue"
              | "indigo"
              | "violet"
              | "purple"
              | "fuchsia"
              | "pink"
              | "rose";
            kind: "monogram";
            text: string;
            [key: string]: unknown;
          }
        | { kind: string; [key: string]: unknown }
        | null
        | null;
      repositoryIdentity?: {
        canonicalKey: string;
        displayName?: string;
        locator: {
          remoteName: string;
          remoteUrl: string;
          source: "git-remote";
          [key: string]: unknown;
        };
        name?: string;
        origin?: {
          canonicalKey: string;
          displayName?: string;
          [key: string]: unknown;
        };
        owner?: string;
        provider?: string;
        rootPath?: string;
        webUrl?: string;
        [key: string]: unknown;
      } | null;
      scripts: Array<{
        async?: boolean | null;
        autoOpenPreview?: boolean | null;
        command: string;
        icon: "play" | "test" | "lint" | "configure" | "build" | "debug";
        id: string;
        name: string;
        previewUrl?: string | null;
        runOnWorktreeCreate: boolean;
        [key: string]: unknown;
      }>;
      title: string;
      updatedAt: string;
      workspaceRoot: string;
      [key: string]: unknown;
    };
  };
  orchestrator_capabilities: {
    input: {};
    output: {
      features: {
        appOwnedSubagents: boolean;
        asyncPolling: boolean;
        batchThreadCreation: boolean;
        cancellation: boolean;
        incrementalThreadRead: boolean;
        maxBatchThreads: number | "Infinity" | "-Infinity" | "NaN";
        scheduledTasks: boolean;
        threadManagement: boolean;
        [key: string]: unknown;
      };
      inheritedModel: string | null;
      inheritedProviderInstanceId: string | null;
      interactionMode: "default" | "plan";
      parentThreadId: string | null;
      providers: Array<{
        canRunChildTask: boolean;
        canRunCrossProviderChildTask: boolean;
        constraints: Array<string>;
        displayName: string | null;
        driverKind: string;
        models: Array<{
          id: string;
          label: string | null;
          options?: Array<
            | {
                currentValue?: string | null;
                description?: string | null;
                id: string;
                label: string;
                options: Array<{
                  description?: string | null;
                  id: string;
                  isDefault?: boolean | null;
                  label: string;
                  [key: string]: unknown;
                }>;
                promptInjectedValues?: Array<string> | null;
                type: "select";
                [key: string]: unknown;
              }
            | {
                currentValue?: boolean | null;
                description?: string | null;
                id: string;
                label: string;
                type: "boolean";
                [key: string]: unknown;
              }
          > | null;
          [key: string]: unknown;
        }>;
        providerInstanceId: string;
        [key: string]: unknown;
      }>;
      runtimeMode:
        | "approval-required"
        | "auto-accept-edits"
        | "auto"
        | "full-access";
      [key: string]: unknown;
    };
  };
  t3_thread_launch: {
    input: {
      attachments?: Array<
        | {
            id: string;
            mimeType: string;
            name: string;
            sizeBytes: number;
            type: "image";
            [key: string]: unknown;
          }
        | {
            id: string;
            mimeType: string;
            name: string;
            sizeBytes: number;
            source?: { _tag: "pasted-text"; [key: string]: unknown } | null;
            type: "file";
            [key: string]: unknown;
          }
      > | null;
      interactionMode?: "default" | "plan" | null;
      message?: string | null;
      modelSelection?: {
        instanceId?: unknown | null;
        model: unknown;
        options?: unknown | null;
        provider?: unknown | null;
        [key: string]: unknown;
      } | null;
      projectId?: string | null;
      runtimeMode?:
        | "approval-required"
        | "auto-accept-edits"
        | "auto"
        | "full-access"
        | null;
      scratch?: boolean | null;
      title: string;
      workspaceStrategy?:
        | { branch?: string | null; type: "root"; [key: string]: unknown }
        | {
            branch?: string | null;
            type: "existing_worktree";
            worktreePath: string;
            [key: string]: unknown;
          }
        | {
            baseRef: string;
            branch?: string | null;
            startFromOrigin?: boolean | null;
            type: "worktree";
            [key: string]: unknown;
          }
        | null;
      [key: string]: unknown;
    };
    output: {
      modelSelection: {
        instanceId?: unknown | null;
        model: unknown;
        options?: unknown | null;
        provider?: unknown | null;
        [key: string]: unknown;
      };
      projectId: string;
      runId: string | null;
      status:
        | "preparing"
        | "queued"
        | "starting"
        | "running"
        | "waiting"
        | "completed"
        | "interrupted"
        | "failed"
        | "cancelled"
        | "rolled_back"
        | null;
      threadId: string;
      [key: string]: unknown;
    };
  };
  t3_thread_send: {
    input: {
      clientRequestId?: string | null;
      message: string;
      mode?: "auto" | "queue" | "steer" | "restart" | null;
      threadId: string;
      [key: string]: unknown;
    };
    output: {
      delivery: "started" | "queued" | "steered" | "restarted";
      messageId: string;
      runId: string;
      status:
        | "preparing"
        | "queued"
        | "starting"
        | "running"
        | "waiting"
        | "completed"
        | "interrupted"
        | "failed"
        | "cancelled"
        | "rolled_back";
      threadId: string;
      [key: string]: unknown;
    };
  };
  t3_thread_read: {
    input: {
      afterPosition?: number | null;
      itemId?: string | null;
      limit?: number | null;
      maxCharsPerItem?: number | null;
      runLimit?: number | null;
      textOffset?: number | null;
      threadId: string;
      view?: "messages" | "activity" | null;
      [key: string]: unknown;
    };
    output: {
      hasMore: boolean;
      items: Array<{
        createdBy: "user" | "agent" | "system" | null;
        creationSource: "web" | "mobile" | "mcp" | "provider" | "server" | null;
        itemId: string;
        messageId: string | null;
        nextTextOffset?: number | null;
        position: number;
        runId: string | null;
        sourceThreadId: string;
        status:
          | "idle"
          | "pending"
          | "running"
          | "waiting"
          | "completed"
          | "failed"
          | "cancelled"
          | "interrupted";
        text: string | null;
        textTruncated: boolean;
        title: string | null;
        type: string;
        updatedAt: string;
        visibility: "local" | "inherited" | "synthetic";
        [key: string]: unknown;
      }>;
      nextPosition: number | null;
      recentRuns: Array<{
        completedAt: string | null;
        model: string;
        ordinal: number;
        providerInstanceId: string;
        requestedAt: string;
        runId: string;
        startedAt: string | null;
        status:
          | "preparing"
          | "queued"
          | "starting"
          | "running"
          | "waiting"
          | "completed"
          | "interrupted"
          | "failed"
          | "cancelled"
          | "rolled_back";
        [key: string]: unknown;
      }>;
      thread: {
        activeRunId: string | null;
        archived: boolean;
        branch: string | null;
        createdAt: string;
        createdBy: "user" | "agent" | "system";
        creationSource: "web" | "mobile" | "mcp" | "provider" | "server";
        interactionMode: "default" | "plan";
        itemCount: number;
        latestRunId: string | null;
        linkedPullRequest: {
          number: number;
          projectId: string;
          repository: string;
          url: string;
          [key: string]: unknown;
        } | null;
        model: string;
        parentThreadId: string | null;
        pendingRequestCount: number;
        projectId: string;
        providerInstanceId: string;
        relationshipToParent: "fork" | "subagent" | null;
        runCount: number;
        runtimeMode:
          | "approval-required"
          | "auto-accept-edits"
          | "auto"
          | "full-access";
        settled: boolean;
        settledAt: string | null;
        status:
          | "idle"
          | "preparing"
          | "queued"
          | "starting"
          | "running"
          | "waiting"
          | "completed"
          | "interrupted"
          | "failed"
          | "cancelled"
          | "rolled_back";
        threadId: string;
        title: string;
        titleRegeneration: {
          requestId: string;
          startedAt: string;
          [key: string]: unknown;
        } | null;
        updatedAt: string;
        worktreePath: string | null;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  };
  t3_thread_list: {
    input: {
      cursor?: number | null;
      includeSubagents?: boolean | null;
      limit?: number | null;
      projectId?: string | null;
      settled?: boolean | null;
      statuses?: Array<
        | "idle"
        | "preparing"
        | "queued"
        | "starting"
        | "running"
        | "waiting"
        | "completed"
        | "interrupted"
        | "failed"
        | "cancelled"
        | "rolled_back"
      > | null;
      titleContains?: string | null;
      [key: string]: unknown;
    };
    output: {
      currentThreadId: string | null;
      nextCursor: number | null;
      projectId: string;
      threads: Array<{
        createdAt: string;
        createdBy: "user" | "agent" | "system";
        creationSource: "web" | "mobile" | "mcp" | "provider" | "server";
        interactionMode: "default" | "plan";
        itemCount: number;
        latestRunId: string | null;
        linkedPullRequest: {
          number: number;
          projectId: string;
          repository: string;
          url: string;
          [key: string]: unknown;
        } | null;
        model: string;
        parentThreadId: string | null;
        providerInstanceId: string;
        relationshipToParent: "fork" | "subagent" | null;
        runtimeMode:
          | "approval-required"
          | "auto-accept-edits"
          | "auto"
          | "full-access";
        settled: boolean;
        settledAt: string | null;
        status:
          | "idle"
          | "preparing"
          | "queued"
          | "starting"
          | "running"
          | "waiting"
          | "completed"
          | "interrupted"
          | "failed"
          | "cancelled"
          | "rolled_back";
        threadId: string;
        title: string;
        updatedAt: string;
        [key: string]: unknown;
      }>;
      total: number;
      [key: string]: unknown;
    };
  };
  t3_queue_list: {
    input: {
      cursor?: number | null;
      limit?: number | null;
      threadId?: string | null;
      [key: string]: unknown;
    };
    output: {
      items: Array<{
        queuedRunId: string;
        text: string;
        truncated: boolean;
        [key: string]: unknown;
      }>;
      nextCursor: number | null;
      [key: string]: unknown;
    };
  };
  t3_queue_cancel: {
    input: {
      queuedRunId: string;
      threadId?: string | null;
      [key: string]: unknown;
    };
    output: { sequence: number; [key: string]: unknown };
  };
  t3_thread_interrupt: {
    input: {
      clientRequestId?: string | null;
      reason?: string | null;
      runId?: string | null;
      threadId: string;
      [key: string]: unknown;
    };
    output: {
      runId: string | null;
      status:
        | "interrupt_requested"
        | "no_active_run"
        | "completed"
        | "failed"
        | "cancelled"
        | "interrupted"
        | "rolled_back";
      threadId: string;
      [key: string]: unknown;
    };
  };
  t3_pending_request_list: {
    input: { threadId?: string | null; [key: string]: unknown };
    output: { requestIds: Array<string>; [key: string]: unknown };
  };
  t3_pending_request_read: {
    input: {
      requestId: string;
      threadId?: string | null;
      [key: string]: unknown;
    };
    output: {
      questions: Array<{
        allowCustomAnswer?: boolean | null;
        header: string;
        id: string;
        multiSelect?: boolean | null;
        options: Array<{
          description: string;
          label: string;
          value?: string | null;
          [key: string]: unknown;
        }>;
        question: string;
        required?: boolean | null;
        [key: string]: unknown;
      }>;
      requestId: string;
      [key: string]: unknown;
    };
  };
  t3_pending_request_respond: {
    input: {
      answers: { [key: string]: unknown };
      requestId: string;
      threadId?: string | null;
      [key: string]: unknown;
    };
    output: { sequence: number; [key: string]: unknown };
  };
  t3_thread_wait: {
    input: {
      runId?: string | null;
      threadId: string;
      timeoutMs?: number | "Infinity" | "-Infinity" | "NaN" | null;
      [key: string]: unknown;
    };
    output: {
      runId: string | null;
      status:
        | "idle"
        | "preparing"
        | "queued"
        | "starting"
        | "running"
        | "waiting"
        | "completed"
        | "interrupted"
        | "failed"
        | "cancelled"
        | "rolled_back";
      threadId: string;
      timedOut: boolean;
      [key: string]: unknown;
    };
  };
}
export type RuntimeMode =
  | "approval-required"
  | "auto-accept-edits"
  | "auto"
  | "full-access";
