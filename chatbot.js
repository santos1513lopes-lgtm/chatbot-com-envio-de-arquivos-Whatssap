// =====================================
// IMPORTAÇÕES
// =====================================
const qrcode = require("qrcode-terminal");
const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");
const path = require("path");

// =====================================
// CONFIGURAÇÃO DO CLIENTE
// =====================================
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  },
});

// =====================================
// QR CODE
// =====================================
client.on("qr", (qr) => {
  console.log("📲 Escaneie o QR Code abaixo no terminal:");
  qrcode.generate(qr, { small: true });
  
  // O Pulo do Gato: Gerando um link com a imagem do QR Code!
  console.log("⚠️ Se o QR Code acima estiver distorcido, CLIQUE NO LINK ABAIXO para ver a imagem nítida:");
  console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
});

// =====================================
// WHATSAPP CONECTADO
// =====================================
client.on("ready", () => {
  console.log("✅ Tudo certo! WhatsApp conectado.");
});

// =====================================
// DESCONEXÃO
// =====================================
client.on("disconnected", (reason) => {
  console.log("⚠️ Desconectado:", reason);
});

// =====================================
// INICIALIZA
// =====================================
client.initialize();

// =====================================
// FUNÇÃO DE DELAY
// =====================================
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// =====================================
// FUNIL DE MENSAGENS (SOMENTE PRIVADO)
// =====================================
client.on("message", async (msg) => {
  try {
    // ❌ IGNORA QUALQUER COISA QUE NÃO SEJA CONVERSA PRIVADA
    if (!msg.from || msg.from.endsWith("@g.us")) return;

    const chat = await msg.getChat();
    if (chat.isGroup) return; // blindagem extra

    const texto = msg.body ? msg.body.trim().toLowerCase() : "";

    // Função de digitação
    const typing = async () => {
      await delay(2000);
      await chat.sendStateTyping();
      await delay(2000);
    };

    // =====================================
    // MENSAGEM INICIAL (MENU)
    // =====================================
    if (/^(menu|oi|olá|ola|bom dia|boa tarde|boa noite)$/i.test(texto)) {
      await typing();

      const hora = new Date().getHours();
      let saudacao = "Olá";

      if (hora >= 5 && hora < 12) saudacao = "Bom dia";
      else if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
      else saudacao = "Boa noite";

      await client.sendMessage(
        msg.from,
        `${saudacao}! 👋\n\n` +
          `Essa mensagem foi enviada automaticamente pelo robô 🤖\n\n` +
          `Na versão PRO você vai além: desbloqueie tudo!.\n\n` +
          `*Digite 1 para baixar o Arquivo da Escola 2026*\n\n` +
          `✍️ Envio de textos\n` +
          `🎙️ Áudios\n` +
          `🖼️ Imagens\n` +
          `🎥 Vídeos\n` +
          `📂 Arquivos da Escola 2026\n\n` +
          `💡 Simulação de "digitando..." e "gravando áudio"\n` +
          `🚀 Envio de mensagens em massa\n` +
          `📇 Captura automática de contatos\n` +
          `💻 Aprenda como deixar o robô funcionando 24 hrs, com o PC desligado\n` +
          `✅ E 3 Bônus exclusivos\n\n` +
          `🔥 Adquira a versão 
      );
    }

    // =====================================
    // OPÇÃO 1: ENVIO DE ARQUIVO
    // =====================================
    else if (texto === "1") {
      await typing();
      
      const filePath = path.join(__dirname, 'escola2026.pdf'); 
      
      try {
        const media = MessageMedia.fromFilePath(filePath);
        await client.sendMessage(msg.from, media, { caption: "📂 Aqui está o arquivo que você solicitou!" });
      } catch (err) {
        console.error("Erro ao ler o arquivo:", err);
        await client.sendMessage(msg.from, "⚠️ Desculpe, não consegui encontrar o arquivo no momento.");
      }
    }

  } catch (error) {
    console.error("❌ Erro no processamento da mensagem:", error);
  }
});