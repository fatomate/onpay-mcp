/**
 * Minimal client for the OnPay API v1.
 * Docs: https://onpaysb.github.io/docs/developer/api-v1.html
 *
 * Base URL: https://{account}.onpay.my/api/v1/
 * Auth: every request carries a `token` query parameter.
 */

export interface OnPayConfig {
  /**
   * Account subdomain, e.g. "acme" for https://acme.onpay.my.
   * Ignored if `baseUrl` is provided.
   */
  account?: string;
  /**
   * Full API base URL, e.g. "https://iman.care/api/v1".
   * Use this for accounts on a custom domain. Takes precedence over `account`.
   */
  baseUrl?: string;
  /** API token from Tetapan > Sistem > API & Webhook */
  token: string;
}

export class OnPayError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "OnPayError";
  }
}

export class OnPayClient {
  private readonly baseUrl: string;

  constructor(private readonly config: OnPayConfig) {
    if (!config.token) throw new Error("OnPay token is required");
    if (config.baseUrl) {
      // Accept a full URL (custom domain), with or without trailing slash.
      this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    } else if (config.account) {
      this.baseUrl = `https://${config.account}.onpay.my/api/v1`;
    } else {
      throw new Error("Provide either OnPay `account` (subdomain) or `baseUrl`");
    }
  }

  private buildUrl(path: string, params: Record<string, unknown> = {}): string {
    const url = new URL(`${this.baseUrl}/${path}`);
    url.searchParams.set("token", this.config.token);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    const url = this.buildUrl(path, params);
    let res: Response;
    try {
      res = await fetch(url, { method });
    } catch (err) {
      throw new OnPayError(
        `Network error calling ${path}: ${(err as Error).message}`,
      );
    }

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new OnPayError(
        `Non-JSON response from ${path} (HTTP ${res.status})`,
        res.status,
        text,
      );
    }

    if (!res.ok) {
      throw new OnPayError(`OnPay API error on ${path}`, res.status, json);
    }

    // The API signals success with an `ok` boolean.
    if (json && typeof json === "object" && (json as any).ok === false) {
      throw new OnPayError(`OnPay API returned ok=false on ${path}`, res.status, json);
    }

    return json;
  }

  /** GET /sales.list — paginated list of sale records. */
  salesList(params: {
    page?: number;
    per_page?: number;
    ids?: string;
    filter_column?: string;
    filter_value?: string;
    sort_column?: string;
    sort_dir?: "asc" | "desc";
  }): Promise<unknown> {
    return this.request("GET", "sales.list", params);
  }

  /** GET /sales.get — a single sale record by id. */
  salesGet(id: string): Promise<unknown> {
    return this.request("GET", "sales.get", { id });
  }

  /** POST /sales.update_shipping_info — set courier + tracking code. */
  salesUpdateShippingInfo(params: {
    id: string;
    shipping_courier: string;
    shipping_tracking_code: string;
  }): Promise<unknown> {
    return this.request("POST", "sales.update_shipping_info", params);
  }
}
