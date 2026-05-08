# Secret Ads Academy — Plataforma de Examen

Plataforma de certificación tipo Kahoot custom para Secret Ads Academy. Construida con Next.js 16, Supabase y Tailwind 4.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19)
- **TypeScript** + **Tailwind CSS 4**
- **Supabase** (Auth + Postgres + Storage)
- **shadcn/ui** (componentes UI)
- **react-hook-form** + **zod** (formularios)
- Deploy en **Vercel**

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) → New Project.
2. En **Settings → API**, copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. En **SQL Editor**, ejecuta el contenido de [`supabase/schema.sql`](./supabase/schema.sql) para crear todas las tablas.
4. (Opcional) En **Storage**, verifica que el bucket `question-images` se haya creado.

### 3. Variables de entorno

Copia `.env.local.example` como `.env.local` y rellena los valores.

```bash
cp .env.local.example .env.local
```

### 4. Añadir emails a la whitelist (de prueba)

En el SQL Editor de Supabase:

```sql
insert into public.whitelist (email) values
  ('tucorreo@ejemplo.com'),
  ('alumno1@ejemplo.com');
```

### 5. Levantar el dev server

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

```
src/
├── app/
│   ├── page.tsx              # Landing + login alumno
│   ├── layout.tsx            # Root layout
│   ├── exam/                 # Examen (Fase 2)
│   ├── admin/                # Panel admin (Fase 3)
│   └── actions/              # Server Actions
├── components/
│   ├── ui/                   # shadcn/ui
│   ├── brand-logo.tsx
│   └── student-login-form.tsx
├── lib/
│   ├── supabase/             # Clients (server + browser)
│   ├── session.ts            # Cookies de sesión
│   └── validation.ts         # Schemas zod
└── types/
    └── database.ts           # Tipos de Supabase

supabase/
└── schema.sql                # Schema completo
```

## Branding

- **Rosa principal:** `#EC4899`
- **Rosa oscuro:** `#BE185D`
- **Magenta profundo:** `#831843`

El logo placeholder está en `public/logo.svg`. **Reemplázalo con el logo real** dejando el archivo en la misma ruta (puede ser `.png` o `.svg`, ajusta el import en `src/components/brand-logo.tsx` si es PNG).

## Roadmap

| Fase | Estado | Descripción |
|------|--------|-------------|
| 0 — Setup | ✅ | Next.js + Supabase + Vercel + branding base |
| 1 — Login alumno | ✅ | Landing + registro con whitelist |
| 2 — Examen Kahoot | ⏳ | UI pregunta/pantalla, timer, randomización |
| 3 — Panel admin | ⏳ | CRUD preguntas, whitelist, intentos |
| 4 — Informes + cert | ⏳ | Export CSV + certificado PDF |
| 5 — Producción | ⏳ | Anti-trampa + dominio + QA |

## Scripts

```bash
npm run dev      # Dev server (Turbopack)
npm run build    # Build de producción
npm run start    # Arrancar build de producción
npm run lint     # ESLint
```
