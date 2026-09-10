import net from "node:net";

export class SafeUrlError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "SafeUrlError";
  }
}

function blockedIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function isPublicIpAddress(address: string) {
  const family = net.isIP(address);
  if (family === 4) return !blockedIpv4(address);
  if (family !== 6) return false;

  const normalized = address.toLocaleLowerCase("en-US").split("%")[0];
  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return !blockedIpv4(mappedIpv4);

  return !(
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

export function parsePublicHttpUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SafeUrlError("INVALID_URL", "O endereço não parece ser um URL válido.");
  }

  if (!(["http:", "https:"] as string[]).includes(url.protocol)) {
    throw new SafeUrlError("INVALID_PROTOCOL", "Usa um endereço que comece por http:// ou https://.");
  }
  if (url.username || url.password) {
    throw new SafeUrlError("URL_CREDENTIALS", "O endereço não pode incluir utilizador ou palavra-passe.");
  }
  if (url.port && !(["80", "443"] as string[]).includes(url.port)) {
    throw new SafeUrlError("UNSAFE_PORT", "Por segurança, apenas são aceites os portos normais de websites.");
  }
  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new SafeUrlError("LOCAL_ADDRESS", "Esse endereço não é um website público.");
  }
  if (net.isIP(hostname) && !isPublicIpAddress(hostname)) {
    throw new SafeUrlError("PRIVATE_ADDRESS", "Esse endereço pertence a uma rede privada ou reservada.");
  }
  url.hash = "";
  return url;
}
