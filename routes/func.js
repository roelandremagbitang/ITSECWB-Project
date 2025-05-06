// routes/func.js
const express = require('express');
const router = express.Router();

// In-memory stores for posts and users
let posts = [];
let users = [];

// Dummy popularPosts array for sidebar (can be empty)
let popularPosts = [];

/**
 * Helper function to recursively find a comment (or reply)
 * from an array of comments given an array of indices.
 * For example, if indices = [0, 1, 0]:
 *   - It returns posts[id].comments[0].replies[1].replies[0]
 */
function findCommentByPath(comments, indices) {
  let current = null;
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    if (i === 0) {
      current = comments[index];
    } else {
      if (!current || !current.replies) return null;
      current = current.replies[index];
    }
    if (!current) return null;
  }
  return current;
}

// -------------------------
// Registration Routes
// -------------------------
router.get('/register', (req, res) => {
  res.render('registration', { title: 'Forum Friends - Register' });
});

router.post('/register', (req, res) => {
  const { username, email, password, confirmPassword, bio } = req.body;
  if (password !== confirmPassword) {
    return res.render('registration', {
      title: 'Forum Friends - Register',
      error: 'Passwords do not match.',
      formData: req.body
    });
  }
  if (users.find(u => u.username === username)) {
    return res.render('registration', {
      title: 'Forum Friends - Register',
      error: 'Username already exists.',
      formData: req.body
    });
  }
  const newUser = { 
    username, 
    email, 
    password, 
    bio: bio || "",
    picture: '/images/blank-profile-picture.png'
  };
  users.push(newUser);
  res.redirect('/login');
});

// -------------------------
// Login Routes
// -------------------------
router.get('/login', (req, res) => {
  const rememberedUsername = req.cookies.rememberedUsername || '';
  const rememberedPassword = req.cookies.rememberedPassword || '';
  res.render('login', { 
    title: 'Forum Friends - Login', 
    rememberedUsername, 
    rememberedPassword 
  });
});

router.post('/login', (req, res) => {
  const { username, password, rememberMe } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    req.session.user = username;
    if (rememberMe) {
      // NOTE: Storing a password in plain text is not secure!
      res.cookie('rememberedUsername', username, { maxAge: 21 * 24 * 60 * 60 * 1000 });
      res.cookie('rememberedPassword', password, { maxAge: 21 * 24 * 60 * 60 * 1000 });
    } else {
      res.clearCookie('rememberedUsername');
      res.clearCookie('rememberedPassword');
    }
    return res.redirect('/home');
  } else {
    return res.render('login', {
      title: 'Forum Friends - Login',
      error: "Either the email does not exist or the password is incorrect."
    });
  }
});


// -------------------------
// Profile Editing Feature (NEW)
// -------------------------
router.post('/edit-profile/:username', (req, res) => {
  const { newUsername, bio, profilePictureURL } = req.body;
  let user = users.find(u => u.username === req.params.username);

  if (!user) {
      return res.status(404).send("User not found.");
  }

  // Ensure new username is unique (if changed)
  if (newUsername && newUsername !== user.username) {
      if (users.some(u => u.username === newUsername)) {
          return res.render('edit-profile', {
              title: 'Edit Profile - Forum Friends',
              profile: user,
              error: 'Username is already taken.'
          });
      }
      user.username = newUsername;
  }

  // Update profile details
  user.bio = bio;
  if (profilePictureURL && profilePictureURL.trim() !== "") {
      user.picture = profilePictureURL;
  }

  // Redirect to the updated profile
  res.redirect(`/profile/${user.username}`);
});

// -------------------------
// Fetch Latest Posts & Comments for Profile (NEW)
// -------------------------
router.get('/profile/:username', (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (!user) {
      return res.status(404).send("User not found.");
  }

  // Get latest 3 posts
  const latestPosts = posts
      .filter(post => post.author === user.username)
      .slice(-3)
      .map((post, index) => ({ ...post, id: index }));

  // Get latest 3 comments
  let userComments = [];
  posts.forEach((post, postIndex) => {
      post.comments.forEach((comment, commentIndex) => {
          if (comment.author === user.username) {
              userComments.push({
                  text: comment.text,
                  timestamp: comment.timestamp,
                  postTitle: post.title,
                  postId: postIndex
              });
          }
      });
  });
  const latestComments = userComments.slice(-3);

  res.render('profile', {
      title: `${user.username} - Profile`,
      profile: user,
      latestPosts,
      latestComments
  });
});

