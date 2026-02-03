/**
 * Virtual Scrolling for Large Lists
 * Only renders visible items for massive performance gains
 */

export class VirtualScroller {
  constructor(container, options = {}) {
    this.container = container;
    this.items = [];
    this.itemHeight = options.itemHeight || 100;
    this.overscan = options.overscan || 3; // Extra items to render above/below
    this.renderItem = options.renderItem || (item => item.toString());
    
    this.scrollTop = 0;
    this.viewportHeight = 0;
    
    this.init();
  }
  
  init() {
    // Setup container styles
    Object.assign(this.container.style, {
      position: 'relative',
      overflow: 'auto',
      willChange: 'transform'
    });
    
    // Create viewport
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-viewport';
    this.container.appendChild(this.viewport);
    
    // Create spacer for scroll height
    this.spacer = document.createElement('div');
    this.spacer.className = 'virtual-spacer';
    this.viewport.appendChild(this.spacer);
    
    // Create content container
    this.content = document.createElement('div');
    this.content.className = 'virtual-content';
    Object.assign(this.content.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      willChange: 'transform'
    });
    this.viewport.appendChild(this.content);
    
    // Throttled scroll handler
    let ticking = false;
    this.container.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    
    // Resize observer
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
    
    this.handleResize();
  }
  
  setItems(items) {
    this.items = items;
    this.spacer.style.height = `${items.length * this.itemHeight}px`;
    this.render();
  }
  
  handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.render();
  }
  
  handleResize() {
    this.viewportHeight = this.container.clientHeight;
    this.render();
  }
  
  render() {
    const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.overscan);
    const endIndex = Math.min(
      this.items.length,
      Math.ceil((this.scrollTop + this.viewportHeight) / this.itemHeight) + this.overscan
    );
    
    // Transform content to show visible items
    this.content.style.transform = `translateY(${startIndex * this.itemHeight}px)`;
    
    // Render only visible items
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const item = this.items[i];
      const element = this.renderItem(item, i);
      if (element) {
        element.style.height = `${this.itemHeight}px`;
        element.dataset.index = i;
        fragment.appendChild(element);
      }
    }
    
    this.content.innerHTML = '';
    this.content.appendChild(fragment);
  }
  
  scrollToIndex(index, behavior = 'smooth') {
    const top = index * this.itemHeight;
    this.container.scrollTo({ top, behavior });
  }
  
  destroy() {
    this.resizeObserver?.disconnect();
    this.container.innerHTML = '';
  }
}

/**
 * Simple virtual list for smaller datasets
 * Uses IntersectionObserver instead of scroll events
 */
export class LazyList {
  constructor(container, options = {}) {
    this.container = container;
    this.batchSize = options.batchSize || 10;
    this.renderItem = options.renderItem;
    this.items = [];
    this.renderedCount = 0;
    
    this.sentinel = document.createElement('div');
    this.sentinel.className = 'lazy-list-sentinel';
    this.sentinel.style.height = '1px';
    
    this.observer = new IntersectionObserver(
      entries => entries[0].isIntersecting && this.loadMore(),
      { rootMargin: '100px' }
    );
  }
  
  setItems(items) {
    this.items = items;
    this.renderedCount = 0;
    this.container.innerHTML = '';
    this.container.appendChild(this.sentinel);
    this.observer.observe(this.sentinel);
    this.loadMore();
  }
  
  loadMore() {
    const start = this.renderedCount;
    const end = Math.min(start + this.batchSize, this.items.length);
    
    if (start >= end) {
      this.observer.disconnect();
      return;
    }
    
    const fragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const element = this.renderItem(this.items[i], i);
      if (element) fragment.appendChild(element);
    }
    
    this.sentinel.before(fragment);
    this.renderedCount = end;
  }
  
  destroy() {
    this.observer.disconnect();
  }
}
