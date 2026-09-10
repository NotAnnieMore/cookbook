import "server-only";

import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";

import { isPublicIpAddress, parsePublicHttpUrl, SafeUrlError } from "./url-safety";

const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 10_000;

export { parsePublicHttpUrl, SafeUrlError } from "./url-safety";

async function pinnedAddress(url: URL) {
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dnsLookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new SafeUrlError("DNS_FAILED", "Não foi possível encontrar esse website.");
  }
  if (!addresses.length || addresses.some((entry) => !isPublicIpAddress(entry.address))) {
    throw new SafeUrlError("PRIVATE_ADDRESS", "O endereço aponta para uma rede privada ou reservada.");
  }
  return addresses[0];
}

function decodeBody(buffer: Buffer, contentType: string) {
  const charset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]?.toLocaleLowerCase("en-US");
  return charset === "iso-8859-1" || charset === "latin1"
    ? buffer.toString("latin1")
    : buffer.toString("utf8");
}

async function requestPage(url: URL, redirectCount: number): Promise<{ html: string; finalUrl: string; contentType: string }> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new SafeUrlError("TOO_MANY_REDIRECTS", "O website fez demasiados redirecionamentos.");
  }

  const address = await pinnedAddress(url);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        family: address.family,
        lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
        headers: {
          Accept: "text/html,application/xhtml+xml,application/json,text/plain;q=0.8",
          "Accept-Encoding": "identity",
          "User-Agent": "CookbookRecipeImporter/1.0 (+private recipe collection)",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume();
          let nextUrl: URL;
          try {
            nextUrl = parsePublicHttpUrl(new URL(location, url).toString());
          } catch (error) {
            reject(error);
            return;
          }
          void requestPage(nextUrl, redirectCount + 1).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(new SafeUrlError("HTTP_ERROR", `O website respondeu com o estado ${status || "desconhecido"}.`));
          return;
        }

        const contentType = String(response.headers["content-type"] ?? "").toLocaleLowerCase("en-US");
        if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml") && !contentType.includes("application/json") && !contentType.includes("text/plain")) {
          response.resume();
          reject(new SafeUrlError("UNSUPPORTED_CONTENT", "O endereço não aponta para uma página de texto ou HTML."));
          return;
        }
        const declaredLength = Number(response.headers["content-length"] ?? 0);
        if (declaredLength > MAX_RESPONSE_BYTES) {
          response.resume();
          reject(new SafeUrlError("PAGE_TOO_LARGE", "A página é demasiado grande para importar com segurança."));
          return;
        }

        const chunks: Buffer[] = [];
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) {
            response.destroy(new SafeUrlError("PAGE_TOO_LARGE", "A página é demasiado grande para importar com segurança."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", (error) => {
          reject(error instanceof SafeUrlError ? error : new SafeUrlError("FETCH_FAILED", "A ligação ao website foi interrompida."));
        });
        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve({ html: decodeBody(buffer, contentType), finalUrl: url.toString(), contentType });
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new SafeUrlError("TIMEOUT", "O website demorou demasiado tempo a responder."));
    });
    request.on("error", (error) => {
      reject(error instanceof SafeUrlError ? error : new SafeUrlError("FETCH_FAILED", "Não foi possível ler esse website."));
    });
    request.end();
  });
}

export async function fetchPublicRecipePage(input: string) {
  const url = parsePublicHttpUrl(input);
  return requestPage(url, 0);
}
