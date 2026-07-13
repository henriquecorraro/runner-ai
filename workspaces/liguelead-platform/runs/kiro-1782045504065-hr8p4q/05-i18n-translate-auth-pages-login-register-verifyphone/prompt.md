You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: i18n-translate-auth-pages-login-register-verifyphone
Title: i18n: Translate Auth pages (Login, Register, VerifyPhone)

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## platform-front
Repository label: Platform Frontend
Repository root: /home/rick/projetos/platform-front

Repository guidance:
- Docs hints: Keep repository-local feature docs in docs/features aligned with routes used by the UI, service payloads, and important UX constraints.; Prefer expanding human docs feature by feature inside the repository as coverage grows.
- Default validation: npm run lint ; npm run build

### i18n-translate-auth-pages-login-register-verifyphone
Task id: i18n-translate-auth-pages-login-register-verifyphone
Task title: i18n: Translate Auth pages (Login, Register, VerifyPhone)
Task status: open
Task scope: i18n
Task validation: npm run lint ; npm run build

```md
## Scope

Translate Auth pages: Login, Register, VerifyPhone. Namespace: `auth`.

## Files to modify

- `src/pages/Auth/Login/Login.tsx`
- `src/pages/Auth/Register/Register.tsx`
- `src/pages/Auth/VerifyPhone/VerifyPhone.tsx`

## Create namespace locale files

### `src/i18n/locales/pt-BR/auth.json`

```json
{
  "login": {
    "eyebrow": "Área do cliente",
    "title": "Entrar",
    "description": "Entre para acessar sua operação na LigueLead, acompanhar tags e seguir com suas rotinas de comunicação e gestão de leads.",
    "loginLabel": "Login",
    "loginPlaceholder": "Digite seu login",
    "passwordLabel": "Senha",
    "passwordPlaceholder": "Digite sua senha",
    "submitButton": "Entrar",
    "submitting": "Entrando...",
    "noAccountLink": "Ainda não tem conta?",
    "createAccountLink": "Criar conta",
    "errors": {
      "fallback": "Não foi possível autenticar agora. Tente novamente.",
      "badRequest": "Informe login e senha para entrar.",
      "unauthorized": "Dados informados inválidos"
    }
  },
  "register": {
    "eyebrow": "Nova conta",
    "title": "Criar conta",
    "description": "Crie seu acesso para iniciar a operação com leads, tags e créditos de teste.",
    "nameLabel": "Nome",
    "namePlaceholder": "Digite seu nome",
    "companyLabel": "Empresa",
    "companyPlaceholder": "Nome da empresa",
    "emailLabel": "E-mail",
    "emailPlaceholder": "voce@empresa.com",
    "phoneLabel": "Telefone",
    "phonePlaceholder": "11999999999",
    "passwordLabel": "Senha",
    "passwordPlaceholder": "Mínimo de 8 caracteres",
    "submitButton": "Criar conta",
    "submitting": "Criando...",
    "hasAccountLink": "Já tem conta?",
    "loginLink": "Entrar",
    "success": "Conta criada com sucesso!",
    "errors": {
      "fallback": "Não foi possível criar a conta agora. Tente novamente.",
      "conflict": "Já existe uma conta ativa com esse e-mail.",
      "validation": "Revise os dados informados para criar a conta."
    }
  },
  "verifyPhone": {
    "eyebrow": "Verificação",
    "title": "Verificação de telefone",
    "description": "Enviamos um código de 6 dígitos para o seu telefone. Digite-o abaixo para continuar.",
    "codeLabel": "Código de verificação",
    "codePlaceholder": "000000",
    "submitButton": "Verificar",
    "submitting": "Verificando...",
    "resendCountdown": "Reenviar código em {{countdown}}s",
    "resendButton": "Reenviar código",
    "resendSuccess": "Código reenviado com sucesso.",
    "success": "Telefone verificado com sucesso!",
    "errors": {
      "invalidCode": "Código inválido. {{attemptsRemaining}} tentativas restantes.",
      "tokenExpired": "Código expirado. Solicite um novo código.",
      "blocked": "Muitas tentativas. Tente novamente em {{minutes}} minutos.",
      "tooManyRequests": "Muitas solicitações. Aguarde antes de reenviar.",
      "fallback": "Erro ao validar o código. Tente novamente.",
      "sendFallback": "Falha ao reenviar o código. Tente novamente."
    }
  }
}
```

### `src/i18n/locales/es-ES/auth.json`

```json
{
  "login": {
    "eyebrow": "Área del cliente",
    "title": "Iniciar sesión",
    "description": "Inicie sesión para acceder a su operación en LigueLead, seguir tags y continuar con sus rutinas de comunicación y gestión de leads.",
    "loginLabel": "Login",
    "loginPlaceholder": "Ingrese su login",
    "passwordLabel": "Contraseña",
    "passwordPlaceholder": "Ingrese su contraseña",
    "submitButton": "Iniciar sesión",
    "submitting": "Iniciando sesión...",
    "noAccountLink": "¿Aún no tiene cuenta?",
    "createAccountLink": "Crear cuenta",
    "errors": {
      "fallback": "No fue posible autenticar. Intente nuevamente.",
      "badRequest": "Ingrese login y contraseña para entrar.",
      "unauthorized": "Datos ingresados inválidos"
    }
  },
  "register": {
    "eyebrow": "Nueva cuenta",
    "title": "Crear cuenta",
    "description": "Cree su acceso para iniciar la operación con leads, tags y créditos de prueba.",
    "nameLabel": "Nombre",
    "namePlaceholder": "Ingrese su nombre",
    "companyLabel": "Empresa",
    "companyPlaceholder": "Nombre de la empresa",
    "emailLabel": "E-mail",
    "emailPlaceholder": "usted@empresa.com",
    "phoneLabel": "Teléfono",
    "phonePlaceholder": "11999999999",
    "passwordLabel": "Contraseña",
    "passwordPlaceholder": "Mínimo de 8 caracteres",
    "submitButton": "Crear cuenta",
    "submitting": "Creando...",
    "hasAccountLink": "¿Ya tiene cuenta?",
    "loginLink": "Iniciar sesión",
    "success": "¡Cuenta creada con éxito!",
    "errors": {
      "fallback": "No fue posible crear la cuenta. Intente nuevamente.",
      "conflict": "Ya existe una cuenta activa con ese e-mail.",
      "validation": "Revise los datos ingresados para crear la cuenta."
    }
  },
  "verifyPhone": {
    "eyebrow": "Verificación",
    "title": "Verificación de teléfono",
    "description": "Enviamos un código de 6 dígitos a su teléfono. Ingréselo abajo para continuar.",
    "codeLabel": "Código de verificación",
    "codePlaceholder": "000000",
    "submitButton": "Verificar",
    "submitting": "Verificando...",
    "resendCountdown": "Reenviar código en {{countdown}}s",
    "resendButton": "Reenviar código",
    "resendSuccess": "Código reenviado con éxito.",
    "success": "¡Teléfono verificado con éxito!",
    "errors": {
      "invalidCode": "Código inválido. {{attemptsRemaining}} intentos restantes.",
      "tokenExpired": "Código expirado. Solicite un nuevo código.",
      "blocked": "Demasiados intentos. Intente nuevamente en {{minutes}} minutos.",
      "tooManyRequests": "Demasiadas solicitudes. Espere antes de reenviar.",
      "fallback": "Error al validar el código. Intente nuevamente.",
      "sendFallback": "Falla al reenviar el código. Intente nuevamente."
    }
  }
}
```

### `src/i18n/locales/en/auth.json`

```json
{
  "login": {
    "eyebrow": "Client area",
    "title": "Sign in",
    "description": "Sign in to access your LigueLead operation, track tags and continue with your communication and lead management routines.",
    "loginLabel": "Login",
    "loginPlaceholder": "Enter your login",
    "passwordLabel": "Password",
    "passwordPlaceholder": "Enter your password",
    "submitButton": "Sign in",
    "submitting": "Signing in...",
    "noAccountLink": "Don't have an account yet?",
    "createAccountLink": "Create account",
    "errors": {
      "fallback": "Could not authenticate now. Try again.",
      "badRequest": "Enter login and password to sign in.",
      "unauthorized": "Invalid credentials"
    }
  },
  "register": {
    "eyebrow": "New account",
    "title": "Create account",
    "description": "Create your access to start operations with leads, tags and trial credits.",
    "nameLabel": "Name",
    "namePlaceholder": "Enter your name",
    "companyLabel": "Company",
    "companyPlaceholder": "Company name",
    "emailLabel": "Email",
    "emailPlaceholder": "you@company.com",
    "phoneLabel": "Phone",
    "phonePlaceholder": "11999999999",
    "passwordLabel": "Password",
    "passwordPlaceholder": "Minimum 8 characters",
    "submitButton": "Create account",
    "submitting": "Creating...",
    "hasAccountLink": "Already have an account?",
    "loginLink": "Sign in",
    "success": "Account created successfully!",
    "errors": {
      "fallback": "Could not create account now. Try again.",
      "conflict": "An active account with this email already exists.",
      "validation": "Review the data entered to create the account."
    }
  },
  "verifyPhone": {
    "eyebrow": "Verification",
    "title": "Phone verification",
    "description": "We sent a 6-digit code to your phone. Enter it below to continue.",
    "codeLabel": "Verification code",
    "codePlaceholder": "000000",
    "submitButton": "Verify",
    "submitting": "Verifying...",
    "resendCountdown": "Resend code in {{countdown}}s",
    "resendButton": "Resend code",
    "resendSuccess": "Code resent successfully.",
    "success": "Phone verified successfully!",
    "errors": {
      "invalidCode": "Invalid code. {{attemptsRemaining}} attempts remaining.",
      "tokenExpired": "Code expired. Request a new code.",
      "blocked": "Too many attempts. Try again in {{minutes}} minutes.",
      "tooManyRequests": "Too many requests. Wait before resending.",
      "fallback": "Error validating code. Try again.",
      "sendFallback": "Failed to resend code. Try again."
    }
  }
}
```

## Register namespace in i18n config

Add `auth` namespace imports to `src/i18n/index.ts` resources.

## Interpolation

- `verifyPhone.errors.invalidCode`: `{{attemptsRemaining}}` (number)
- `verifyPhone.errors.blocked`: `{{minutes}}` (number)
- `verifyPhone.resendCountdown`: `{{countdown}}` (number)

## Constraints

- Do NOT change form behavior, validation logic, or navigation.
- Replace all hardcoded PT-BR strings with `t()` calls using `useTranslation('auth')`.

## Validation

```bash
npm run lint
npm run build
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1782045504065-hr8p4q/05-i18n-translate-auth-pages-login-register-verifyphone/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: i18n-translate-auth-pages-login-register-verifyphone
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
