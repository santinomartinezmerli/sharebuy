-- Migration: add core indexes for ShareBuy scalability
-- These indexes prevent full table scans on the most queried tables.
-- They are safe to create concurrently and can be rolled back with DROP INDEX.

-- Posts: profile grids and chronological feed
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON posts(created_at DESC);

-- Likes: like counts per post and "my liked posts"
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- Saves / Bookmarks
CREATE INDEX IF NOT EXISTS idx_saves_post_id ON saves(post_id);
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);

-- Follows: followers/following lists and follow status checks
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- Messages: conversation history ordered by time
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Comments: comment sections on posts
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Notifications: user notification feed
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