// -------------------------
// Post & Comment Routes
// -------------------------
router.get('/home', (req, res) => {
  updatePopularPosts(); // Ensure popular posts are updated

  const { category, tags } = req.query; // Get selected category and tags
  let filteredPosts = posts;

  // Apply category filter if selected and valid
  if (category && ["Technology", "Gaming", "Design"].includes(category)) {
    filteredPosts = filteredPosts.filter(post => post.category === category);
  }

  // Apply tag filter if tags are provided
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
    filteredPosts = filteredPosts.filter(post => {
        // Ensure post.tags is an array before calling .some()
        if (!Array.isArray(post.tags)) {
            return false; // Skip posts that don't have valid tags
        }
        return post.tags.some(tag => tagArray.includes(tag.toLowerCase()));
    });
}


const profilePictures = {};
users.forEach(user => {
    profilePictures[user.username] = user.picture || "/images/blank-profile-picture.png";
});

res.render('home', {
    title: 'Forum Friends - Home',
    posts: filteredPosts,
    popularPosts,
    user: users.find(u => u.username === req.session.user),
    profilePictures // Pass latest profile pictures
});


});


router.get('/create-post', (req, res) => {
  res.render('create-post', { title: 'Forum Friends - Create Post' });
});


// Creating a Post (lines handling /create-post)

router.post('/create-post', (req, res) => {
  const { postTitle, postContent, postTags, postCategory } = req.body;
  
  // Ensure only valid categories are allowed
  const allowedCategories = ["Technology", "Gaming", "Design"];
  const category = allowedCategories.includes(postCategory) ? postCategory : "Technology";

  const user = users.find(u => u.username === req.session.user);
  const profilePicture = user && user.picture ? user.picture : "/images/blank-profile-picture.png"; // Default if none

  const newPost = {
      title: postTitle,
      content: postContent,
      author: req.session.user || 'Anonymous',
      profilePicture: profilePicture, // Add profile picture
      timestamp: new Date().toLocaleString(),
      tags: postTags ? postTags.split(',').map(tag => tag.trim()) : [], 
      category: category,
      votes: 0,
      comments: [],
      voters: {}
  };
  posts.push(newPost);
  res.redirect('/home');
});


// Function to get top 3 most upvoted posts
function updatePopularPosts() {
  popularPosts = posts
    .map((post, index) => ({ ...post, id: index })) // Ensure each post keeps its original ID
    .sort((a, b) => b.votes - a.votes) // Sort by highest votes
    .slice(0, 3); // Keep only the top 3
}

// Upvote a post
router.post('/post/:id/upvote', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (posts[id]) {
    const user = req.session.user;
    if (!user) return res.redirect('/login');

    const previousVote = posts[id].voters[user] || 0;

    if (previousVote === 1) {
      posts[id].votes -= 1;
      delete posts[id].voters[user];
    } else if (previousVote === -1) {
      posts[id].votes += 2;
      posts[id].voters[user] = 1;
    } else {
      posts[id].votes += 1;
      posts[id].voters[user] = 1;
    }
    
    updatePopularPosts(); // Update popular posts after voting
  }
  res.redirect(`/post/${id}`);
});

// Downvote a post
router.post('/post/:id/downvote', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (posts[id]) {
    const user = req.session.user;
    if (!user) return res.redirect('/login');

    const previousVote = posts[id].voters[user] || 0;

    if (previousVote === -1) {
      posts[id].votes += 1;
      delete posts[id].voters[user];
    } else if (previousVote === 1) {
      posts[id].votes -= 2;
      posts[id].voters[user] = -1;
    } else {
      posts[id].votes -= 1;
      posts[id].voters[user] = -1;
    }
    
    updatePopularPosts(); // Update popular posts after voting
  }
  res.redirect(`/post/${id}`);
});



