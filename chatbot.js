const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express');

// ================= CONFIG =================
const urlPlanilha = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0jpFV50k9Ju50f_0jiWPLNAuKkDid4nwyrLl6AyYHTKCMKV95A04fL_-aNl5uHrjobXWeikTu1B0B/pub?output=csv';

const urlRespostas = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0jpFV50k9Ju50f_0jiWPLNAuKkDid4nwyrLl6AyYHTKCMKV95A04fL_-aNl5uHrjobXWeikTu1B0B/pub?gid=1636028158&single=true&output=csv';

const urlRegistroAcessos = 'https://script.google.com/macros/s/AKfycbwbn7x6r_2tZva7uuNyJI-YOzEKoh60TEyKBf7jyUUMJXGeJkhmKNPq6Q5I0DnVcYRAlQ/exec';

const linkDownloadJwpub = 'https://drive.google.com/uc?export=download&id=12wYrAn2UnQF5IOWv8u81G1szMaaexr4u';

const pastaUploads = path.join(__dirname, 'uploads');

// ================= CLIENT =================
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-principal" }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

// ================= FUNÇÕES =================
const delay = ms => new Promise(res => setTimeout(res, ms));

const removerAcentos = (texto = '') => {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
};

const limparCampo = (valor = '') => {
    return valor.replace(/^"|"$/g, '').trim();
};

const dividirCSV = (linha) => {
    return linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
};

const encontrarArquivo = (nomeArquivo) => {
    const caminhos = [
        path.join(__dirname, nomeArquivo),
        path.join(pastaUploads, nomeArquivo)
    ];

    return caminhos.find(caminho => fs.existsSync(caminho));
};

const registrarAcesso = async (nomeAluno, telefone, materiais) => {
    const dataHora = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
    });

    const listaMateriais = Array.isArray(materiais)
        ? materiais.join('; ')
        : materiais;

    const log = `[${dataHora}] ${nomeAluno} | ${telefone} | ${listaMateriais}\n`;

    fs.appendFile('relatorio_acessos.txt', log, (err) => {
        if (err) console.error('Erro ao salvar local:', err);
    });

    try {
        await axios.post(urlRegistroAcessos, {
            nomeAluno,
            telefone,
            materiais: listaMateriais,
            status: 'Enviado'
        });

        console.log(`✅ Registrado na planilha: ${nomeAluno}`);
    } catch (err) {
        console.error('Erro ao enviar para planilha:', err.message);
    }
};

const buscarRespostaPersonalizada = async (mensagem) => {
    try {
        const response = await axios.get(urlRespostas);
        const linhas = response.data.split('\n').slice(1);
        const mensagemLimpa = removerAcentos(mensagem);

        for (let linha of linhas) {
            if (!linha.trim()) continue;

            const colunas = dividirCSV(linha);

            const gatilho = removerAcentos(limparCampo(colunas[0]));
            const resposta = limparCampo(colunas[1]);
            const ativo = removerAcentos(limparCampo(colunas[2]));

            if (!gatilho || !resposta) continue;
            if (ativo !== 'sim') continue;

            if (mensagemLimpa.includes(gatilho)) {
                return resposta;
            }
        }

        return null;

    } catch (error) {
        console.error('Erro ao buscar respostas personalizadas:', error.message);
        return null;
    }
};

const buscarAluno = async (nomeDigitado) => {
    const response = await axios.get(urlPlanilha);
    const linhas = response.data.split('\n').slice(1);
    const nomeDigitadoLimpo = removerAcentos(nomeDigitado);

    for (let linha of linhas) {
        if (!linha.trim()) continue;

        const colunas = dividirCSV(linha);

        const nome = limparCampo(colunas[0]);
        const materiais = limparCampo(colunas[1]);
        const msgExtra = limparCampo(colunas[2] || '');

        if (removerAcentos(nome) === nomeDigitadoLimpo) {
            return {
                nome,
                materiais: materiais.split(';').map(m => m.trim()).filter(Boolean),
                msgExtra
            };
        }
    }

    return null;
};

