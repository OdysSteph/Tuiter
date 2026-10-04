import { createSignal, onMount, createEffect, Show, For } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import '../styles/Profile.css';
import '../styles/addPost.css';
import { currentUser, isLoggedIn } from '../authStore';
import { followEvent } from '../followStore';

export default function Profile() {
  const navigate = useNavigate();
  const [stats, setStats] = createSignal({ following: 0, followers: 0 });
  const [showConnectionsModal, setShowConnectionsModal] = createSignal(false);
  const [connectionType, setConnectionType] = createSignal('');
  const [connections, setConnections] = createSignal({ followers: [], following: [] });
  const [loadingConnections, setLoadingConnections] = createSignal(false);
  
  const userData = () => {
    const user = currentUser();
    if (user && isLoggedIn()) {
      return {
        name: user.name,
        username: `@${user.username}`,
        following: stats().following,
        followers: stats().followers,
        profilePicture: user.profilePicture || null,
      };
    }
    return {
      name: 'Guest',
      username: '@guest',
      following: 0,
      followers: 0,
      profilePicture: null,
    };
  };

  // Ambil statistik pengguna
  const fetchUserStats = async () => {
    const user = currentUser();
    if (!user || !isLoggedIn()) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/users/${user.id}/stats`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          following: data.followingCount || 0,
          followers: data.followerCount || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  // Ambil koneksi (pengikut/mengikuti)
  const fetchConnections = async () => {
    const user = currentUser();
    if (!user || !isLoggedIn()) return;
    
    setLoadingConnections(true);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${user.id}/connections`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Tangani klik pada jumlah pengikut/mengikuti
  const handleConnectionClick = async (type) => {
    if (!isLoggedIn()) {
      alert("Please log in to view connections.");
      return;
    }
    
    setConnectionType(type);
    setShowConnectionsModal(true);
    await fetchConnections(type);
  };

  // Tutup modal koneksi
  const closeConnectionsModal = () => {
    setShowConnectionsModal(false);
    setConnectionType('');
  };

  // Navigasi ke profil pengguna
  const navigateToUserProfile = (userId) => {
    closeConnectionsModal();
    navigate(`/profile/${userId}`);
  };

  // Ambil statistik saat mount dan ketika pengguna berubah
  createEffect(() => {
    if (currentUser() && isLoggedIn()) {
      fetchUserStats();
    }
  });

  // Dengarkan event follow/unfollow dan perbarui statistik
  createEffect(() => {
    const event = followEvent();
    if (event && currentUser() && isLoggedIn()) {
      // Selalu ambil ulang statistik ketika event follow terjadi
      // Ini memastikan sidebar diperbarui saat follow/unfollow dari halaman mana pun
      fetchUserStats();
    }
  });

  onMount(() => {
    fetchUserStats();
  });

  const [isNewPostModalOpen, setIsNewPostModalOpen] = createSignal(false);
  const [postContent, setPostContent] = createSignal('');

  const openNewPostModal = () => {
    if (!isLoggedIn()) {
      alert("Please log in to create a post.");
      return;
    }
    setIsNewPostModalOpen(true);
    setPostContent('');
  };

  const closeNewPostModal = () => {
    setIsNewPostModalOpen(false);
    setPostContent('');
  };

  const handlePost = async () => {
    if (postContent().trim()) {
      try {
        const response = await fetch('http://localhost:3001/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ content: postContent() })
        });
        
        if (response.ok) {
          closeNewPostModal();
          // Refresh halaman untuk menampilkan postingan baru
          window.location.reload();
        }
      } catch (err) {
        console.error('Failed to create post:', err);
      }
    }
  };

  return (
    <>
      <div class="right-container">
        <A href="/profile" class="profile-card">
          <div class="profile-info">
            <div class="avatar-container">
              {userData().profilePicture ? (
                <img src={userData().profilePicture} alt="Profile" class="profile-avatar" />
              ) : (
                <div class="profile-avatar-placeholder">
                  <span>{userData().name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div class="user-details">
              <div class="user-name">{userData().name}</div>
              <div class="user-username">{userData().username}</div>
              <div class="user-stats">
                <span 
                  class="clickable-stat" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConnectionClick('following');
                  }}
                >
                  Following: {userData().following}
                </span>
                <span 
                  class="clickable-stat" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConnectionClick('followers');
                  }}
                >
                  Followers: {userData().followers}
                </span>
              </div>
            </div>
          </div>
        </A>
        {isLoggedIn() && (
          <button class="new-post-button" onClick={openNewPostModal}>
            + New Post
          </button>
        )}
      </div>

      {isNewPostModalOpen() && (
        <div class="new-post-modal-overlay" onClick={closeNewPostModal}>
          <div class="new-post-modal" onClick={(e) => e.stopPropagation()}>
            <div class="new-post-header">
              <button class="close-modal-btn" onClick={closeNewPostModal}>
                ×
              </button>
            </div>
            <div class="new-post-content">
              <textarea
                class="new-post-textarea"
                placeholder="What's on your mind..."
                value={postContent()}
                onInput={(e) => setPostContent(e.target.value)}
                rows="6"
              />
            </div>
            <div class="new-post-footer">
              <button
                class="post-submit-btn"
                onClick={handlePost}
                disabled={!postContent().trim()}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {showConnectionsModal() && (
        <div class="connections-modal-overlay" onClick={closeConnectionsModal}>
          <div class="connections-modal" onClick={(e) => e.stopPropagation()}>
            <div class="connections-header">
              <h2>{connectionType() === 'following' ? 'Following' : 'Followers'}</h2>
              <button class="close-modal-btn" onClick={closeConnectionsModal}>
                ×
              </button>
            </div>
            <div class="connections-content">
              <Show when={loadingConnections()} fallback={
                <Show when={connections()[connectionType()]?.length > 0} fallback={
                  <div class="no-connections">
                    No {connectionType() === 'following' ? 'following' : 'followers'} yet
                  </div>
                }>
                  <For each={connections()[connectionType()]}>
                    {(user) => (
                      <div 
                        class="connection-item" 
                        onClick={() => navigateToUserProfile(user.id)}
                      >
                        <div class="connection-avatar-container">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} class="connection-avatar" />
                          ) : (
                            <div class="connection-avatar-placeholder">
                              <span>{user.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div class="connection-info">
                          <div class="connection-name">{user.name}</div>
                          <div class="connection-username">@{user.username}</div>
                        </div>
                      </div>
                    )}
                  </For>
                </Show>
              }>
                <div class="loading-connections">Loading...</div>
              </Show>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
