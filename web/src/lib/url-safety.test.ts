import assert from "node:assert/strict";
import test from "node:test";

import { isPublicIpAddress, parsePublicHttpUrl, SafeUrlError } from "./url-safety.ts";

test("accepts ordinary public web addresses and removes fragments", () => {
  assert.equal(parsePublicHttpUrl("https://example.com/receita#ingredientes").toString(), "https://example.com/receita");
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
});

test("blocks local and reserved SSRF targets", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.1", "::1", "fd00::1", "2001:db8::1"]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
  assert.throws(() => parsePublicHttpUrl("http://localhost/admin"), SafeUrlError);
  assert.throws(() => parsePublicHttpUrl("http://192.168.1.20/recipe"), SafeUrlError);
  assert.throws(() => parsePublicHttpUrl("https://example.com:8443/recipe"), SafeUrlError);
  assert.throws(() => parsePublicHttpUrl("file:///etc/passwd"), SafeUrlError);
});
