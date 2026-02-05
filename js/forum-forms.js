import { createAttachmentPreview, handleDropImages, handlePasteImages, getSelectedImages, isImageFile, MAX_IMAGES } from "./utils.js";
import { uploadFile } from "./storage.js";
import { apiPostComment } from "./forum-api.js";

export function setupPostForm(
  postUser, postFile, postText, postButton, 
  commentsRef, currentUserId, 
  onPostSuccess, showNotice
) {
  let isPostingInProgress = false;
  let lastPostTime = 0;
  let postAccumulatedFiles = [];
  let postPreview = null;
  const POST_COOLDOWN_MS = 2000;
  const MAX_POST_LENGTH = 10000;

  if (postUser) {
    postUser.value = localStorage.getItem("forum_username") || "";
    postUser.addEventListener("input", () => {
      localStorage.setItem("forum_username", postUser.value.trim());
    });
  }

  const updatePreview = (input, preview) => {
    if (!preview || !input) return;
    const files = Array.from(input.files || []);
    preview.innerHTML = "";
    
    if (!files.length) {
      preview.hidden = true;
      return;
    }

    const list = document.createElement("div");
    list.className = "attachment-preview-list";
    
    files.forEach((f, i) => {
      const item = document.createElement("div");
      item.className = "attachment-preview-item";
      
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Delete";
      btn.onclick = () => {
        const dt = new DataTransfer();
        files.forEach((file, idx) => idx !== i && dt.items.add(file));
        input.files = dt.files;
        postAccumulatedFiles = Array.from(input.files);
        updatePreview(input, preview);
      };
      
      const name = document.createElement("span");
      name.textContent = f.name;
      
      item.append(btn, name);
      list.appendChild(item);
    });

    preview.appendChild(list);
    preview.hidden = false;
  };

  if (postFile) {
    postPreview = createAttachmentPreview(postFile);
    postFile.addEventListener("change", () => {
      postAccumulatedFiles = [...postAccumulatedFiles, ...Array.from(postFile.files || [])]
        .filter(isImageFile)
        .slice(0, MAX_IMAGES);
      
      if (postAccumulatedFiles.length >= MAX_IMAGES) {
        showNotice(`Max ${MAX_IMAGES} images allowed`);
      }
      
      const dt = new DataTransfer();
      postAccumulatedFiles.forEach(f => dt.items.add(f));
      postFile.files = dt.files;
      
      updatePreview(postFile, postPreview);
    });
  }

  const postForm = document.getElementById("post-form");
  if (postForm) {
    postForm.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });
    postForm.addEventListener("drop", e => {
      handleDropImages(e, postFile, postPreview, showNotice, () => updatePreview(postFile, postPreview));
    });
  }

  postText?.addEventListener("paste", e => {
    handlePasteImages(e, postFile, postPreview, showNotice, () => updatePreview(postFile, postPreview));
  });

  const submitPost = async () => {
    if (isPostingInProgress) return;

    const timeSince = Date.now() - lastPostTime;
    if (timeSince < POST_COOLDOWN_MS) {
      showNotice(`Please wait ${Math.ceil((POST_COOLDOWN_MS - timeSince) / 1000)}s...`);
      return;
    }

    const selection = getSelectedImages(postFile);
    if (selection.error) {
      showNotice(selection.error);
      return;
    }

    const content = postText?.value.trim() || "";
    if (!content && !selection.files.length) return;

    if (content.length > MAX_POST_LENGTH) {
      showNotice(`Post too long (max ${MAX_POST_LENGTH} chars)`);
      return;
    }

    isPostingInProgress = true;
    postButton.disabled = true;

    try {
      const media = selection.files.length
        ? await Promise.all(selection.files.map(uploadFile))
        : null;

      await apiPostComment(
        commentsRef, 
        postUser?.value.trim() || "Anonymous", 
        content,
        media,
        currentUserId
      );

      lastPostTime = Date.now();
      if (postText) postText.value = "";
      if (postFile) postFile.value = "";
      postAccumulatedFiles = [];
      updatePreview(postFile, postPreview);
      onPostSuccess?.();
    } finally {
      isPostingInProgress = false;
      postButton.disabled = false;
    }
  };

  postButton?.addEventListener("click", submitPost);
}
