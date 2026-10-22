export type BoundedBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 };

async function readBoundedText(request: Request, maxBytes: number): Promise<
  { ok: true; text: string } | { ok: false; status: 400 | 413 }
> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, status: 413 };
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400 };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, status: 400 };
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<BoundedBodyResult> {
  const text = await readBoundedText(request, maxBytes);
  if (!text.ok) return text;
  try {
    return { ok: true, value: JSON.parse(text.text) as unknown };
  } catch {
    return { ok: false, status: 400 };
  }
}

export async function readWebhookBody(
  request: Request,
  maxBytes = 1024 * 1024,
): Promise<{ ok: true; text: string } | { ok: false; status: 400 | 413 }> {
  return readBoundedText(request, maxBytes);
}
