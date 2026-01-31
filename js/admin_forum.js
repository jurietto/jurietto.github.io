function groupByThreadAndReplies(comments) {
  const threads = {};
  const map = {};

  // Map by ID
  comments.forEach(c => {
    const threadId = c.path.split("/")[1];
    if (!threads[threadId]) threads[threadId] = [];
    map[c.id] = { ...c, replies: [], latest: c.createdAt };
  });

  // Build tree and propagate latest reply time upward
  comments.forEach(c => {
    if (c.replyTo && map[c.replyTo]) {
      map[c.replyTo].replies.push(map[c.id]);
      // Update parent's latest if newer
      if (c.createdAt > map[c.replyTo].latest) {
        map[c.replyTo].latest = c.createdAt;
      }
    } else {
      const threadId = c.path.split("/")[1];
      threads[threadId].push(map[c.id]);
    }
  });

  // Sort top-level comments by latest reply time
  for (const threadId in threads) {
    threads[threadId].sort((a, b) => b.latest - a.latest);
  }

  return threads;
}
