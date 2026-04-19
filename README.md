# Agendamento EECJVS

App mobile de agendamento de espaços físicos da E.E. Cel. José Venâncio de Souza.

## Estrutura

```
agendamento-eecjvs/
├── mobile/    ← Expo + React Native + NativeWind
└── backend/   ← Express + Drizzle ORM + PostgreSQL
```

---

## Backend — Deploy no Railway

### 1. Gerar hashes das senhas admin

```bash
cd backend
npm install
node -e "const b=require('bcryptjs'); console.log(b.hashSync('SUA_SENHA_AQUI', 10))"
```

### 2. Criar projeto no Railway

1. Acesse [railway.app](https://railway.app) e crie um novo projeto
2. Adicione um serviço **PostgreSQL** — copie a `DATABASE_URL`
3. Adicione um serviço **GitHub repo** apontando para `backend/`
4. Configure as variáveis de ambiente (Settings → Variables):

```
DATABASE_URL=postgresql://...  (copiado do serviço PostgreSQL)
JWT_SECRET=gere_um_secret_aleatorio_longo
JWT_EXPIRES_IN=7d
ADMIN_1_EMAIL=escola.184381.especialista@educacao.mg.gov.br
ADMIN_1_PASSWORD_HASH=$2b$10$...hash_gerado_acima...
ADMIN_2_EMAIL=escola.184381.pedagogico@educacao.mg.gov.br
ADMIN_2_PASSWORD_HASH=$2b$10$...hash_gerado_acima...
PORT=3000
NODE_ENV=production
```

5. O `railway.json` já configura o build e roda migrações automaticamente no deploy

### 3. Popular datas especiais

Após o primeiro deploy, execute localmente:

```bash
cd backend
DATABASE_URL="sua_url_do_railway" npm run db:seed
```

### 4. Testar o backend

```
GET https://seu-backend.railway.app/health
```

---

## Mobile — Build com EAS

### 1. Configurar ambiente

```bash
cd mobile
npm install
cp .env.example .env
# Edite .env com a URL do backend no Railway
```

### 2. Instalar EAS CLI e fazer login

```bash
npm install -g eas-cli
eas login
```

### 3. Configurar projeto EAS

```bash
eas build:configure
```

### 4. Build de preview (APK para teste)

```bash
eas build --profile preview --platform android
```

### 5. Build de produção

```bash
# Android (AAB para Play Store)
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

---

## Desenvolvimento local

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configure o DATABASE_URL com seu PostgreSQL local

npm run db:generate   # gera migration
npm run db:migrate    # aplica migration
npm run db:seed       # popula datas especiais
npm run dev           # inicia servidor em http://localhost:3000
```

### Mobile

```bash
cd mobile
npm install
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://localhost:3000

npx expo start        # abre no Expo Go ou emulador
```

---

## Espaços disponíveis

- Sala de Informática
- Laboratório de Ciências
- Quadra Poliesportiva
- Biblioteca

## Usuários admin (hardcoded)

Os dois admins são configurados via variáveis de ambiente e não aparecem na tabela `teachers`.
Login em: **app → tela de login → "Acesso Administrativo"**

## Regras de negócio

- Apenas emails `@educacao.mg.gov.br` podem se cadastrar
- Não é possível criar reservas no passado
- Feriados e férias bloqueiam reservas; recesso e sábado letivo não bloqueiam
- Conflito de sala e conflito de professor são verificados no backend
- Reset de senha é feito pelo MASP (sem email de recuperação)
- Apenas reservas futuras podem ser canceladas pelo professor
