import { Buffer } from "node:buffer";
import { Socket } from "node:net";
import * as os from "node:os";
import * as tls from "node:tls";
import { TLSSocket } from "node:tls";
import {
  isSmtpAuthConfigured,
  type SmtpSettings,
  validateSmtpConnectionSettings,
} from "@/lib/smtp-settings";

const SOCKET_TIMEOUT_MS = 15000;

type SmtpResponse = {
  code: number;
  lines: string[];
};

type SmtpSession = {
  connection: SmtpConnection;
  capabilities: string[];
  usedTls: boolean;
};

class SmtpConnection {
  private buffer = "";
  private lines: string[] = [];
  private waiters: Array<(line: string) => void> = [];

  constructor(private socket: Socket | TLSSocket) {
    this.attachSocket(socket);
  }

  setSocket(socket: Socket | TLSSocket) {
    this.socket.removeAllListeners("data");
    this.socket = socket;
    this.attachSocket(socket);
  }

  private attachSocket(socket: Socket | TLSSocket) {
    socket.setEncoding("utf8");
    socket.setTimeout(SOCKET_TIMEOUT_MS, () => {
      socket.destroy(new Error("SMTP connection timed out."));
    });
    socket.on("data", (chunk: string) => {
      this.buffer += chunk;
      this.flushBuffer();
    });
  }

  private flushBuffer() {
    let newlineIndex = this.buffer.indexOf("\r\n");

    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 2);

      const nextWaiter = this.waiters.shift();
      if (nextWaiter) {
        nextWaiter(line);
      } else {
        this.lines.push(line);
      }

      newlineIndex = this.buffer.indexOf("\r\n");
    }
  }

  private async readLine() {
    if (this.lines.length > 0) {
      return this.lines.shift() as string;
    }

    return await new Promise<string>((resolve, reject) => {
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const handleClose = () => {
        cleanup();
        reject(new Error("SMTP connection closed unexpectedly."));
      };
      const cleanup = () => {
        this.socket.off("error", handleError);
        this.socket.off("close", handleClose);
      };

      this.socket.once("error", handleError);
      this.socket.once("close", handleClose);
      this.waiters.push((line) => {
        cleanup();
        resolve(line);
      });
    });
  }

  async readResponse(): Promise<SmtpResponse> {
    const lines: string[] = [];

    while (true) {
      const line = await this.readLine();
      lines.push(line);

      if (/^\d{3}\s/.test(line)) {
        break;
      }

      if (!/^\d{3}-/.test(line)) {
        break;
      }
    }

    const code = Number.parseInt(lines[0]?.slice(0, 3) || "0", 10);

    if (!Number.isFinite(code)) {
      throw new Error(`Unexpected SMTP response: ${lines.join("\n")}`);
    }

    return { code, lines };
  }

  send(command: string) {
    this.socket.write(`${command}\r\n`);
  }

  writeRaw(payload: string) {
    this.socket.write(payload);
  }

  close() {
    this.socket.end();
    this.socket.destroySoon?.();
  }
}

function getResponseText(response: SmtpResponse) {
  return response.lines.map((line) => line.slice(4).trim()).join(" ");
}

function assertResponseCode(response: SmtpResponse, expectedCodes: number[], action: string) {
  if (!expectedCodes.includes(response.code)) {
    throw new Error(
      `${action} failed: ${getResponseText(response) || "Unexpected SMTP response."}`,
    );
  }
}

function parseEhloCapabilities(response: SmtpResponse) {
  return response.lines.map((line) => line.slice(4).trim().toUpperCase()).filter(Boolean);
}

function connectPlain(host: string, port: number) {
  return new Promise<Socket>((resolve, reject) => {
    const socket = new Socket();
    const cleanup = () => {
      socket.off("error", handleError);
      socket.off("connect", handleConnect);
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const handleConnect = () => {
      cleanup();
      resolve(socket);
    };

    socket.once("error", handleError);
    socket.once("connect", handleConnect);
    socket.connect(port, host);
  });
}

function connectSecure(host: string, port: number) {
  return new Promise<TLSSocket>((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: true,
    });

    const cleanup = () => {
      socket.off("error", handleError);
      socket.off("secureConnect", handleSecureConnect);
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const handleSecureConnect = () => {
      cleanup();
      resolve(socket);
    };

    socket.once("error", handleError);
    socket.once("secureConnect", handleSecureConnect);
  });
}

function upgradeToTls(socket: Socket, host: string) {
  return new Promise<TLSSocket>((resolve, reject) => {
    const secureSocket = tls.connect({
      socket,
      servername: host,
      rejectUnauthorized: true,
    });

    const cleanup = () => {
      secureSocket.off("error", handleError);
      secureSocket.off("secureConnect", handleSecureConnect);
    };
    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const handleSecureConnect = () => {
      cleanup();
      resolve(secureSocket);
    };

    secureSocket.once("error", handleError);
    secureSocket.once("secureConnect", handleSecureConnect);
  });
}

async function runEhlo(connection: SmtpConnection) {
  connection.send(`EHLO ${os.hostname() || "localhost"}`);
  const response = await connection.readResponse();
  assertResponseCode(response, [250], "SMTP EHLO");
  return parseEhloCapabilities(response);
}

