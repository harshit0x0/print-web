const store = new Map<string, { data: ArrayBuffer; contentType: string }>();

export async function putUpload(filename: string, data: ArrayBuffer | Uint8Array, contentType: string): Promise<string> {
  store.set(filename, { data: data as ArrayBuffer, contentType });
  return `/api/uploads/${filename}`;
}

export async function getUpload(filename: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  return store.get(filename) ?? null;
}

export async function deleteUpload(filename: string): Promise<void> {
  store.delete(filename);
}

export async function readUploadAsBase64DataUrl(filename: string): Promise<string | null> {
  const entry = store.get(filename);
  if (!entry) return null;
  const buf = Buffer.from(entry.data);
  return `data:${entry.contentType};base64,${buf.toString("base64")}`;
}