// Ensure post details page includes updated popular posts
router.get('/post/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const post = posts[id];
  if (!post) return res.redirect('/home');

  const user = users.find(u => u.username === req.session.user);

  res.render('post-details', {
      title: 'Forum Friends - Post Details',
      post,
      postIndex: id,
      popularPosts,
      user // Pass the logged-in user
  });
});

// This function is for Post Deletion
router.post('/post/:id/delete', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (posts[id]) {
    posts.splice(id, 1);
  }
  res.redirect('/home');
});

router.post('/post/:id/edit', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { postTitle, postContent, postTags, postImage } = req.body;
  if (posts[id]) {
    posts[id].title = postTitle;
    posts[id].content = postContent;
    posts[id].tags = postTags;
    posts[id].image = postImage;
  }
  res.redirect(`/post/${id}`);
});




// -------------------------
// Comments (Top-Level)
// -------------------------
router.post('/post/:id/comment', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { commentText } = req.body;
  if (!posts[id]) return res.redirect('/home');
  const newIndex = posts[id].comments.length;
  const newComment = {
    text: commentText,
    author: req.session.user || 'Anonymous',
    timestamp: new Date().toLocaleString(),
    votes: 0,
    replies: [],
    path: String(newIndex),
    voters: {} // Initialize voters for tracking individual votes
  };
  posts[id].comments.push(newComment);
  req.session.commentMessage = "Your comment has been posted successfully.";
  res.redirect(`/post/${id}`);
});


router.post('/post/:id/comment/:cid/upvote', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cid = parseInt(req.params.cid, 10);
  if (posts[id] && posts[id].comments[cid]) {
    posts[id].comments[cid].votes++;
  }
  res.redirect(`/post/${id}`);
});

router.post('/post/:id/comment/:cid/downvote', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cid = parseInt(req.params.cid, 10);
  if (posts[id] && posts[id].comments[cid]) {
    posts[id].comments[cid].votes--;
  }
  res.redirect(`/post/${id}`);
});


// The Route Code for editing a comment
router.post('/post/:id/comment/:cid/edit', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cid = parseInt(req.params.cid, 10);
  const { commentText } = req.body;
  if (posts[id] && posts[id].comments[cid]) {
    posts[id].comments[cid].text = commentText;
    posts[id].comments[cid].timestamp = new Date().toLocaleString() + " (edited)";
  }
  res.redirect(`/post/${id}`);
});

// The Route Code for Comment Deletion
router.post('/post/:id/comment/:cid/delete', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cid = parseInt(req.params.cid, 10);
  if (posts[id] && posts[id].comments[cid]) {
    posts[id].comments.splice(cid, 1);
  }
  res.redirect(`/post/${id}`);
});

// -------------------------
// Nested Replies
// -------------------------
// This route handles both voting and adding nested replies for unlimited nesting.
// It expects a hidden field "path" that is a dash-separated string (e.g. "0", "0-1", "0-1-0", etc.)
router.post('/post/:id/comment/reply', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { replyText, path, action } = req.body;
  
  if (!posts[id]) return res.redirect('/home');
  
  // Handle voting on nested replies
  // Nested Replies - Voting section
// This block handles voting on nested comments (including top-level comments as well).
if (action === 'upvoteNested' || action === 'downvoteNested') {
  if (!path) return res.redirect(`/post/${id}`);
  const indices = path.split('-').map(num => parseInt(num, 10));
  const target = findCommentByPath(posts[id].comments, indices);
  if (target) {
    // Ensure the target comment has a voters object.
    if (!target.voters) {
      target.voters = {};
    }
    const user = req.session.user;
    if (!user) return res.redirect('/login');

    const previousVote = target.voters[user] || 0;
    if (action === 'upvoteNested') {
      if (previousVote === 1) {
        // Cancel upvote: subtract 1.
        target.votes -= 1;
        delete target.voters[user];
      } else if (previousVote === -1) {
        // Switch from downvote to upvote: add 2.
        target.votes += 2;
        target.voters[user] = 1;
      } else {
        // No vote: add upvote.
        target.votes += 1;
        target.voters[user] = 1;
      }
    } else if (action === 'downvoteNested') {
      if (previousVote === -1) {
        // Cancel downvote: add 1.
        target.votes += 1;
        delete target.voters[user];
      } else if (previousVote === 1) {
        // Switch from upvote to downvote: subtract 2.
        target.votes -= 2;
        target.voters[user] = -1;
      } else {
        // No vote: add downvote.
        target.votes -= 1;
        target.voters[user] = -1;
      }
    }
  }
  return res.redirect(`/post/${id}`);
}


  
  // Adding a new nested reply
  if (!path) return res.redirect(`/post/${id}`);
  const indices = path.split('-').map(num => parseInt(num, 10));
  let parent = findCommentByPath(posts[id].comments, indices);
  if (!parent) return res.redirect(`/post/${id}`);
  
  // Ensure parent's replies array exists
  if (!parent.replies) {
    parent.replies = [];
  }
  
  const replyIndex = parent.replies.length;
  const newPath = parent.path + '-' + replyIndex;
  const newReply = {
    text: replyText,
    author: req.session.user || 'Anonymous',
    timestamp: new Date().toLocaleString(),
    votes: 0,
    replies: [],
    path: newPath
  };
  parent.replies.push(newReply);
  
  res.redirect(`/post/${id}`);
});

