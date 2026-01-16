postButton.addEventListener("click", async (e) => {
  e.preventDefault();

  console.log("post clicked");

  const text = textInput.value.trim();
  const user = userInput.value.trim() || "Anonymous";

  if (!text) return;

  try {
    await addDoc(commentsRef, {
      user,
      text,
      media: null,
      replyTo: null,
      createdAt: Date.now()
    });

    textInput.value = "";
    console.log("post success");

    if (window.reloadForum) window.reloadForum();
  } catch (err) {
    console.error("Post failed:", err);
  }
});