const enviarMaterialParaNumero = async (numero, arquivo) => {
    const arquivoLimpo = arquivo.trim();
    const arquivoMinusculo = arquivoLimpo.toLowerCase();

    if (arquivoMinusculo.startsWith('http://') || arquivoMinusculo.startsWith('https://')) {
        await client.sendMessage(numero, `🔗 Segue o link para acesso:\n\n${arquivoLimpo}`);
        return;
    }

    if (arquivoMinusculo.endsWith('.jwpub')) {
        await client.sendMessage(
            numero,
            `📘 Para baixar o arquivo *${arquivoLimpo}*, clique no link abaixo:\n\n${linkDownloadJwpub}`
        );
        return;
    }

    const caminhoArquivo = encontrarArquivo(arquivoLimpo);

    if (!caminhoArquivo) {
        await client.sendMessage(numero, `⚠️ Arquivo não encontrado: ${arquivoLimpo}`);
        console.error('Arquivo não encontrado:', arquivoLimpo);
        return;
    }

    const media = MessageMedia.fromFilePath(caminhoArquivo);

    if (arquivoMinusculo.endsWith('.mp3') || arquivoMinusculo.endsWith('.ogg')) {
        await client.sendMessage(numero, media, { sendAudioAsVoice: true });
    } else {
        await client.sendMessage(numero, media, { sendMediaAsDocument: true });
    }
};

// ================= EVENTOS =================
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code gerado!');
});

client.on('ready', () => {
    console.log('✅ Robô conectado!');
});

// ================= MENSAGENS =================
client.on('message', async (msg) => {
    try {
        if (!msg.body || msg.fromMe) return;
        if (msg.from.includes('@g.us')) return;

        const chat = await msg.getChat();
        const bodyOriginal = msg.body.trim();
        const body = removerAcentos(bodyOriginal);

        if (body.length <= 1) return;

        const aluno = await buscarAluno(bodyOriginal);

        if (aluno) {
            await chat.sendStateTyping();
            await delay(1500);

            await client.sendMessage(msg.from, `Olá ${aluno.nome}! 📚 Enviando seus materiais...`);

            for (const arquivo of aluno.materiais) {
                await delay(1500);
                await enviarMaterialParaNumero(msg.from, arquivo);
            }

            if (aluno.msgExtra) {
                await delay(2000);
                await client.sendMessage(msg.from, `📢 ${aluno.msgExtra}`);
            }

            await client.sendMessage(msg.from, '✅ Pronto! Bons estudos!');
            await registrarAcesso(aluno.nome, msg.from, aluno.materiais);
            return;
        }

        const respostaPersonalizada = await buscarRespostaPersonalizada(bodyOriginal);

        if (respostaPersonalizada) {
            await chat.sendStateTyping();
            await delay(1500);
            return client.sendMessage(msg.from, respostaPersonalizada);
        }

        return client.sendMessage(
            msg.from,
            'Não encontrei seu cadastro ou uma resposta para sua mensagem.\n\nPor favor, envie seu *nome e sobrenome completo* ou digite *ajuda*.'
        );

    } catch (error) {
        console.error('Erro geral:', error);
        client.sendMessage(msg.from, '⚠️ Erro ao processar. Tente novamente.');
    }
});

// ================= API PARA O PAINEL =================
const api = express();
api.use(express.json());

api.post('/enviar-material', async (req, res) => {
    try {
        let { telefone, nome, mensagem, materiais } = req.body;

        if (!telefone) {
            return res.status(400).json({ erro: 'Telefone obrigatório.' });
        }

        telefone = String(telefone).replace(/\D/g, '');

        if (!telefone.startsWith('55')) {
            telefone = '55' + telefone;
        }

        const numeroFormatado = telefone.replace(/\D/g, '');

let numero = numeroFormatado;

if (!numero.startsWith('55')) {
    numero = '55' + numero;
}

numero = numero + '@c.us';

        if (!Array.isArray(materiais)) {
            materiais = materiais ? [materiais] : [];
        }

        await client.sendMessage(
            numero,
            mensagem || `Olá ${nome || ''}! Seguem seus materiais. 📚`
        );

        for (const arquivo of materiais) {
            await delay(1500);
            await enviarMaterialParaNumero(numero, arquivo);
        }

        await client.sendMessage(numero, '✅ Pronto! Bons estudos!');

        await registrarAcesso(
            nome || 'Envio pelo painel',
            numero,
            materiais
        );

        res.json({ sucesso: true });

    } catch (error) {
        console.error('Erro ao enviar pelo painel:', error.message);
        res.status(500).json({ erro: error.message });
    }
});

api.listen(4000, () => {
    console.log('📡 API do bot rodando em http://localhost:4000');
});

// ================= START =================
client.initialize();