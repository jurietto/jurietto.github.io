export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(
    "https://comments.jbanfieldca.workers.dev",
    {
      method: "POST",
      body: form
    }
  );

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  const data = await res.json();
  return data.url;
}
