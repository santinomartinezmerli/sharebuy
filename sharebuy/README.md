# ShareBuy 🛍️

> Red social para compartir y reseñar compras — Social network for sharing and reviewing purchases.

**Live demo:** [sharebuy.netlify.app](https://sharebuy.netlify.app)

---

## ¿Qué es ShareBuy?

ShareBuy es una PWA mobile-first donde los usuarios pueden compartir sus compras con amigos, escribir reseñas después de usar el producto, y descubrir qué están comprando otras personas. Es como Instagram, pero enfocado en el consumo real: sin presión estética, sin filtros, solo compartir lo que compraste y cómo te fue.

La app también permite marcar productos en venta, con un historial de dueños que hace la compraventa más transparente y confiable.

---

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite |
| Estilos | Tailwind CSS v4 |
| Animaciones | Framer Motion |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth + Email) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (mensajes, notificaciones) |
| Deploy | Netlify |
| PWA | manifest.json + service worker |

---

## Features

### Social
- Feed principal filtrado por usuarios seguidos
- Stories de compras recientes (últimas 24hs)
- Sistema de likes con contador en tiempo real
- Comentarios en posts
- Seguir / dejar de seguir usuarios
- Mensajes directos con fotos adjuntas, editar/borrar mensajes, recibos de leído e indicador de escritura en tiempo real
- Bookmarks / guardados
- Reportar posts y bloquear usuarios

### Compras
- Publicar compras con hasta 6 fotos (carrusel)
- Campos opcionales: precio, marca, dónde se compró, categoría
- Marcar producto en venta con precio de venta diferenciado
- Historial de dueños de un producto

### Reviews
- Recordatorio automático al mes de la compra para escribir una review
- Segunda review a los 6 meses
- Rating con estrellas + texto + recomendación (👍/👎)
- Puntaje promedio y % de recomendación visible en detalle del producto

### Explorar
- Grilla tipo Pinterest con posts de toda la comunidad
- Búsqueda de productos y marcas
- Búsqueda de usuarios por username
- Filtros por categoría (Ropa, Tecnología, Hogar, Deporte, Belleza)

### UX / Performance
- Dark mode persistente
- Infinite scroll con skeleton loading (IntersectionObserver)
- Pull to refresh
- Transiciones con Framer Motion
- PWA instalable desde el navegador (Android e iOS)
- Optimistic UI en likes, follows y bookmarks

---

## Decisiones técnicas

**¿Por qué Supabase?**
Supabase ofrece PostgreSQL con Row Level Security, Auth con OAuth incluido, Storage para imágenes y Realtime sobre WebSockets, todo en un mismo servicio. Para una red social donde las relaciones entre datos son importantes (usuarios → posts → likes → follows → mensajes), un modelo relacional fue más adecuado que MongoDB.

**¿Por qué React + Vite en vez de Next.js?**
ShareBuy es una SPA mobile-first. No necesitaba SSR ni SSG, y Vite ofrece un DX mucho más rápido para desarrollo iterativo. La PWA se configuró manualmente sobre Vite.

**¿Por qué Tailwind v4?**
Tailwind v4 con el plugin de Vite elimina el paso de compilación separado y mejora el performance del build. El dark mode se implementó con las variantes nativas de v4.

**Realtime sin polling**
Los mensajes directos y el badge de mensajes no leídos usan `supabase.channel()` con `postgres_changes`, evitando polling y manteniendo la UI sincronizada sin recargas.

---

## Estructura del proyecto

```
src/
  components/       # Componentes reutilizables (Avatar, Layout, StoryViewer...)
  pages/            # Una página por ruta (Feed, Explore, Profile, Chat...)
  lib/
    supabase.js     # Cliente de Supabase
```

---

## Base de datos

El schema completo está en `supabase-migrations.sql`. Las tablas principales son:

- `profiles` — extiende auth.users con username, bio, avatar
- `posts` — publicaciones con imagen, producto, precio, categoría
- `likes`, `comments`, `saves` — interacciones sociales
- `follows` — grafo de seguidores
- `conversations`, `messages` — mensajes directos
- `reviews` — reseñas con rating, texto y recomendación
- `reports`, `blocked_users` — moderación

Todas las tablas tienen Row Level Security habilitado.

---

## Instalación local

```bash
git clone https://github.com/santinomartinezmerli/Share_buy.git
cd Share_buy
npm install
```

Creá un archivo `.env` con tus credenciales de Supabase:

```
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

```bash
npm run dev
```

---

## Autor

**Santino Martinez Merli**
Estudiante de Analista en Sistemas — ORT Argentina
[LinkedIn](https://www.linkedin.com/in/santino-mart%C3%ADnez-merli-683473214/) · [GitHub](https://github.com/santinomartinezmerli)
