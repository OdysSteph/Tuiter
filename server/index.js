const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

let data = require('./data.js');

const app = express();

// Konfigurasi CORS untuk mengizinkan kredensial
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(bodyParser.json());

// Konfigurasi sesi
app.use(session({
  secret: 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Atur ke true di produksi dengan HTTPS
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 jam
  }
}));

const dataFilePath = path.join(__dirname, 'data.js');

// Konfigurasi multer untuk unggah file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../TubesFE/src/assets/profile_pictures');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Ambil ekstensi file
    const ext = path.extname(file.originalname);
    // Buat nama file: pp_username.ext
    const filename = `pp_${req.session.user.username}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Batas 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Fungsi pembantu untuk menyimpan data
function saveData() {
  try {
    const fileContent = `module.exports = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync(dataFilePath, fileContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

// Fungsi pembantu untuk membuat ID unik
function generateId(prefix) {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
}

// Endpoint autentikasi
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(401).json({ message: 'Username and password are required' });
  }

  const user = data.users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  // Simpan pengguna di sesi
  req.session.userId = user.id;
  req.session.user = {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio || '',
    profilePicture: user.profilePicture || null
  };

  res.status(200).json({ 
    message: 'Login successful',
    user: req.session.user
  });
});

app.post('/api/register', (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (data.users.some(u => u.username === username)) {
    return res.status(409).json({ message: 'Username already taken' });
  }

  const newUser = {
    id: generateId('user'),
    name: name.trim(),
    username: username.trim(),
    password: password,
    bio: '',
    profilePicture: null
  };

  data.users.push(newUser);

  if (!saveData()) {
    data.users.pop();
    return res.status(500).json({ message: 'Failed to save user data' });
  }

  res.status(201).json({ message: 'User registered successfully. Please log in.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// Periksa status autentikasi
app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    res.status(200).json({ 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.status(200).json({ authenticated: false });
  }
});

// Middleware autentikasi
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

// Endpoint profil
app.put('/api/profile', requireAuth, (req, res) => {
  const { name, username: newUsername, bio, currentPassword, newPassword, profilePicture } = req.body;
  const userId = req.session.userId;

  const userIndex = data.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  const user = data.users[userIndex];

  if (newPassword || (newUsername && newUsername !== user.username)) {
    if (!currentPassword || user.password !== currentPassword) {
      return res.status(403).json({ message: 'Current password is required and must be correct' });
    }
  }

  if (name) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  
  if (newUsername && newUsername !== user.username) {
    if (data.users.some(u => u.username === newUsername && u.id !== userId)) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    user.username = newUsername.trim();
  }

  if (newPassword) user.password = newPassword;
  
  if (profilePicture !== undefined) user.profilePicture = profilePicture;

  data.users[userIndex] = user;

  if (!saveData()) {
    return res.status(500).json({ message: 'Failed to save profile changes' });
  }

  // Perbarui sesi
  req.session.user = {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio || '',
    profilePicture: user.profilePicture || null
  };

  res.status(200).json({ 
    message: 'Profile updated successfully',
    user: req.session.user
  });
});

// Endpoint postingan
app.get('/api/posts', requireAuth, (req, res) => {
  const { timeline, search, userId } = req.query;
  let posts = [...data.posts];

  if (timeline === 'true') {
    // Ambil postingan dari pengguna yang diikuti
    const following = data.follows
      .filter(f => f.followerId === req.session.userId)
      .map(f => f.followingId);
    
    // Sertakan postingan sendiri juga
    following.push(req.session.userId);
    
    posts = posts.filter(p => following.includes(p.userId));
  } else if (userId) {
    // Ambil postingan untuk pengguna tertentu
    const user = data.users.find(u => u.id === userId || u.username === userId);
    if (user) {
      posts = posts.filter(p => p.userId === user.id);
    } else {
      posts = [];
    }
  }

  if (search) {
    posts = posts.filter(p => 
      p.content.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Urutkan berdasarkan waktu (terbaru dulu)
  posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Tambahkan info pengguna ke setiap postingan
  const postsWithUsers = posts.map(post => {
    const user = data.users.find(u => u.id === post.userId);
    return {
      ...post,
      user: user ? {
        id: user.id,
        name: user.name,
        username: user.username,
        profilePicture: user.profilePicture || null
      } : null
    };
  });

  res.status(200).json(postsWithUsers);
});

app.post('/api/posts', requireAuth, (req, res) => {
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ message: 'Post content cannot be empty' });
  }

  const newPost = {
    id: generateId('post'),
    userId: req.session.userId,
    content: content.trim(),
    timestamp: new Date().toISOString()
  };

  data.posts.push(newPost);

  if (!saveData()) {
    data.posts.pop();
    return res.status(500).json({ message: 'Failed to save post' });
  }

  // Kembalikan postingan dengan info pengguna
  const postWithUser = {
    ...newPost,
    user: req.session.user
  };

  res.status(201).json(postWithUser);
});

app.delete('/api/posts/:postId', requireAuth, (req, res) => {
  const { postId } = req.params;
  
  const postIndex = data.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) {
    return res.status(404).json({ message: 'Post not found' });
  }

  // Periksa apakah pengguna memiliki postingan
  if (data.posts[postIndex].userId !== req.session.userId) {
    return res.status(403).json({ message: 'You can only delete your own posts' });
  }

  data.posts.splice(postIndex, 1);

  if (!saveData()) {
    return res.status(500).json({ message: 'Failed to delete post' });
  }

  res.status(200).json({ message: 'Post deleted successfully' });
});

// Endpoint pengguna
app.get('/api/users', requireAuth, (req, res) => {
  const { search } = req.query;
  let users = data.users.filter(u => u.id !== req.session.userId); // Kecualikan pengguna saat ini

  if (search) {
    users = users.filter(u => 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Tambahkan status mengikuti
  const usersWithFollowStatus = users.map(user => {
    const isFollowing = data.follows.some(f => 
      f.followerId === req.session.userId && f.followingId === user.id
    );
    
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      isFollowing
    };
  });

  res.status(200).json(usersWithFollowStatus);
});

// Endpoint ikuti/berhenti ikuti
app.post('/api/follow/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;

  if (userId === req.session.userId) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  if (!data.users.find(u => u.id === userId)) {
    return res.status(404).json({ message: 'User not found' });
  }

  const existingFollow = data.follows.find(f => 
    f.followerId === req.session.userId && f.followingId === userId
  );

  if (existingFollow) {
    return res.status(400).json({ message: 'You are already following this user' });
  }

  data.follows.push({
    followerId: req.session.userId,
    followingId: userId
  });

  if (!saveData()) {
    data.follows.pop();
    return res.status(500).json({ message: 'Failed to follow user' });
  }

  res.status(200).json({ message: 'User followed successfully' });
});

app.delete('/api/follow/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;

  const followIndex = data.follows.findIndex(f => 
    f.followerId === req.session.userId && f.followingId === userId
  );

  if (followIndex === -1) {
    return res.status(400).json({ message: 'You are not following this user' });
  }

  data.follows.splice(followIndex, 1);

  if (!saveData()) {
    return res.status(500).json({ message: 'Failed to unfollow user' });
  }

  res.status(200).json({ message: 'User unfollowed successfully' });
});