// -------------------------
// Profile & Edit Profile
// -------------------------
router.get('/profile/:username', (req, res) => {
  const profileUser = users.find(u => u.username === req.params.username);
  if (!profileUser) {
    return res.status(404).send("User not found.");
  }
  
  // Get latest posts and comments for profileUser ...
  const latestPosts = posts
    .filter(post => post.author === profileUser.username)
    .slice(-3)
    .map((post, index) => ({ ...post, id: index }));
  
  let userComments = [];
  posts.forEach((post, postIndex) => {
    post.comments.forEach((comment) => {
      if (comment.author === profileUser.username) {
        userComments.push({
          text: comment.text,
          timestamp: comment.timestamp,
          postTitle: post.title,
          postId: postIndex
        });
      }
    });
  });
  const latestComments = userComments.slice(-3);

  // Get the logged in user from the session (if any)
  const loggedInUser = users.find(u => u.username === req.session.user);
  
  res.render('profile', {
    title: `${profileUser.username} - Profile`,
    profile: profileUser,
    latestPosts,
    latestComments,
    user: loggedInUser  // Now available for the conditional check in the template
  });
});



router.get('/edit-profile', (req, res) => {
  const user = users.find(u => u.username === req.session.user);
  if (user && !user.picture) {
    user.picture = '/images/blank-profile-picture.png';
  }
  res.render('edit-profile', { title: 'Edit Profile - Forum Friends', profile: user });
});

router.post('/edit-profile/:username', (req, res) => {
  const { description, profilePictureURL } = req.body;
  let user = users.find(u => u.username === req.params.username);

  if (!user) {
      return res.status(404).send("User not found.");
  }

  // Update profile details
  user.bio = description;
  if (profilePictureURL && profilePictureURL.trim() !== "") {
      user.picture = profilePictureURL;
  }

  // Redirect to the updated profile
  res.redirect(`/profile/${user.username}`);
});


// -------------------------
// Logout
// -------------------------
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    res.redirect('/login');
  });
});

router.get('/', (req, res) => {
  res.redirect('/login'); // or '/home' if that's desired
});

// Route to View All Comments by a User
router.get('/profile/:username/comments', (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (!user) {
    return res.status(404).send("User not found.");
  }

  // Get all comments made by the user
  let userComments = [];
  posts.forEach((post, postIndex) => {
    post.comments.forEach((comment) => {
      if (comment.author === user.username) {
        userComments.push({
          text: comment.text,
          timestamp: comment.timestamp,
          postTitle: post.title,
          postId: postIndex
        });
      }
    });
  });

  res.render('view-comments', {
    title: `${user.username} - All Comments`,
    profile: user,
    allComments: userComments
  });
});

// Route to View All Posts by a User
router.get('/profile/:username/posts', (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (!user) {
    return res.status(404).send("User not found.");
  }

  // Get all posts by the user
  const userPosts = posts
      .filter(post => post.author === user.username)
      .map((post, index) => ({ ...post, id: index }));

  res.render('view-posts', {
    title: `${user.username} - All Posts`,
    profile: user,
    allPosts: userPosts
  });
});


module.exports = router;
