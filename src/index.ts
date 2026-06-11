#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { OnPayClient, OnPayError } from "./onpay.js";

const account = process.env.ONPAY_ACCOUNT;
const baseUrl = process.env.ONPAY_BASE_URL;
const token = process.env.ONPAY_TOKEN;

if ((!account && !baseUrl) || !token) {
  console.error(
    "Missing config. Set ONPAY_TOKEN plus either ONPAY_ACCOUNT (your " +
      "subdomain, e.g. 'acme') or ONPAY_BASE_URL (custom domain, e.g. " +
      "'https://iman.care/api/v1') in the environment before starting.",
  );
  process.exit(1);
}

const client = new OnPayClient({ account, baseUrl, token });

const server = new McpServer({
  name: "onpay-mcp",
  version: "0.1.0",
});

/** Wrap a client call so errors come back as readable tool content. */
async function run(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  } catch (err) {
    const message =
      err instanceof OnPayError
        ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ""}\n${JSON.stringify(err.body, null, 2)}`
        : (err as Error).message;
    return {
      isError: true,
      content: [{ type: "text" as const, text: `OnPay request failed: ${message}` }],
    };
  }
}

server.tool(
  "sales_list",
  "List OnPay sale records (paginated, filterable, sortable).",
  {
    page: z.number().int().positive().optional().describe("Page number (default 1)"),
    per_page: z
      .number()
      .int()
      .positive()
      .max(100)
      .optional()
      .describe("Records per page (default 20, max 100)"),
    ids: z.string().optional().describe("Comma-separated sale IDs to fetch"),
    filter_column: z.string().optional().describe("Column to filter on"),
    filter_value: z.string().optional().describe("Value to match for filter_column"),
    sort_column: z.string().optional().describe("Column to sort by (default created_at)"),
    sort_dir: z.enum(["asc", "desc"]).optional().describe("Sort direction (default asc)"),
  },
  (args) => run(() => client.salesList(args)),
);

server.tool(
  "sales_get",
  "Get a single OnPay sale record by its ID.",
  {
    id: z.string().describe("The sale record ID"),
  },
  (args) => run(() => client.salesGet(args.id)),
);

server.tool(
  "sales_update_shipping_info",
  "Update the courier and tracking code for an OnPay sale.",
  {
    id: z.string().describe("The sale record ID"),
    shipping_courier: z.string().describe("Courier name, e.g. 'J&T', 'Pos Laju'"),
    shipping_tracking_code: z.string().describe("Tracking number from the courier"),
  },
  (args) => run(() => client.salesUpdateShippingInfo(args)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Logs go to stderr — stdout is reserved for the MCP protocol.
  console.error("onpay-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting onpay-mcp:", err);
  process.exit(1);
});
