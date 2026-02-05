import { createAttachmentPreview, handleDropImages, handlePasteImages, getSelectedImages, isImageFile, MAX_IMAGES } from "./utils.js";
import { uploadFile } from "./storage.js";
import { apiPostComment } from "./forum-api.js";

export function setupPostForm(
  postUser, postFile, postText, postButton, 
  commentsRef, currentUserId, 
  onPostSuccess, showNotice, onOptimisticAdd
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
      // Optimistic Reset - Clear form immediately to make it feel instant
      const content = postText?.value.trim() || "";
      const savedUser = postUser?.value.trim();
      const tempMediaCount = selection.files.length;
      
      const filesForOptimistic = [...selection.files];

      // Clear immediately
      if (postText) postText.value = "";
      if (postFile) postFile.value = "";
      postAccumulatedFiles = [];
      updatePreview(postFile, postPreview);
      
      // OPTIMISTIC UI: Show it now!
      if (onOptimisticAdd) {
        const optimisticComment = {
            id: "temp-" + Date.now(),
            user: savedUser || "Anonymous",
            text: content,
            // Create object URLs for images for immediate display
            media: filesForOptimistic.map(f => ({ 
                type: f.type.startsWith('video') ? 'video' : 'image', 
                url: URL.createObjectURL(f) 
            })),
            userId: currentUserId,
            createdAt: { seconds: Date.now() / 1000 },
        };
        onOptimisticAdd(optimisticComment);
      }
      
      // Visual feedback
      if (postButton) {
        postButton.disabled = true;
        postButton.textContent = "Posting...";
      }

      // Do the actual heavy lifting
      const media = tempMediaCount
        ? await Promise.all(selection.files.map(uploadFile))
        : null;

      await apiPostComment(
        commentsRef, 
        savedUser || "Anonymous", 
        content,
        media,
        currentUserId
      );

      lastPostTime = Date.now();
      onPostSuccess?.();
    } catch (err) {
       // Revert on failure (or show detailed error)
       console.error("Post failed", err);
       showNotice("Failed to post. Please try again.");
    } finally {
      isPostingInProgress = false;
      if (postButton) {
        postButton.disabled = false;
        postButton.textContent = "Post";
      }
    }
  };

  postButton?.addEventListener("click", submitPost);
}
