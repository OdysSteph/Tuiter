import { createSignal, For, Show, onMount, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import '../styles/People.css';
import Navbar from '../components/Navbar';
import { emitFollowEvent, onFollowEvent } from '../followStore';

export default function People() {
  const navigate = useNavigate();
  const [people, setPeople] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [searchTerm, setSearchTerm] = createSignal('');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [userStats, setUserStats] = createSignal({});
  const peoplePerPage = 3;

  // Ambil data pengguna
  const fetchPeople = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPeople(data);
        // Ambil statistik untuk setiap pengguna secara paralel untuk performa lebih baik
        await Promise.all(data.map(user => fetchUserStats(user.id)));
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Ambil statistik pengguna
  const fetchUserStats = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/users/${userId}/stats`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const stats = await response.json();
        setUserStats(prev => ({ ...prev, [userId]: stats }));
      }
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  // Toggle ikuti
  const toggleFollow = async (userId, currentIsFollowing) => {
    // Perbarui UI terlebih dahulu secara optimis
    const newFollowingState = !currentIsFollowing;
    
    // Perbarui state lokal segera
    setPeople(prev => prev.map(person => 
      person.id === userId 
        ? { ...person, isFollowing: newFollowingState }
        : person
    ));
    
    // Perbarui jumlah pengikut segera
    setUserStats(prev => {
      const stats = prev[userId] || { postCount: 0, followerCount: 0, followingCount: 0 };
      return {
        ...prev,
        [userId]: {
          ...stats,
          followerCount: newFollowingState 
            ? stats.followerCount + 1 
            : Math.max(0, stats.followerCount - 1)
        }
      };
    });
    
    try {
      const url = `http://localhost:3001/api/follow/${userId}`;
      const method = currentIsFollowing ? 'DELETE' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Kembalikan jika gagal
        setPeople(prev => prev.map(person => 
          person.id === userId 
            ? { ...person, isFollowing: currentIsFollowing }
            : person
        ));
        
        setUserStats(prev => {
          const stats = prev[userId] || { postCount: 0, followerCount: 0, followingCount: 0 };
          return {
            ...prev,
            [userId]: {
              ...stats,
              followerCount: currentIsFollowing 
                ? stats.followerCount + 1 
                : Math.max(0, stats.followerCount - 1)
            }
          };
        });
        
        console.error('Failed to toggle follow');
      } else {
        // Kirim event follow untuk update real-time ke komponen lain
        emitFollowEvent(userId, newFollowingState);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      
      // Kembalikan jika error
      setPeople(prev => prev.map(person => 
        person.id === userId 
          ? { ...person, isFollowing: currentIsFollowing }
          : person
      ));
      
      setUserStats(prev => {
        const stats = prev[userId] || { postCount: 0, followerCount: 0, followingCount: 0 };
        return {
          ...prev,
          [userId]: {
            ...stats,
            followerCount: currentIsFollowing 
              ? stats.followerCount + 1 
              : Math.max(0, stats.followerCount - 1)
          }
        };
      });
    }
  };

  // Filter orang berdasarkan pencarian
  const filteredPeople = () => {
    if (!searchTerm().trim()) return people();
    
    return people().filter(person =>
      person.name.toLowerCase().includes(searchTerm().toLowerCase()) ||
      person.username.toLowerCase().includes(searchTerm().toLowerCase()) ||
      (person.bio && person.bio.toLowerCase().includes(searchTerm().toLowerCase()))
    );
  };

  // Paginasi
  const paginatedPeople = () => {
    const filtered = filteredPeople();
    const start = (currentPage() - 1) * peoplePerPage;
    return filtered.slice(start, start + peoplePerPage);
  };

  const totalPages = () => Math.ceil(filteredPeople().length / peoplePerPage);

  // Reset halaman saat pencarian berubah
  createEffect(() => {
    searchTerm();
    setCurrentPage(1);
  });

  onMount(() => {
    fetchPeople();
  });

  // Dengarkan event follow dari komponen lain
  onFollowEvent((userId, isFollowing) => {
    // Perbarui state follow untuk pengguna yang terpengaruh
    setPeople(prev => prev.map(person => 
      person.id === userId 
        ? { ...person, isFollowing } 
        : person
    ));
    
    // Ambil ulang statistik untuk pengguna yang terpengaruh
    fetchUserStats(userId);
  });

  return (
    <>
      <Navbar />
      <div class="people-wrapper">
        <div class="people-card">
          <div class="people-header">
            <span>People</span>
          </div>

          <div class="search-bar-container">
            <input 
              type="text" 
              class="search-input" 
              placeholder="Search People..." 
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Show when={loading()}>
            <div class="loading">Loading people...</div>
          </Show>

          <Show when={error()}>
            <div class="error">{error()}</div>
          </Show>

          <Show when={!loading() && !error()}>
            <For each={paginatedPeople()}>
              {(person) => {
                const stats = userStats()[person.id] || {};
                return (
                  <div class="person-profile-item">
                    <div class="person-profile-header">
                      <div 
                        style={{"cursor": "pointer", "display": "flex", "align-items": "center", "gap": "10px"}}
                        onClick={() => navigate(`/profile/${person.username}`)}
                      >
                        <div class="person-avatar">
                          {person.profilePicture ? (
                            <img src={person.profilePicture} alt="Profile" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" />
                          ) : (
                            <div style="width: 50px; height: 50px; border-radius: 50%; background-color: #2d3748; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                              {person.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p class="person-name">{person.name}</p>
                          <p class="person-handle">@{person.username}</p>
                        </div>
                      </div>
                      <button
                        class="follow-button-people"
                        onClick={() => toggleFollow(person.id, person.isFollowing)}
                      >
                        {person.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                    <div class="person-stats">
                      <span>Posts: {stats.postCount || 0}</span>
                      <span>Followers: {stats.followerCount || 0}</span>
                      <span>Following: {stats.followingCount || 0}</span>
                    </div>
                    <p class="person-bio">{person.bio || 'No bio yet'}</p>
                  </div>
                );
              }}
            </For>

            <Show when={filteredPeople().length === 0 && searchTerm().trim()}>
              <p class="no-results">No users found for "{searchTerm()}"</p>
            </Show>

            <Show when={filteredPeople().length === 0 && !searchTerm().trim()}>
              <div class="no-people">No other users yet.</div>
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
}