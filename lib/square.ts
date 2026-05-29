import { Client, Environment } from "square";

export function getSquareClient(accessToken: string) {
  return new Client({
    accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === "production"
        ? Environment.Production
        : Environment.Sandbox,
  });
}

export function getSquareOAuthUrl(state: string) {
  const baseUrl =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

  const params = new URLSearchParams({
    client_id: process.env.SQUARE_APP_ID!,
    scope: "CUSTOMERS_READ MERCHANT_PROFILE_READ ORDERS_READ EMPLOYEES_READ PAYMENTS_READ",
    session: "false",
    state,
  });

  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeSquareCode(code: string): Promise<string> {
  const baseUrl =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

  const res = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": "2024-01-17" },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APP_ID,
      client_secret: process.env.SQUARE_APP_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/square/callback`,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(data.message || "OAuth failed");
  return data.access_token;
}
