document.addEventListener('DOMContentLoaded', function () {
  const posts = Array.from(document.querySelectorAll('.post'));
  const filterSelect = document.getElementById('filter');
  let sortedPosts = [...posts];

  function sortPosts(order) {
    sortedPosts.sort((a, b) => {
      const dateA = new Date(a.querySelector('strong').textContent);
      const dateB = new Date(b.querySelector('strong').textContent);
      return order === 'new' ? dateB - dateA : dateA - dateB;
    });

    const postsContainer = document.getElementById('posts');
    postsContainer.innerHTML = '';
    sortedPosts.forEach(post => postsContainer.appendChild(post));
  }

  filterSelect.addEventListener('change', () => {
    sortPosts(filterSelect.value);
  });

  // Initial sort on page load
  sortPosts(filterSelect.value);
});