async function authenticate(
  connection: SmtpConnection,
  capabilities: string[],
  settings: SmtpSettings,
) {
  if (!isSmtpAuthConfigured(settings)) {
    return;
  }

  const authCapability = capabilities.find((item) => item.startsWith("AUTH "));
  if (!authCapability) {
    throw new Error("SMTP server does not advertise authentication support.");
  }

  const methods = authCapability.replace(/^AUTH\s+/, "").split(/\s+/).filter(Boolean);

  if (methods.includes("PLAIN")) {
    const payload = Buffer.from(
      `\0${settings.username}\0${settings.password}`,
      "utf8",
    ).toString("base64");
    connection.send(`AUTH PLAIN ${payload}`);
    const response = await connection.readResponse();
    assertResponseCode(response, [235], "SMTP authentication");
    return;
  }

  if (methods.includes("LOGIN")) {
    connection.send("AUTH LOGIN");
    const userPrompt = await connection.readResponse();
    assertResponseCode(userPrompt, [334], "SMTP authentication");

    connection.send(Buffer.from(settings.username, "utf8").toString("base64"));
    const passwordPrompt = await connection.readResponse();
    assertResponseCode(passwordPrompt, [334], "SMTP username");

    connection.send(Buffer.from(settings.password, "utf8").toString("base64"));
    const authResponse = await connection.readResponse();
    assertResponseCode(authResponse, [235], "SMTP password");
    return;
  }

  throw new Error(`SMTP server requires an unsupported auth method: ${methods.join(", ")}`);
}

async function openSmtpSession(settings: SmtpSettings): Promise<SmtpSession> {
  validateSmtpConnectionSettings(settings);

  const initialSocket = settings.secure
    ? await connectSecure(settings.host, settings.port)
    : await connectPlain(settings.host, settings.port);
  const connection = new SmtpConnection(initialSocket);

  const greeting = await connection.readResponse();
  assertResponseCode(greeting, [220], "SMTP greeting");

  let capabilities = await runEhlo(connection);
  let usedTls = settings.secure;

  if (!settings.secure && capabilities.some((item) => item.startsWith("STARTTLS"))) {
    connection.send("STARTTLS");
    const startTlsResponse = await connection.readResponse();
    assertResponseCode(startTlsResponse, [220], "STARTTLS");

    const tlsSocket = await upgradeToTls(initialSocket, settings.host);
    connection.setSocket(tlsSocket);
    capabilities = await runEhlo(connection);
    usedTls = true;
  }

  await authenticate(connection, capabilities, settings);

  return { connection, capabilities, usedTls };
}

function escapeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeMailbox(name: string | null, email: string) {
  const safeEmail = escapeHeaderValue(email);
  const safeName = name ? escapeHeaderValue(name) : "";

  if (!safeName) {
    return safeEmail;
  }

  return `"${safeName.replace(/"/g, '\\"')}" <${safeEmail}>`;
}

function normalizeSmtpMessageBody(body: string) {
  return body
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function resolveRecipientEmail(settings: SmtpSettings) {
  if (settings.fromEmail) {
    return settings.fromEmail;
  }

  if (settings.username.includes("@")) {
    return settings.username;
  }

  throw new Error("SMTP from email is required before public contact forms can send mail.");
}

export async function verifySmtpConnection(settings: SmtpSettings) {
  let session: SmtpSession | null = null;

  try {
    session = await openSmtpSession(settings);

    session.connection.send("QUIT");
    await session.connection.readResponse().catch(() => null);

    return {
      ok: true as const,
      message: `Connected to ${settings.host}:${settings.port}${settings.secure ? " over TLS" : ""}.`,
      usedTls: session.usedTls,
      authenticated: isSmtpAuthConfigured(settings),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SMTP connection test failed.";
    throw new Error(message);
  } finally {
    session?.connection.close();
  }
}

export async function sendSmtpMail({
  settings,
  subject,
  text,
  to,
  replyTo,
}: {
  settings: SmtpSettings;
  subject: string;
  text: string;
  to?: { email: string; name?: string | null } | null;
  replyTo?: { email: string; name?: string | null } | null;
}) {
  let session: SmtpSession | null = null;

  try {
    const recipientEmail = to?.email?.trim() || resolveRecipientEmail(settings);
    const recipientName = to?.name?.trim() || settings.fromName || null;
    const senderEmail = settings.fromEmail || resolveRecipientEmail(settings);
    session = await openSmtpSession(settings);

    session.connection.send(`MAIL FROM:<${senderEmail}>`);
    assertResponseCode(await session.connection.readResponse(), [250], "MAIL FROM");

    session.connection.send(`RCPT TO:<${recipientEmail}>`);
    assertResponseCode(await session.connection.readResponse(), [250, 251], "RCPT TO");

    session.connection.send("DATA");
    assertResponseCode(await session.connection.readResponse(), [354], "DATA");

    const headers = [
      `From: ${encodeMailbox(settings.fromName || null, senderEmail)}`,
      `To: ${encodeMailbox(recipientName, recipientEmail)}`,
      `Subject: ${escapeHeaderValue(subject)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
    ];

    if (replyTo?.email) {
      headers.push(`Reply-To: ${encodeMailbox(replyTo.name || null, replyTo.email)}`);
    }

    const payload = `${headers.join("\r\n")}\r\n\r\n${normalizeSmtpMessageBody(text)}\r\n.\r\n`;
    session.connection.writeRaw(payload);
    assertResponseCode(await session.connection.readResponse(), [250], "message delivery");

    session.connection.send("QUIT");
    await session.connection.readResponse().catch(() => null);

    return {
      ok: true as const,
      recipientEmail,
      usedTls: session.usedTls,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP delivery failed.";
    throw new Error(message);
  } finally {
    session?.connection.close();
  }
}
