import { createSignal, For, createEffect, Show, onMount } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import '../styles/ProfilePage.css';
import { 
  currentUser, 
  logoutUser, 
  isLoggedIn, 
  updateCurrentUserDetails
} from '../authStore';
import { emitFollowEvent, followEvent } from '../followStore'; 

export default function ProfilePage() {
  const navigate = useNavigate();
  const params = useParams();

  const [profile, setProfile] = createSignal(null);
  const [isOwnProfile, setIsOwnProfile] = createSignal(true);
  const [isFollowing, setIsFollowing] = createSignal(false);
  const [profileStats, setProfileStats] = createSignal({
    postCount: 0,
    followerCount: 0,
    followingCount: 0
  });

  const [isEditModalOpen, setIsEditModalOpen] = createSignal(false);
  const [editData, setEditData] = createSignal({
    name: '',
    username: '',
    bio: '',
    profilePicture: null,
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [editError, setEditError] = createSignal('');

  // Ambil profil pengguna dan postingan
  const fetchUserProfile = async (userId) => {
    try {
      // Jika userId disediakan, kita melihat profil pengguna lain
      if (userId) {
        // Periksa apakah melihat profil sendiri dulu
        const authCheck = await fetch('http://localhost:3001/api/auth/check', {
          credentials: 'include'
        });
        const authData = await authCheck.json();
        
        if (authData.authenticated && (authData.user.id === userId || authData.user.username === userId)) {
          // Melihat profil sendiri melalui URL
          setProfile({
            id: authData.user.id,
            name: authData.user.name,
            handle: `@${authData.user.username}`,
            username: authData.user.username,
            bio: authData.user.bio || 'Edit bio...',
            profilePicture: null
          });
          setIsOwnProfile(true);
        } else {
          // Melihat profil pengguna lain
          const userResponse = await fetch(`http://localhost:3001/api/users/${userId}`, {
            credentials: 'include'
          });
          
          if (!userResponse.ok) {
            throw new Error('User not found');
          }
          
          const targetUser = await userResponse.json();
          setProfile({
            id: targetUser.id,
            name: targetUser.name,
            handle: `@${targetUser.username}`,
            username: targetUser.username,
            bio: targetUser.bio || 'No bio yet',
            profilePicture: null
          });
          setIsFollowing(targetUser.isFollowing);
          setIsOwnProfile(false);
        }
      } else {
        // Tidak ada userId, tampilkan profil pengguna saat ini
        const user = currentUser();
        if (user && isLoggedIn()) {
          setProfile({
            id: user.id,
            name: user.name,
            handle: `@${user.username}`,
            username: user.username,
            bio: user.bio || 'Edit bio...',
            profilePicture: user.profilePicture || null
          });
          setIsOwnProfile(true);
        } else {
          navigate('/login', { replace: true });
          return;
        }
      }
      
      // Ambil statistik pengguna
      const profileIdOrUsername = userId || profile()?.id || currentUser()?.id;
      if (profileIdOrUsername) {
        const statsResponse = await fetch(`http://localhost:3001/api/users/${profileIdOrUsername}/stats`, {
          credentials: 'include'
        });
        
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setProfileStats(stats);
        }
      }
      
      // Ambil postingan pengguna
      fetchUserPosts();
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (!isLoggedIn()) {
        navigate('/login', { replace: true });
      }
    }
  };

  // Ambil postingan untuk profil yang dilihat
  const fetchUserPosts = async () => {
    try {
      const userIdOrUsername = params.userId || profile()?.id || currentUser()?.id;
      if (!userIdOrUsername) return;
      
      const response = await fetch(`http://localhost:3001/api/posts?userId=${userIdOrUsername}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const userPosts = await response.json();
      
      setPosts(userPosts.map(post => ({
        id: post.id,
        author: post.user?.name || profile()?.name || '',
        handle: post.user ? `@${post.user.username}` : profile()?.handle || '',
        content: post.content,
        timestamp: new Date(post.timestamp).toLocaleString()
      })));
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    }
  };

  onMount(() => {
    fetchUserProfile(params.userId);
  });

  createEffect(() => {
    const userId = params.userId;
    fetchUserProfile(userId);
  });
  
  // Dengarkan event follow/unfollow dan perbarui statistik
  createEffect(() => {
    const event = followEvent();
    if (event && profile()) {
      // Jika event untuk profil yang sedang dilihat, ambil ulang statistik
      if (event.userId === profile().id) {
        const profileIdOrUsername = params.userId || profile()?.id || currentUser()?.id;
        if (profileIdOrUsername) {
          fetch(`http://localhost:3001/api/users/${profileIdOrUsername}/stats`, {
            credentials: 'include'
          })
          .then(response => response.json())
          .then(stats => setProfileStats(stats))
          .catch(err => console.error('Failed to update stats:', err));
        }
      }
    }
  });

  const [posts, setPosts] = createSignal([]);

  const [currentPage, setCurrentPage] = createSignal(1);
  const [searchQuery, setSearchQuery] = createSignal('');
  const postsPerPage = 4;
  
  // State modal koneksi
  const [showConnectionsModal, setShowConnectionsModal] = createSignal(false);
  const [connectionType, setConnectionType] = createSignal('');
  const [connections, setConnections] = createSignal({ followers: [], following: [] });
  const [loadingConnections, setLoadingConnections] = createSignal(false);

  const openEditModal = () => {
    const currentProf = profile();
    setEditError('');
    setEditData({
      name: currentProf.name,
      username: currentProf.username,
      bio: currentProf.bio,
      profilePicture: currentProf.profilePicture,
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setIsEditModalOpen(true);
  };

  const handleActualLogout = (e) => {
    e.preventDefault();
    logoutUser();
    navigate("/login");
  };

  const closeEditModal = () => setIsEditModalOpen(false);

  const [profilePictureFile, setProfilePictureFile] = createSignal(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setEditData({ ...editData(), profilePicture: event.target.result });
      reader.readAsDataURL(file);
    }
  };

  // Tangani follow/unfollow
  const handleFollowToggle = async () => {
    try {
      const userId = profile()?.id;
      if (!userId) return;
      
      const method = isFollowing() ? 'DELETE' : 'POST';
      const response = await fetch(`http://localhost:3001/api/follow/${userId}`, {
        method,
        credentials: 'include'
      });
      
      if (response.ok) {
        const newFollowingState = !isFollowing();
        setIsFollowing(newFollowingState);
        // Perbarui jumlah pengikut
        setProfileStats(prev => ({
          ...prev,
          followerCount: prev.followerCount + (newFollowingState ? 1 : -1)
        }));
        
        // Kirim event follow untuk update real-time
        emitFollowEvent(userId, newFollowingState);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };
  
  // Ambil koneksi (pengikut/mengikuti)
  const fetchConnections = async () => {
    const userId = profile()?.id;
    if (!userId) return;
    
    setLoadingConnections(true);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${userId}/connections`, {
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
    setConnectionType(type);
    setShowConnectionsModal(true);
    await fetchConnections();
  };
  
  // Tutup modal koneksi
  const closeConnectionsModal = () => {
    setShowConnectionsModal(false);
    setConnectionType('');
  };
  
  // Navigasi ke profil pengguna dari modal koneksi
  const navigateToUserProfile = (userId) => {
    closeConnectionsModal();
    navigate(`/profile/${userId}`);
  };

  // Tangani penghapusan postingan
  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setPosts(posts().filter(p => p.id !== postId));
        setProfileStats(prev => ({
          ...prev,
          postCount: prev.postCount - 1
        }));
        
        // Periksa apakah perlu menyesuaikan halaman saat ini
        const newFilteredPosts = posts().filter(p => p.id !== postId).filter(post =>
          !searchQuery() || post.content.toLowerCase().includes(searchQuery().toLowerCase())
        );
        const newTotalPages = Math.ceil(newFilteredPosts.length / postsPerPage);
        
        // Jika halaman saat ini melewati total halaman, pergi ke halaman terakhir
        if (currentPage() > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const saveProfile = async () => {
    setEditError('');
    const { name, username: newUsernameToSave, bio, currentPassword, newPassword, confirmNewPassword, profilePicture } = editData();

    if (newPassword && newPassword !== confirmNewPassword) {
      setEditError("New passwords do not match.");
      return;
    }

    const originalUsername = profile().username; 
    const isUsernameChanging = newUsernameToSave !== originalUsername;
    const isPasswordChanging = !!newPassword;

    const payload = { name, username: newUsernameToSave, bio };

    if (isPasswordChanging || isUsernameChanging) {
      if (!currentPassword) {
        setEditError("Current password is required to change username or password.");
        return;
      }
      payload.currentPassword = currentPassword;
      if (isPasswordChanging) {
        payload.newPassword = newPassword;
      }
    }

    try {
      const response = await fetch('http://localhost:3001/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const resultText = await response.text();
      let result;
      try {
        result = JSON.parse(resultText);
      } catch (e) {
        console.error("Failed to parse server response as JSON. Raw response:", resultText);
        setEditError(`Server returned an unexpected response (Status: ${response.status}). Check console for details.`);
        return;
      }

      if (response.ok && result.user) { 
        // Unggah foto profil jika berubah
        if (profilePictureFile()) {
          const formData = new FormData();
          formData.append('profilePicture', profilePictureFile());
          
          const picResponse = await fetch('http://localhost:3001/api/profile/picture', {
            method: 'POST',
            credentials: 'include',
            body: formData
          });
          
          if (picResponse.ok) {
            const picResult = await picResponse.json();
            result.user.profilePicture = picResult.profilePicture;
          }
        }
        
        updateCurrentUserDetails({
            name: result.user.name,
            username: result.user.username,
            bio: result.user.bio,
            profilePicture: result.user.profilePicture
        });
        
        closeEditModal();
        setProfilePictureFile(null);
        alert("berhasil menyimpan perubahan")
        navigate('/profile', { replace: true }); 

        if (isPasswordChanging || (isUsernameChanging && originalUsername !== result.user.username) ) {
            console.log("Profile updated with potential username/password change.");
        }

      } else {
        setEditError(result.message || `Failed to update profile (Status: ${response.status})`);
      }
    } catch (error) {
      console.error("Error saving profile (fetch or other JS error):", error);
      setEditError("An error occurred while saving. Please try again. Check your network connection.");
    }
  };

  const filteredPosts = () => {
    if (!searchQuery()) return posts();
    return posts().filter(post =>
      post.content.toLowerCase().includes(searchQuery().toLowerCase())
    );
  };

  const paginatedPosts = () => {
    const filtered = filteredPosts();
    const start = (currentPage() - 1) * postsPerPage;
    return filtered.slice(start, start + postsPerPage);
  };

  const totalPages = () => Math.ceil(filteredPosts().length / postsPerPage);

  // Reset halaman saat pencarian berubah
  createEffect(() => {
    searchQuery();
    setCurrentPage(1);
  });

  const goBack = (e) => {
    e.preventDefault();
    navigate(-1);
  };

  return (
    <>
      <div class="profile-wrapper">
        <div class="profile_card">
          <div id="top-profile">
            <button class='back-button' onClick={goBack}> &lt; </button>
            <Show when={isOwnProfile()}>
              <button onClick={handleActualLogout} id="logout_button">LOGOUT</button>
            </Show>
          </div>

          <Show when={profile()} fallback={<div>Loading...</div>}>
            <div class="profile-header">
              <div class="profile-info">
                <div class="profile-picture-container">
                  {profile().profilePicture ? (
                    <img src={profile().profilePicture} alt="Profile" class="profile-picture" />
                  ) : (
                    <div class="profile-picture-placeholder">
                      <span>{profile().name ? profile().name.charAt(0).toUpperCase() : 'U'}</span>
                    </div>
                  )}
                </div>
                <div class="profile-details">
                  <h1 class="profile-name">{profile().name}</h1>
                  <p class="profile-handle" style={{"margin-top": "0px", "margin-bottom": "5px", "color": "#a0aec0"}}>{profile().handle}</p>
                  <div class="profile-stats">
                    <span>Posts: {profileStats().postCount}</span>
                    <span 
                      style={{"cursor": "pointer", "text-decoration": "underline"}}
                      onClick={() => handleConnectionClick('followers')}
                    >
                      Followers: {profileStats().followerCount}
                    </span>
                    <span 
                      style={{"cursor": "pointer", "text-decoration": "underline"}}
                      onClick={() => handleConnectionClick('following')}
                    >
                      Following: {profileStats().followingCount}
                    </span>
                  </div>
                  <p class="profile-bio">{profile().bio}</p>
                </div>
              </div>
              <Show when={isOwnProfile()} fallback={
                <button 
                  class="edit-profile-button" 
                  onClick={handleFollowToggle}
                  style={{
                    "background-color": isFollowing() ? "#e53e3e" : "#4299e1"
                  }}
                >
                  {isFollowing() ? 'Unfollow' : 'Follow'}
                </button>
              }>
                <button class="edit-profile-button" onClick={openEditModal}>
                  Edit Profile
                </button>
              </Show>
            </div>
          </Show>

          <div class="posts-section">
            <h2 class="posts-title">{isOwnProfile() ? 'My Posts' : 'Posts'}</h2>
            <div class="search-bar-container">
              <input
                type="text"
                class="search-input"
                placeholder="Search..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div class="posts-list">
              <For each={paginatedPosts()}>
                {(post) => (
                  <div class="post-item">
                    <div class="post-header" style={{"display": "flex", "justify-content": "space-between", "align-items": "center"}}>
                      <div>
                        <span class="post-author">{post.author}</span>
                        <span class="post-author" style={{"color":"#a0aec0", "font-weight":"normal", "margin-left":"5px"}}>{post.handle}</span>
                      </div>
                      <Show when={isOwnProfile()}>
                        <button 
                          onClick={() => handleDeletePost(post.id)}
                          style={{
                            "background": "none",
                            "border": "none",
                            "color": "#e53e3e",
                            "cursor": "pointer",
                            "font-size": "14px",
                            "padding": "4px 8px"
                          }}
                        >
                          Delete
                        </button>
                      </Show>
                    </div>
                    <div class="post-content" style={{"white-space": "pre-line"}}>
                      {post.content}
                    </div>
                    <div style={{"color": "#718096", "font-size": "12px", "margin-top": "8px"}}>
                      {post.timestamp}
                    </div>
                  </div>
                )}
              </For>
            </div>
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

          {isEditModalOpen() && (
            <div class="modal-overlay" onClick={closeEditModal}>
              <div class="modal-content" onClick={(e) => e.stopPropagation()}>
                <div class="modal-header">
                  <h2>Edit Profile</h2>
                  <button class="modal-close" onClick={closeEditModal}>×</button>
                </div>
                <div class="modal-body">
                  {editError() && <p style={{color: 'red', "text-align": 'center'}}>{editError()}</p>}
                  <div class="form-group">
                    <label>Profile Picture</label>
                    <div class="profile-picture-edit">
                      {editData().profilePicture ? (
                        <img src={editData().profilePicture} alt="Profile Preview" class="profile-picture-preview" />
                      ) : (
                        <div class="profile-picture-placeholder-edit">
                          <span>{editData().name ? editData().name.charAt(0).toUpperCase() : 'U'}</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={handleFileChange} class="file-input" id="profile-picture-input" />
                      <label for="profile-picture-input" class="file-input-label">Change Picture</label>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Name</label>
                    <input type="text" value={editData().name} onInput={(e) => setEditData({ ...editData(), name: e.target.value })} class="modal-input" />
                  </div>
                  <div class="form-group">
                    <label>Username</label>
                    <input type="text" value={editData().username} onInput={(e) => setEditData({ ...editData(), username: e.target.value })} class="modal-input" />
                  </div>
                  <div class="form-group">
                    <label>Bio</label>
                    <textarea value={editData().bio} onInput={(e) => setEditData({ ...editData(), bio: e.target.value })} class="modal-textarea" rows="3" />
                  </div>
                  <hr style={{"border-color": "#2d3748", "margin-top": "1rem", "margin-bottom": "1rem"}} />
                  <h4 style={{"margin-bottom": "0.5rem", "color": "white"}}>Change Password (Optional)</h4>
                  <div class="form-group">
                    <label>Current Password</label>
                    <input type="password" value={editData().currentPassword} onInput={(e) => setEditData({ ...editData(), currentPassword: e.target.value })} class="modal-input" placeholder="Required to change username or password"/>
                  </div>
                  <div class="form-group">
                    <label>New Password</label>
                    <input type="password" value={editData().newPassword} onInput={(e) => setEditData({ ...editData(), newPassword: e.target.value })} class="modal-input" placeholder="Leave blank if no change"/>
                  </div>
                  <div class="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" value={editData().confirmNewPassword} onInput={(e) => setEditData({ ...editData(), confirmNewPassword: e.target.value })} class="modal-input" />
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="modal-button cancel" onClick={closeEditModal}>Cancel</button>
                  <button class="modal-button save" onClick={saveProfile}>Save Changes</button>
                </div>
              </div>
            </div>
          )}
          
          {showConnectionsModal() && (
            <div class="connections-modal-overlay" onClick={closeConnectionsModal} style={{
              "position": "fixed",
              "top": "0",
              "left": "0",
              "right": "0",
              "bottom": "0",
              "background-color": "rgba(0, 0, 0, 0.7)",
              "display": "flex",
              "align-items": "center",
              "justify-content": "center",
              "z-index": "1000"
            }}>
              <div class="connections-modal" onClick={(e) => e.stopPropagation()} style={{
                "background-color": "#1a202c",
                "border-radius": "8px",
                "width": "90%",
                "max-width": "500px",
                "max-height": "80vh",
                "overflow": "hidden",
                "display": "flex",
                "flex-direction": "column"
              }}>
                <div class="connections-header" style={{
                  "display": "flex",
                  "justify-content": "space-between",
                  "align-items": "center",
                  "padding": "20px",
                  "border-bottom": "1px solid #2d3748"
                }}>
                  <h2 style={{"margin": "0", "color": "white"}}>
                    {connectionType() === 'following' ? 'Following' : 'Followers'}
                  </h2>
                  <button class="close-modal-btn" onClick={closeConnectionsModal} style={{
                    "background": "none",
                    "border": "none",
                    "color": "white",
                    "font-size": "24px",
                    "cursor": "pointer",
                    "padding": "0",
                    "width": "30px",
                    "height": "30px",
                    "display": "flex",
                    "align-items": "center",
                    "justify-content": "center"
                  }}>×</button>
                </div>
                <div class="connections-content" style={{
                  "flex": "1",
                  "overflow-y": "auto",
                  "padding": "20px"
                }}>
                  <Show when={loadingConnections()} fallback={
                    <Show when={connections()[connectionType()]?.length > 0} fallback={
                      <div class="no-connections" style={{
                        "text-align": "center",
                        "color": "#718096",
                        "padding": "40px"
                      }}>
                        No {connectionType() === 'following' ? 'following' : 'followers'} yet
                      </div>
                    }>
                      <For each={connections()[connectionType()]}>
                        {(user) => (
                          <div 
                            class="connection-item" 
                            onClick={() => navigateToUserProfile(user.username)}
                            style={{
                              "display": "flex",
                              "align-items": "center",
                              "padding": "12px",
                              "border-radius": "8px",
                              "cursor": "pointer",
                              "transition": "background-color 0.2s",
                              "margin-bottom": "8px"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div class="connection-avatar-container" style={{
                              "margin-right": "12px"
                            }}>
                              {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.name} style={{
                                  "width": "50px",
                                  "height": "50px",
                                  "border-radius": "50%",
                                  "object-fit": "cover"
                                }} />
                              ) : (
                                <div style={{
                                  "width": "50px",
                                  "height": "50px",
                                  "border-radius": "50%",
                                  "background-color": "#4a5568",
                                  "display": "flex",
                                  "align-items": "center",
                                  "justify-content": "center",
                                  "color": "white",
                                  "font-weight": "bold",
                                  "font-size": "18px"
                                }}>
                                  <span>{user.name.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                            </div>
                            <div class="connection-info">
                              <div style={{"color": "white", "font-weight": "500"}}>{user.name}</div>
                              <div style={{"color": "#718096", "font-size": "14px"}}>@{user.username}</div>
                            </div>
                          </div>
                        )}
                      </For>
                    </Show>
                  }>
                    <div class="loading-connections" style={{
                      "text-align": "center",
                      "color": "#718096",
                      "padding": "40px"
                    }}>Loading...</div>
                  </Show>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
