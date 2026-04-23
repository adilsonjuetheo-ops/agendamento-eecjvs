# Backend Role Validation (Obrigatório para produção)

Este app agora espera que o backend trate o perfil de acesso por `userRole`:

- `autorizado`
- `visitante`

## 1) Persistência de usuário

Adicionar campo no modelo de usuário:

```ts
userRole: "autorizado" | "visitante";
```

Regra recomendada de classificação no login/cadastro:

```ts
function deriveUserRole(email?: string | null): "autorizado" | "visitante" {
  const normalized = (email || "").trim().toLowerCase();
  const allowedDomains = ["@educacao.mg.gov.br", "@escola.com"];
  if (!normalized) return "visitante";
  if (normalized.endsWith("privaterelay.appleid.com")) return "visitante";
  return allowedDomains.some((domain) => normalized.endsWith(domain))
    ? "autorizado"
    : "visitante";
}
```

## 2) Atualização no login

Em todos os fluxos de autenticação (`/auth/login`, `/auth/register`, `/auth/google`, `/auth/apple`):

1. resolver email final do usuário;
2. calcular `userRole`;
3. persistir `userRole`;
4. retornar `userRole` no objeto do usuário (`/auth/me` e resposta de login).

## 3) Bloqueio server-side de ações críticas

Nunca confiar somente no frontend.

Exemplo para rota de criação de reserva:

```ts
if (req.user.userRole !== "autorizado") {
  return res.status(403).json({
    error: "Esta funcionalidade é exclusiva para usuários da instituição.",
    code: "ROLE_FORBIDDEN",
  });
}
```

Aplicar a mesma validação em rotas críticas como:

- criar agendamento
- cancelar/editar agendamento (se regra da instituição exigir)

## 4) Sign in with Apple

Endpoint esperado pelo app:

- `POST /api/auth/apple`

Payload:

```json
{
  "identityToken": "jwt",
  "authorizationCode": "optional",
  "fullName": "optional",
  "email": "optional"
}
```

No backend:

1. validar `identityToken` da Apple;
2. localizar/criar usuário;
3. tratar email relay/ausente como `visitante` por padrão;
4. emitir token da app;
5. retornar usuário com `userRole`.
