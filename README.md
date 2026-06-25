# ShareBuy 🛍️

> **Social network for sharing and reviewing purchases.**  
> Discover what people are buying, share your own finds, and connect with others through the things you love.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-sharebuy.netlify.app-brightgreen?style=for-the-badge&logo=netlify)](https://sharebuy.netlify.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)

---

## 📱 Preview

| Feed & Stories | Post & Sell | Chats |
|:-:|:-:|:-:|
| ![Feed](/assets/feed.gif) | ![Sell & Stories](/assets/sellAndStories.gif) | ![Chats](/assets/chats.gif) |

| Profile | Notifications |
|:-:|:-:|
| ![Profile](/assets/profile.gif) | ![Notifications](/assets/notifications.gif) |

---

## ✨ Features

- **Social Feed** — scroll through purchases from people you follow, with multi-image posts and brand tags
- **Stories** — ephemeral stories tied to your purchases, Instagram-style
- **Post a Purchase** — upload photos, add brand, price, rating and a review
- **Likes & Comments** — real-time interactions powered by Supabase
- **Follow System** — follow users and build your own feed
- **Direct Messages** — real-time DMs via Supabase Realtime channels
- **Notifications** — get notified on likes, comments, follows and more
- **Bookmarks** — save posts to revisit later
- **Explore & Search** — discover users and purchases
- **User Profiles** — grid view of all your purchases, followers/following count
- **Google OAuth** — one-click sign in
- **Dark Mode** — full dark UI out of the box
- **PWA** — installable on mobile, works offline

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime Channels |
| Deployment | Netlify |

---

## 🗄️ Database Schema (simplified)

```
users          → id, username, avatar_url, bio
posts          → id, user_id, images[], brand, price, rating, caption
likes          → user_id, post_id
comments       → id, user_id, post_id, content
follows        → follower_id, following_id
notifications  → id, user_id, type, from_user_id, post_id
messages       → id, sender_id, receiver_id, content, channel_id
stories        → id, user_id, post_id, expires_at
bookmarks      → user_id, post_id
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repo
git clone https://github.com/santinomartinezmerli/Share_buy.git
cd Share_buy

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Supabase URL and anon key
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup

Run the included migrations file against your Supabase project:

```bash
# Via Supabase CLI
supabase db push --db-url your_db_url < supabase/migrations/001_add_indexes.sql
```

Or paste the migration directly into the Supabase SQL editor.

### Run locally

```bash
npm run dev
```

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Feed/
│   ├── Stories/
│   ├── Post/
│   ├── Profile/
│   ├── Chat/
│   └── Notifications/
├── pages/            # Route-level views
├── hooks/            # Custom React hooks
├── lib/              # Supabase client config + UserContext
└── utils/            # Helper functions
```

---

## 🔭 Roadmap

- [x] UserContext + custom hooks for scalability
- [ ] TanStack Query for server state management
- [ ] Push notifications (Web Push API)
- [ ] Purchase review reminders
- [ ] Trending posts / explore algorithm
- [ ] Price history tracking

---

## 👤 Author

**Santino Martinez Merli**  
Systems Analyst Student @ ORT Argentina  
[GitHub](https://github.com/santinomartinezmerli) · [Email](mailto:santinomartinezmerli@gmail.com)

---

> Built as a portfolio project and genuine product idea. Feedback welcome.
