// utils/imageCache.ts
const CACHE_NAME = 'unera-images-v1';
const CACHE_DURATION = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

export const imageCache = {
  // Save image to cache
  async save(url: string, response: Response) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, response);
      console.log('✅ Image cached:', url);
    } catch (error) {
      console.error('Failed to cache image:', error);
    }
  },

  // Get image from cache
  async get(url: string): Promise<Response | undefined> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      
      if (response) {
        console.log('✅ Image from cache:', url);
        return response;
      }
      return undefined;
    } catch (error) {
      console.error('Failed to get image from cache:', error);
      return undefined;
    }
  },

  // Preload and cache image
  async preload(url: string): Promise<void> {
    try {
      // Check if already cached
      const cached = await this.get(url);
      if (cached) return;

      // Download and cache
      const response = await fetch(url, {
        mode: 'cors',
        cache: 'force-cache'
      });
      
      if (response.ok) {
        await this.save(url, response.clone());
      }
    } catch (error) {
      console.error('Failed to preload image:', error);
    }
  },

  // Clear old cache
  async clearOld() {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      const dateHeader = response?.headers.get('date');
      
      if (dateHeader) {
        const cacheDate = new Date(dateHeader).getTime();
        if (Date.now() - cacheDate > CACHE_DURATION) {
          await cache.delete(request);
          console.log('🗑️ Removed old cache:', request.url);
        }
      }
    }
  }
};
