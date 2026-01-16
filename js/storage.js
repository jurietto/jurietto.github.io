export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    "https://comments.jbanfieldca.workers.dev/upload",
    {
      method: "POST",
      body: formData
    }
  );

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  const json = await res.json();
  return json.url;
}
