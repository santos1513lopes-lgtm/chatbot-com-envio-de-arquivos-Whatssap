const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ===============================
// CONFIGURAÇÕES PRINCIPAIS
// ===============================
const CONFIG = {
  urlPlanilha:
    process.env.URL_PLANILHA ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0jpFV50k9Ju50f_0jiWPLNAuKkDid4nwyrLl6AyYHTKCMKV95A04fL_-aNl5uHrjobXWeikTu1B0B/pub?output=csv',

  timezone: 'America/Sao_Paulo',
  relatorioPath: path.join(__dirname, 'relatorio_acessos.txt'),
  pastaArquivos: __dirname,

  delayCurto: 1000,
  delayMedio: 2000,
  delayAudio: 4000,

  linkJwpubPadrao:
    process.env.LINK_JWPUB ||
    'https://drive.google.com/uc?export=download&id=12wYrAn2UnQF5IOWv8u81G1szMaaexr4u',
};

// ===============================
// CLIENTE WHATSAPP
// ===============================
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
    ],
  },
});

// ===============================
// FUNÇÕES AUXILIARES
// ===============================
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const removerAcentos = (texto = '') => {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const limparCampoCsv = (valor = '') => {
  return valor.replace(/^"|"$/g, '').trim();
};

const dividirLinhaCsv = (linha) => {
  // Divide por vírgula, ignorando vírgulas dentro de aspas.
  return linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
};

const registrarAcesso = async (nomeAluno, telefone) => {
  const dataHora = new Date().toLocaleString('pt-BR', {
    timeZone: CONFIG.timezone,
  });

  const logRegistro = `[${dataHora}] ${nomeAluno} acessou os materiais. Telefone: ${telefone}\n`;

  try {
    await fs.promises.appendFile(CONFIG.relatorioPath, logRegistro);
  } catch (error) {
    console.error('Erro ao salvar relatório:', error.message);
  }
};

const enviarDigitando = async (chat, tempo = CONFIG.delayMedio) => {
  await chat.sendStateTyping();
  await delay(tempo);
};

const enviarMensagem = async (msg, texto, tempo = CONFIG.delayMedio) => {
  const chat = await msg.getChat();
  await enviarDigitando(chat, tempo);
  await client.sendMessage(msg.from, texto);
};

const baixarPlanilha = async () => {
  const response = await axios.get(CONFIG.urlPlanilha, {
    timeout: 15000,
    responseType: 'text',
  });

  return response.data;
};

const buscarAlunoNaPlanilha = async (nomeDigitado) => {
  const csv = await baixarPlanilha();
  const linhas = csv.split('\n').slice(1);
  const nomeDigitadoLimpo = removerAcentos(nomeDigitado);

  for (const linha of linhas) {
    if (!linha.trim()) continue;

    const colunas = dividirLinhaCsv(linha);
    if (colunas.length < 2) continue;

    const nomePlanilha = limparCampoCsv(colunas[0]);
    const materiaisPlanilha = limparCampoCsv(colunas[1]);
    const mensagemExtra = colunas[2] ? limparCampoCsv(colunas[2]) : '';

    const nomePlanilhaLimpo = removerAcentos(nomePlanilha);

    if (nomePlanilhaLimpo === nomeDigitadoLimpo) {
      return {
        nome: nomePlanilha,
        materiais: materiaisPlanilha
          .split(';')
          .map((material) => material.trim())
          .filter(Boolean),
        mensagemExtra,
      };
    }
  }

  return null;
};

const arquivoExiste = (nomeArquivo) => {
  const caminhoArquivo = path.join(CONFIG.pastaArquivos, nomeArquivo);
  return fs.existsSync(caminhoArquivo);
};

const enviarMaterial = async (msg, arquivo) => {
  const chat = await msg.getChat();

  if (!arquivo) return;

  // Links normais
  if (arquivo.startsWith('http://') || arquivo.startsWith('https://')) {
    await enviarMensagem(msg, `🔗 Segue o link para acesso:\n\n${arquivo}`, CONFIG.delayCurto);
    return;
  }

  // Arquivos JWPUB
  if (arquivo.toLowerCase().endsWith('.jwpub')) {
    await enviarMensagem(
      msg,
      `📘 Para baixar o arquivo (${arquivo}), clique aqui:\n\n${CONFIG.linkJwpubPadrao}`,
      CONFIG.delayCurto
    );
    return;
  }

  // Arquivos locais
  if (!arquivoExiste(arquivo)) {
    console.error(`Arquivo não encontrado: ${arquivo}`);
    await enviarMensagem(
      msg,
      `⚠️ O arquivo "${arquivo}" não foi encontrado no servidor. Vou avisar os professores para verificarem.`,
      CONFIG.delayCurto
    );
    return;
  }

  const caminhoArquivo = path.join(CONFIG.pastaArquivos, arquivo);

  try {
    if (arquivo.toLowerCase().endsWith('.mp3') || arquivo.toLowerCase().endsWith('.ogg')) {
      await chat.sendStateRecording();
      await delay(CONFIG.delayAudio);

      const media = MessageMedia.fromFilePath(caminhoArquivo);
      await client.sendMessage(msg.from, media, { sendAudioAsVoice: true });
      return;
    }

    await enviarDigitando(chat, CONFIG.delayMedio);
    const media = MessageMedia.fromFilePath(caminhoArquivo);
    await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
  } catch (error) {
    console.error(`Erro ao enviar arquivo ${arquivo}:`, error.message);
    await enviarMensagem(
      msg,
      `⚠️ Tive um problema ao enviar o arquivo "${arquivo}". Os professores serão avisados.`,
      CONFIG.delayCurto
    );
  }
};

// ===============================
// EVENTOS DO WHATSAPP
// ===============================
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('QR Code gerado! Escaneie para conectar.');
});

