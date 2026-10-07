import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { connectMcp } from "../../src/t3/client.ts";

test("standard MCP transport initializes, validates outputs and preserves stable send IDs across reconnect", async (t) => {
  const messages = new Map<
    string,
    {
      threadId: string;
      messageId: string;
      runId: string;
      status: "running";
      delivery: "started";
    }
  >();
  const http = createServer(async (request, response) => {
    if (request.headers.authorization !== "Bearer transport-test-only") {
      response.writeHead(401).end();
      return;
    }
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const server = new McpServer({ name: "controlled-t3", version: "1" });
    server.registerTool(
      "t3_project_list",
      {
        inputSchema: {},
        outputSchema: {
          projects: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              workspaceRoot: z.string(),
            }),
          ),
          nextCursor: z.null(),
        },
      },
      async () => ({
        content: [],
        structuredContent: {
          projects: [
            {
              id: "project",
              title: "Exact Title",
              workspaceRoot: "/disposable/repo",
            },
          ],
          nextCursor: null,
        },
      }),
    );
    server.registerTool(
      "t3_thread_send",
      {
        inputSchema: {
          threadId: z.string(),
          message: z.string(),
          clientRequestId: z.string(),
          mode: z.string().optional(),
        },
        outputSchema: {
          threadId: z.string(),
          messageId: z.string(),
          runId: z.string(),
          status: z.literal("running"),
          delivery: z.literal("started"),
        },
      },
      async (input) => {
        const key = `${input.threadId}:${input.clientRequestId}`;
        const output = messages.get(key) ?? {
          threadId: input.threadId,
          messageId: `message-${messages.size}`,
          runId: `run-${messages.size}`,
          status: "running" as const,
          delivery: "started" as const,
        };
        messages.set(key, output);
        return { content: [], structuredContent: output };
      },
    );
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    response.on("close", () => {
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(request, response);
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        http.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const address = http.address();
  assert.ok(address && typeof address === "object");
  const credential = {
    version: 1 as const,
    endpoint: `http://127.0.0.1:${address.port}/mcp`,
    token: "transport-test-only",
    sessionId: "controlled-session",
    expiresAt: Date.now() + 10000,
    scopes: ["orchestration:read" as const, "orchestration:operate" as const],
    runtimeMode: "full-access" as const,
  };
  const first = await connectMcp(credential);
  assert.equal(
    (await first.call("t3_project_list", {})).projects[0]?.title,
    "Exact Title",
  );
  const input = {
    threadId: "thread",
    message: "harmless task",
    clientRequestId: "persisted-key",
  };
  const accepted = await first.call("t3_thread_send", input);
  assert.deepEqual(await first.call("t3_thread_send", input), accepted);
  await first.close();
  const reconnected = await connectMcp(credential);
  try {
    assert.deepEqual(await reconnected.call("t3_thread_send", input), accepted);
  } finally {
    await reconnected.close();
  }
  assert.equal(messages.size, 1);
});
