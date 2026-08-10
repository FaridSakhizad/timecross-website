import {
  CONTACT_FORM_FROM_EMAIL,
  CONTACT_FORM_TO_EMAIL,
  SITE_NAME,
} from "../src/config";

type ContactRequest = {
  name: string;
  email: string;
  message: string;
};

type WorkerEnv = Env & {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, { status });
}

function isContactRequest(value: unknown): value is ContactRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.name === "string" &&
    typeof data.email === "string" &&
    typeof data.message === "string"
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function serializeForLog(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function isSpaNavigationRequest(request: Request, url: URL) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (url.pathname.includes(".")) {
    return false;
  }

  return request.headers.get("accept")?.includes("text/html") ?? false;
}

async function serveStaticAsset(request: Request, env: WorkerEnv, url: URL) {
  if (!env.ASSETS) {
    return new Response("Not Found", { status: 404 });
  }

  const assetResponse = await env.ASSETS.fetch(request);

  if (assetResponse.status !== 404 || !isSpaNavigationRequest(request, url)) {
    return assetResponse;
  }

  const indexUrl = new URL("/index.html", url);
  const indexRequest = new Request(indexUrl, request);

  return env.ASSETS.fetch(indexRequest);
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/api/contact") {
      if (url.pathname.startsWith("/api/")) {
        return new Response("Not Found", { status: 404 });
      }

      return serveStaticAsset(request, env, url);
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { ok: false, error: "Method not allowed" },
        405,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { ok: false, error: "Invalid JSON" },
        400,
      );
    }

    if (!isContactRequest(body)) {
      return jsonResponse(
        { ok: false, error: "Invalid request body" },
        400,
      );
    }

    const name = body.name.trim();
    const email = body.email.trim();
    const message = body.message.trim();

    if (!name || !email || !message) {
      return jsonResponse(
        { ok: false, error: "All fields are required" },
        400,
      );
    }

    if (name.length > 100) {
      return jsonResponse(
        { ok: false, error: "Name is too long" },
        400,
      );
    }

    if (!isValidEmail(email) || email.length > 254) {
      return jsonResponse(
        { ok: false, error: "Invalid email address" },
        400,
      );
    }

    if (message.length > 5000) {
      return jsonResponse(
        { ok: false, error: "Message is too long" },
        400,
      );
    }

    try {
      const result = await env.CONTACT_EMAIL.send({
        to: CONTACT_FORM_TO_EMAIL,
        from: {
          email: CONTACT_FORM_FROM_EMAIL,
          name: `${SITE_NAME} Contact Form`,
        },
        replyTo: {
          email,
          name,
        },
        subject: `${SITE_NAME} contact form: ${name}`,
        text: [
          `New message from the ${SITE_NAME} website`,
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          "",
          "Message:",
          message,
        ].join("\n"),
      });

      const emailResult = serializeForLog(result);

      console.log("Contact email sent:", {
        to: CONTACT_FORM_TO_EMAIL,
        from: CONTACT_FORM_FROM_EMAIL,
        messageId: result.messageId,
        result: emailResult,
      });

      return jsonResponse({
        ok: true,
        messageId: result.messageId,
        emailResult,
      });
    } catch (error) {
      console.error("Contact email failed:", error);

      return jsonResponse(
        {
          ok: false,
          error: "Unable to send message",
        },
        500,
      );
    }
  },
} satisfies ExportedHandler<Env>;
