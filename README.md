# Prode - Pronósticos Deportivos

Aplicación web de prode deportivo social. Predecí resultados de fútbol y competí con tus amigos.

## Stack

- **Frontend:** Next.js 16, Tailwind CSS 4, shadcn/ui, Zustand
- **Backend:** NestJS, Prisma, PostgreSQL, Redis, Socket.io
- **Monorepo:** Turborepo + pnpm workspaces

## Inicio rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar PostgreSQL y Redis
docker-compose up -d

# 3. Copiar variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 4. Generar cliente Prisma y migrar
pnpm db:generate
pnpm db:migrate

# 5. Iniciar desarrollo
pnpm dev
```

## Estructura

```
prode/
├── apps/
│   ├── web/          # Next.js 16 frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── shared/       # Tipos e interfaces compartidas
│   └── config/       # Configuración compartida (tsconfig, eslint)
├── docker-compose.yml
└── turbo.json
```