client.on('ready', () => {
  console.log('✅ Tudo certo! Robô conectado e pronto para uso.');
});

client.on('authenticated', () => {
  console.log('🔐 WhatsApp autenticado com sucesso.');
});

client.on('auth_failure', (message) => {
  console.error('❌ Falha na autenticação:', message);
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ Cliente desconectado:', reason);
});

client.on('message', async (msg) => {
  try {
    if (!msg.body) return;
    if (msg.fromMe) return;
    if (msg.from.includes('@g.us')) return; // ignora grupos

    const chat = await msg.getChat();
    const bodyOriginal = msg.body.trim();
    const bodyLimpo = removerAcentos(bodyOriginal);

    const saudacoes = ['oi', 'ola', 'menu', 'bom dia', 'boa tarde', 'boa noite'];
    const agradecimentos = ['obrigado', 'obrigada', 'valeu', 'gratidao', 'obg', 'ok', 'joia'];
    const suporte = ['ajuda', 'suporte', 'atendente', 'professor', 'problema', 'erro'];

    // 1. SAUDAÇÕES
    if (saudacoes.includes(bodyLimpo)) {
      await enviarMensagem(
        msg,
        'Olá! Eu sou o assistente de materiais. 📚\n\nPor favor, digite apenas seu *NOME E SOBRENOME* para eu localizar e liberar seu material.'
      );
      return;
    }

    // 2. AGRADECIMENTOS
    if (agradecimentos.includes(bodyLimpo)) {
      await enviarMensagem(
        msg,
        'Por nada! Fico muito feliz em ajudar. Se precisar de mais alguma coisa no futuro, estarei por aqui. É só mandar um "oi"! 😉📚',
        1500
      );
      return;
    }

    // 3. SUPORTE
    if (suporte.includes(bodyLimpo)) {
      await enviarMensagem(
        msg,
        'Entendi! 🚨 Vou repassar sua mensagem para um dos professores. Por favor, aguarde um momento que logo entraremos em contato para te ajudar.'
      );
      return;
    }

    // 4. EVITA BUSCAR NOMES MUITO CURTOS
    if (bodyLimpo.length <= 3) return;

    // 5. BUSCA NA PLANILHA
    await enviarDigitando(chat, CONFIG.delayCurto);
    const alunoEncontrado = await buscarAlunoNaPlanilha(bodyOriginal);

    if (!alunoEncontrado) {
      await client.sendMessage(
        msg.from,
        'Nome não encontrado na planilha. Verifique a digitação e envie seu *nome e sobrenome* novamente.'
      );
      return;
    }

    await enviarMensagem(
      msg,
      `Olá, ${alunoEncontrado.nome}! Localizei seu cadastro. Enviando materiais...`,
      1500
    );

    for (const arquivo of alunoEncontrado.materiais) {
      await enviarMaterial(msg, arquivo);
    }

    if (alunoEncontrado.mensagemExtra) {
      await enviarMensagem(
        msg,
        `📢 *Recado dos Professores:*\n\n${alunoEncontrado.mensagemExtra}`,
        2500
      );
    }

    await enviarMensagem(msg, 'Prontinho! Bons estudos! 🚀', CONFIG.delayCurto);
    await registrarAcesso(alunoEncontrado.nome, msg.from);
  } catch (error) {
    console.error('Erro geral ao processar mensagem:', error.message);

    try {
      await client.sendMessage(
        msg.from,
        '⚠️ Tive uma instabilidade ao processar sua mensagem. Por favor, tente novamente em alguns instantes.'
      );
    } catch (sendError) {
      console.error('Erro ao enviar mensagem de falha:', sendError.message);
    }
  }
});

// ===============================
// INICIALIZAÇÃO
// ===============================
client.initialize();
