import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const devPosts: any[] = [];

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (pathname === '/api/link-preview') {
          const targetUrl = url.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ success: false, error: 'URL required' }));
          }

          (async () => {
            try {
              let parsedUrl: URL;
              try {
                parsedUrl = new URL(targetUrl);
              } catch {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Invalid URL' }));
              }

              const domain = parsedUrl.hostname.replace('www.', '');

              if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
                let videoId = '';
                if (domain.includes('youtu.be')) {
                  videoId = parsedUrl.pathname.slice(1).split('/')[0];
                } else if (parsedUrl.searchParams.has('v')) {
                  videoId = parsedUrl.searchParams.get('v') || '';
                } else if (parsedUrl.pathname.includes('/shorts/')) {
                  videoId = parsedUrl.pathname.split('/shorts/')[1]?.split('/')[0] || '';
                }

                if (videoId) {
                  let ytTitle = 'YouTube Video';
                  let ytAuthor = 'YouTube';
                  try {
                    const ytRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`);
                    if (ytRes.ok) {
                      const ytData: any = await ytRes.json();
                      ytTitle = ytData.title || ytTitle;
                      ytAuthor = ytData.author_name || ytAuthor;
                    }
                  } catch {}

                  return res.end(
                    JSON.stringify({
                      success: true,
                      data: {
                        url: targetUrl,
                        title: ytTitle,
                        description: `Watch on YouTube • ${ytAuthor}`,
                        image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                        domain: 'youtube.com',
                      },
                    })
                  );
                }
              }

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);

              const response = await fetch(targetUrl, {
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; FacebookExternalHit/1.1; +http://www.facebook.com/externalhit_uatext.php)',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
              });
              clearTimeout(timeoutId);

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              const html = await response.text();

              const getMeta = (tag: string) => {
                const r1 = new RegExp(`<meta\\s+[^>]*(?:property|name)=["']${tag}["'][^>]*content=["']([^"']*)["']`, 'i');
                const m1 = html.match(r1);
                if (m1?.[1]) return m1[1];
                const r2 = new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${tag}["']`, 'i');
                const m2 = html.match(r2);
                return m2?.[1] || null;
              };

              const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
              const ogTitle = getMeta('og:title');
              const twitterTitle = getMeta('twitter:title');
              const title = ogTitle || twitterTitle || titleMatch?.[1]?.trim() || domain;

              const ogDesc = getMeta('og:description');
              const twitterDesc = getMeta('twitter:description');
              const metaDesc = getMeta('description');
              const description = ogDesc || twitterDesc || metaDesc || `Visit ${domain} for more information.`;

              let ogImage = getMeta('og:image') || getMeta('twitter:image');
              if (ogImage && !ogImage.startsWith('http')) {
                try {
                  ogImage = new URL(ogImage, targetUrl).href;
                } catch {
                  ogImage = null;
                }
              }

              res.statusCode = 200;
              return res.end(
                JSON.stringify({
                  success: true,
                  data: {
                    url: targetUrl,
                    title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim(),
                    description: description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim(),
                    image: ogImage || null,
                    domain,
                  },
                })
              );
            } catch {
              const domain = new URL(targetUrl).hostname.replace('www.', '');
              res.statusCode = 200;
              return res.end(
                JSON.stringify({
                  success: true,
                  data: {
                    url: targetUrl,
                    title: domain,
                    description: `Visit ${domain} for more information.`,
                    image: null,
                    domain,
                  },
                })
              );
            }
          })();
          return;
        }

        if (pathname === '/api/ads/feed' || pathname === '/api/ads/feeds' || pathname === '/api/ads/my') {
          res.statusCode = 200;
          return res.end(JSON.stringify({ ads: [] }));
        }

        if (pathname === '/api/songs') {
          res.statusCode = 200;
          return res.end(
            JSON.stringify({
              songs: [
                {
                  id: 1,
                  uploader_id: 0,
                  title: 'Sample Track',
                  artist_name: 'Artist',
                  cover_image_url:
                    'https://images.unsplash.com/photo-1514525253440-b393452e8d26?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
                  audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                  duration_seconds: 245,
                  genre: 'Music',
                  created_at: new Date().toISOString(),
                  stats: { plays: 0, downloads: 0, shares: 0, likes: 0, reels_use: 0 },
                },
              ],
            })
          );
        }

        if (pathname === '/api/reels') {
          if (req.method === 'POST') {
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, id: Date.now() }));
          }
          const videoPosts = devPosts.filter(
            (p) => p.video_url || p.media_type === 'video' || p.type === 'video'
          );
          const reels = videoPosts.map((p) => ({
            id: p.id,
            reel_id: p.id,
            video_url: p.video_url || p.media_url,
            thumbnail_url: p.thumb_url || p.media_meta?.[0]?.thumb || '',
            caption: p.content || '',
            content: p.content || '',
            author: p.user?.name || 'User',
            author_name: p.user?.name || 'User',
            avatar: p.user?.profile_image_url || '',
            avatar_url: p.user?.profile_image_url || '',
            verified: Boolean(p.user?.is_verified),
            created_at: p.created_at,
            likes_count: p.likesCount || 0,
            views: p.views || 0,
          }));
          res.statusCode = 200;
          return res.end(JSON.stringify({ reels }));
        }

        if (pathname === '/api/stories') {
          res.statusCode = 200;
          return res.end(JSON.stringify({ stories: [] }));
        }

        if (pathname === '/api/events') {
          res.statusCode = 200;
          return res.end(JSON.stringify({ events: [] }));
        }

        if (pathname === '/api/posts') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            return req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const newPost = {
                  id: Date.now(),
                  post_id: Date.now(),
                  ...parsed,
                  created_at: new Date().toISOString(),
                };
                devPosts.unshift(newPost);
                res.statusCode = 201;
                return res.end(JSON.stringify({ success: true, post: newPost }));
              } catch (e) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            });
          }
          res.statusCode = 200;
          return res.end(JSON.stringify(devPosts));
        }

        if (pathname === '/api/feeds') {
          res.statusCode = 200;
          return res.end(JSON.stringify({ feed: devPosts }));
        }

        if (pathname === '/api/products') {
          res.statusCode = 200;
          return res.end(JSON.stringify([]));
        }

        if (pathname === '/api/brands') {
          res.statusCode = 200;
          return res.end(JSON.stringify([]));
        }

        if (pathname === '/api/chats') {
          res.statusCode = 200;
          return res.end(JSON.stringify([]));
        }

        if (pathname === '/api/notifications') {
          res.statusCode = 200;
          return res.end(JSON.stringify([]));
        }

        if (pathname === '/api/upload') {
          res.statusCode = 200;
          return res.end(
            JSON.stringify({
              success: true,
              url: '',
              media_urls: {
                thumb: '',
                feed: '',
                full: '',
              },
              uploaded: {
                thumbnail: { url: '' },
                feed: { url: '' },
                original: { url: '' },
              },
            })
          );
        }

        if (pathname === '/api/reels' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          return req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const newReel = {
                id: Date.now(),
                user_id: parsed.user_id || 1,
                video_url: parsed.video_url || parsed.videoUrl || '',
                thumbnail_url: parsed.thumbnail_url || parsed.thumbnailUrl || '',
                caption: parsed.caption || '',
                song_name: parsed.song_name || 'Original Sound',
                views: 0,
                shares: 0,
                created_at: new Date().toISOString(),
              };
              res.statusCode = 201;
              return res.end(JSON.stringify({ success: true, reel: newReel }));
            } catch {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
        }

        if (pathname.includes('/api/reels/') && pathname.endsWith('/react')) {
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, reactions: { love: 1 }, my_reaction: 'love' }));
        }

        if (pathname.includes('/api/reels/') && pathname.endsWith('/share')) {
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, shares: 1 }));
        }

        if (pathname === '/api/reel-likes') {
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, liked: true, count: 1 }));
        }

        if (pathname === '/api/reel-comments') {
          res.statusCode = 200;
          if (req.method === 'POST') {
            return res.end(
              JSON.stringify({
                success: true,
                comment: {
                  id: Date.now(),
                  text: 'Awesome video!',
                  created_at: new Date().toISOString(),
                },
              })
            );
          }
          return res.end(JSON.stringify({ success: true, comments: [] }));
        }

        if (pathname === '/api/users') {
          res.statusCode = 200;
          return res.end(JSON.stringify([]));
        }

        if (pathname === '/api/groups') {
          res.statusCode = 200;
          return res.end(JSON.stringify([]));
        }

        if (pathname.startsWith('/api/user-follows')) {
          res.statusCode = 200;
          return res.end(JSON.stringify({ followers: [], following: [] }));
        }

        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, data: [] }));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), apiDevPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
