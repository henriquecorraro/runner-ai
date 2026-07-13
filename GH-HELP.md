# GitHub Token Setup for Workspace AI Runner

Este guia explica como configurar o token do GitHub CLI (`gh`) para que o workspace-ai-runner consiga criar e mover cards no GitHub Projects v2.

## Scopes necessários

O token **Classic** precisa ter **todos** estes scopes:

| Scope | Para quê |
|-------|----------|
| `repo` | Acesso a repositórios (issues, PRs, código) |
| `read:org` | Leitura de dados da organização |
| `admin:public_key` | Upload de SSH keys via CLI |
| `project` | **Leitura e escrita em GitHub Projects v2** |

> ⚠️ **Use Classic Token, não Fine-grained.** Fine-grained tokens ainda não suportam bem GitHub Projects v2 e podem dar erro `missing required scopes` mesmo com permissões aparentemente corretas.

## Passo a passo

### 1. Crie um Classic Token

1. Acesse https://github.com/settings/tokens (aba **Tokens (classic)**)
2. Clique **Generate new token (classic)**
3. Marque os scopes: `repo`, `read:org`, `admin:public_key`, `project`
4. Gere e copie o token (`ghp_...`)

### 2. Autentique no `gh`

```bash
gh auth login
```

Siga as opções:
```
? Where do you use GitHub? → GitHub.com
? Preferred protocol for Git operations? → SSH
? Upload your SSH public key? → (selecione sua key, ex: ~/.ssh/id_ed25519.pub)
? How would you like to authenticate? → Paste an authentication token
? Paste your authentication token: → (cole o token classic)
```

### 3. Adicione scopes extras se necessário

Se o `gh` reclamar que falta algum scope (ex: `admin:public_key`), use o refresh:

```bash
gh auth refresh -h github.com -s admin:public_key
```

Isso vai gerar um **device code**. Exemplo:

```
! First copy your one-time code: C980-1BCD
Press Enter to open https://github.com/login/device in your browser...
```

> 🖥️ **Ambiente sem browser (WSL, servidor headless, container)?**
> O `gh` vai tentar abrir um navegador e falhar com erros tipo:
> ```
> xdg-open: no method available for opening '...'
> ```
> **Ignore os erros.** Abra manualmente no navegador do seu sistema:
> 1. Acesse https://github.com/login/device
> 2. Cole o one-time code mostrado no terminal
> 3. Autorize
> 4. Volte ao terminal — deve aparecer `✓ Authentication complete.`

### 4. Verifique

```bash
gh auth status
```

Deve mostrar:
```
✓ Logged in to github.com account SEU_USER
  Token scopes: 'admin:public_key', 'project', 'read:org', 'repo'
```

Teste acesso a Projects:
```bash
gh api graphql -f query='{ viewer { projectV2(number: 1) { title } } }'
```

## Troubleshooting

### `error validating token: HTTP 401: Bad credentials`

**Causa:** Token inválido, expirado, ou você está passando o valor literal `"SEU_TOKEN_AQUI"`.

**Solução:** Gere um novo token em https://github.com/settings/tokens e cole diretamente.

---

### `error validating token: missing required scopes 'repo', 'read:org'`

**Causa:** Você está usando um **Fine-grained token** ou um Classic token sem os scopes mínimos.

**Solução:** Crie um **Classic token** com `repo`, `read:org`, `admin:public_key` e `project`.

---

### `HTTP 404: Not Found` ao fazer upload de SSH key

```
HTTP 404: Not Found (https://api.github.com/user/keys?per_page=100)
This API operation needs the "admin:public_key" scope.
```

**Solução:**
```bash
gh auth refresh -h github.com -s admin:public_key
```

Siga o device flow (veja seção 3 acima).

---

### `INSUFFICIENT_SCOPES` — falta `read:project`

```
The 'projectV2' field requires one of the following scopes: ['read:project']
```

**Causa:** Token sem scope `project`.

**Solução:** Adicione o scope `project` ao token ou crie um novo com ele.

---

### `FORBIDDEN` — `addProjectV2ItemById` or issue creation

```
does not have the correct permissions to execute `addProjectV2ItemById`
```

**Causa:** O usuário autenticado não tem permissão de escrita no GitHub Project da organização ou permissão para criar issues no repositório.

**Solução:**
1. Abra `https://github.com/orgs/<org>/projects/<number>/settings`
2. Em **Manage access**, adicione o usuário com role **Write** ou **Admin**
3. Confirme que o usuário também pode criar issues nos repositórios vinculados

---

### `xdg-open: no method available for opening`

**Causa:** Ambiente sem navegador (WSL, SSH, container).

**Solução:** Abra https://github.com/login/device manualmente no navegador do seu sistema e cole o code exibido no terminal.

---

### Projeto errado configurado no workspace

Cards indo para o projeto errado? Verifique `workspace.config.json`:

```json
{
  "githubProject": {
    "url": "https://github.com/orgs/<org>/projects/<number>"
  }
}
```

Corrija `<number>` para o projeto correto.

## Resumo rápido

```bash
# 1. Login com classic token (repo + read:org + admin:public_key + project)
gh auth login

# 2. Se precisar adicionar scope depois:
gh auth refresh -h github.com -s project

# 3. Confirmar
gh auth status
```