// Ambil profil pengguna tertentu
app.get('/api/users/:userId', requireAuth, (req, res) => {
  const { userId } = req.params;
  
  const user = data.users.find(u => u.id === userId || u.username === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isFollowing = data.follows.some(f => 
    f.followerId === req.session.userId && f.followingId === user.id
  );
  
  const { password, ...userWithoutPassword } = user;
  
  res.status(200).json({
    ...userWithoutPassword,
    isFollowing
  });
});

// Ambil statistik pengguna
app.get('/api/users/:userId/stats', requireAuth, (req, res) => {
  const { userId } = req.params;
  
  const user = data.users.find(u => u.id === userId || u.username === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const postCount = data.posts.filter(p => p.userId === user.id).length;
  const followerCount = data.follows.filter(f => f.followingId === user.id).length;
  const followingCount = data.follows.filter(f => f.followerId === user.id).length;

  res.status(200).json({
    postCount,
    followerCount,
    followingCount
  });
});

// Ambil daftar pengikut dan yang diikuti
app.get('/api/users/:userId/connections', requireAuth, (req, res) => {
  const { userId } = req.params;
  
  const user = data.users.find(u => u.id === userId || u.username === userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Ambil pengikut
  const followerIds = data.follows
    .filter(f => f.followingId === user.id)
    .map(f => f.followerId);
  
  const followers = data.users
    .filter(u => followerIds.includes(u.id))
    .map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      profilePicture: u.profilePicture || null
    }));

  // Ambil yang diikuti
  const followingIds = data.follows
    .filter(f => f.followerId === user.id)
    .map(f => f.followingId);
  
  const following = data.users
    .filter(u => followingIds.includes(u.id))
    .map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      profilePicture: u.profilePicture || null
    }));

  res.status(200).json({ followers, following });
});

// Endpoint unggah foto profil
app.post('/api/profile/picture', requireAuth, upload.single('profilePicture'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const userId = req.session.userId;
  const userIndex = data.users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Perbarui jalur foto profil pengguna
  const profilePicturePath = `/src/assets/profile_pictures/${req.file.filename}`;
  data.users[userIndex].profilePicture = profilePicturePath;

  if (!saveData()) {
    return res.status(500).json({ message: 'Failed to save profile picture' });
  }

  // Perbarui sesi
  req.session.user.profilePicture = profilePicturePath;

  res.status(200).json({ 
    message: 'Profile picture updated successfully',
    profilePicture: profilePicturePath
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, (err) => {
  if (err) {
    console.error(`Error: ${err.message}`);
  } else {
    console.log(`Server listening on port ${PORT}...`);
  }
});