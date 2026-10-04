import '../styles/Post.css';
import '../styles/addPost.css';
import { createSignal, onMount, For, Show, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import Navbar from '../components/Navbar';
import { currentUser } from '../authStore';

export default function Timeline() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = createSignal('');
  const [posts, setPosts] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [currentPage, setCurrentPage] = createSignal(1);
  const postsPerPage = 3;

  // Ambil semua postingan (timeline menampilkan semua postingan)
  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:3001/api/posts`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      } else {
        setError('Failed to fetch posts');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };


  // Hapus postingan
  const deletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setPosts(posts().filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Filter postingan berdasarkan pencarian
  const filteredPosts = () => {
    if (!searchTerm()) return posts();
    return posts().filter(post => 
      post.content.toLowerCase().includes(searchTerm().toLowerCase()) ||
      post.user?.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
      post.user?.username.toLowerCase().includes(searchTerm().toLowerCase())
    );
  };

  // Paginasi
  const paginatedPosts = () => {
    const filtered = filteredPosts();
    const start = (currentPage() - 1) * postsPerPage;
    return filtered.slice(start, start + postsPerPage);
  };

  const totalPages = () => Math.ceil(filteredPosts().length / postsPerPage);

  // Reset halaman saat pencarian berubah
  createEffect(() => {
    searchTerm();
    setCurrentPage(1);
  });

  onMount(() => {
    fetchPosts();
  });

  return (
    <>
      <Navbar></Navbar>
      <div class="timeline-wrapper">
        <div class="timeline-card">
          <div class="timeline-header">
            <span>Timeline</span>
          </div>

          <div class="search-bar-container">
            <input
              type="text"
              placeholder="Search Timeline..."
              class="search-input"
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Show when={loading()}>
            <div class="loading">Loading posts...</div>
          </Show>

          <Show when={error()}>
            <div class="error">{error()}</div>
          </Show>

          <Show when={!loading() && !error()}>
            <For each={paginatedPosts()}>
              {(post) => (
                <div class="timeline-post">
                  <div class="post-header">
                    <div 
                      style={{"cursor": "pointer", "display": "flex", "align-items": "center", "gap": "10px"}}
                      onClick={() => navigate(`/profile/${post.user?.username || post.userId}`)}
                    >
                      <div class="post-avatar">
                        {post.user?.profilePicture ? (
                          <img src={post.user.profilePicture} alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
                        ) : (
                          <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #2d3748; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                            {(post.user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p class="post-author">{post.user?.name || 'Unknown'}</p>
                        <p class="post-handle">@{post.user?.username || 'unknown'}</p>
                      </div>
                    </div>
                    <Show when={post.userId === currentUser()?.id}>
                      <button 
                        class="delete-btn" 
                        onClick={() => deletePost(post.id)}
                        style="color: red; cursor: pointer; background: none; border: none;"
                      >
                        Delete
                      </button>
                    </Show>
                  </div>
                  <p class="post-content">{post.content}</p>
                  <p class="post-time" style="color: #666; font-size: 0.8em; margin-top: 10px;">
                    {new Date(post.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </For>

            <Show when={filteredPosts().length === 0}>
              <div class="no-posts">No posts to display. Follow some users to see their posts!</div>
            </Show>
          </Show>

          <Show when={totalPages() > 1}>
            <div class="pagination">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage() - 1))}
                disabled={currentPage() === 1}
              >
                {'<'}
              </button>
              <For each={Array.from({ length: totalPages() }, (_, i) => i + 1)}>
                {(page) => (
                  <button 
                    class={currentPage() === page ? "active" : ""}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                )}
              </For>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages(), currentPage() + 1))}
                disabled={currentPage() === totalPages()}
              >
                {'>'}
              </button>
            </div>
          </Show>
        </div>
      </div>


    </>
  );
};