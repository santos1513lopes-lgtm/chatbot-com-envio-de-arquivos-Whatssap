Perfeito — vou te entregar um **tutorial completo, organizado e pronto pra copiar** 👇
(Do zero até deixar seu bot rodando 24h na VPS 🚀)

---

# 📘 TUTORIAL COMPLETO — CHATBOT WHATSAPP 24H NA VPS (CONTABO)

---

# 🧠 VISÃO GERAL

Você vai:

1. Conectar na VPS
2. Instalar Node.js
3. Instalar dependências do Chrome (Puppeteer)
4. Baixar seu projeto do GitHub
5. Rodar o bot
6. Escanear o QR Code
7. Deixar rodando 24h com PM2

---

# 🔐 1. ACESSAR A VPS

No terminal do VS Code ou CMD:

```bash
ssh root@185.2.101.110
```

Digite sua senha.

Se aparecer:

```bash
root@vmiXXXXX:~#
```

✅ Você está dentro da VPS

---

# 🔄 2. ATUALIZAR O SERVIDOR

```bash
apt update && apt upgrade -y
```

---

# ⚙️ 3. INSTALAR NODE.JS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verificar:

```bash
node -v
npm -v
```

---

# 🧩 4. INSTALAR DEPENDÊNCIAS DO CHROME (ESSENCIAL)

👉 Isso evita erros do Puppeteer (como o que você teve)

```bash
apt install -y \
libxfixes3 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 \
libcairo2 libxshmfence1 libgtk-3-0
```

---

# 📥 5. BAIXAR SEU PROJETO

```bash
git clone https://github.com/santos1513lopes-lgtm/chatbot-com-envio-de-arquivos-whatssap.git
cd chatbot-com-envio-de-arquivos-whatssap
```

---

# 📦 6. INSTALAR DEPENDÊNCIAS DO PROJETO

```bash
npm install
```

---

# ▶️ 7. RODAR O BOT (PRIMEIRA VEZ)

```bash
node chatbot.js
```

Vai aparecer o QR Code:

📱 Abra o WhatsApp → Aparelhos conectados → Conectar → escaneie

Se aparecer:

```bash
Robô conectado
```

✅ Funcionando

---

# ⚠️ ERROS COMUNS (E SOLUÇÕES)

### ❌ Erro: `libXfixes.so.3`

✔️ Resolver com:

```bash
apt install -y libxfixes3
```

---

### ❌ Erro: `browser already running`

✔️ Significa que o bot já está rodando no PM2

👉 NÃO rode `node chatbot.js` de novo

---

# 🚀 8. COLOCAR ONLINE 24H (PM2)

Instalar:

```bash
npm install -g pm2
```

Iniciar bot:

```bash
pm2 start chatbot.js --name bot-whatsapp
```

Salvar:

```bash
pm2 save
```

Auto iniciar:

```bash
pm2 startup
```

👉 Copie e execute o comando que aparecer

---

# 📊 9. COMANDOS IMPORTANTES DO PM2

Ver status:

```bash
pm2 status
```

Ver logs:

```bash
pm2 logs bot-whatsapp
```

Reiniciar:

```bash
pm2 restart bot-whatsapp
```

Parar:

```bash
pm2 stop bot-whatsapp
```

---

# 🔁 10. ATUALIZAR SEU BOT (QUANDO MUDAR O CÓDIGO)

```bash
cd chatbot-com-envio-de-arquivos-whatssap
git pull
pm2 restart bot-whatsapp
```

---

# 📁 11. ARQUIVOS IMPORTANTES

### NÃO APAGAR:

```bash
.wwebjs_auth/
```

👉 Guarda o login do WhatsApp
👉 Se apagar → precisa escanear QR de novo

---

# 🧹 12. .GITIGNORE RECOMENDADO

Crie um arquivo `.gitignore`:

```txt
node_modules/
.wwebjs_auth/
.wwebjs_cache/
relatorio_acessos.txt
```

---

# 🧠 DICAS IMPORTANTES

### 💡 1. Sempre use PM2

Nunca deixe rodando com:

```bash
node chatbot.js
```

---

### 💡 2. VPS reiniciou?

Seu bot volta sozinho (se fez `pm2 save`)

---

### 💡 3. Logs são seus melhores amigos

```bash
pm2 logs bot-whatsapp
```

---

### 💡 4. Arquivos do bot

Seu código usa:

```js
MessageMedia.fromFilePath(`./arquivo`)
```

👉 Então os arquivos precisam estar dentro da pasta do projeto

---

### 💡 5. Segurança básica

Depois você pode:

```bash
adduser seuusuario
```

(e parar de usar root — posso te ensinar depois)

---

# 🎯 RESULTADO FINAL

Depois de tudo isso, você terá:

✅ Bot rodando 24h
✅ Reconectando sozinho
✅ VPS funcionando
✅ Controle total pelo VS Code

---

# 🚀 SE QUISER EVOLUIR DEPOIS

Posso te ajudar a:

* Colocar domínio
* Criar painel web
* Melhorar respostas com IA
* Salvar dados em banco (MySQL/MongoDB)
* Automatizar envio em massa

---

# 🏁 FINAL

Você já fez a parte mais difícil: **colocar na VPS e rodar** 👏
Agora é só manter e evoluir.

---


# painel-admin-chatbot
