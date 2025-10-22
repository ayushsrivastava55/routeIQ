export type MCPClientHandle = {
  listTools: () => Promise<{ name: string; description?: string }[]>;
  callTool: (name: string, args: any) => Promise<any>;
  close: () => Promise<void>;
};

export async function connectMCP(mcpUrl: string): Promise<MCPClientHandle> {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
  
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
  const client = new Client({ name: "routeiq-mcp-client", version: "1.0.0" });
  await client.connect(transport);
  return {
    listTools: async () => {
      const res = await client.listTools();
      return (res.tools || []).map((t: any) => ({ name: t.name, description: t.description }));
    },
    callTool: async (name: string, args: any) => client.callTool({ name, arguments: args }),
    close: async () => client.close(),
  };
}
