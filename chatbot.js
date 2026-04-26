const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ================= CONFIG =================
const urlPlanilha = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0jpFV50k9Ju50f_0jiWPLNAuKkDid4nwyrLl6AyYHTKCMKV95A04fL_-aNl5uHrjobXWeikTu1B0B/pub?output=csv';

const urlRegistroAcessos = 'https://script.google.com/macros/s/AKfycbwbn7x6r_2tZva7uuNyJI-YOzEKoh60TEyKBf7jyUUMJXGeJkhmKNPq6Q5I0DnVcYRAlQ/exec';

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

const removerAcentos = (texto) => {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

// REGISTRAR ACESSO (LOCAL + GOOGLE SHEETS)
const registrarAcesso = async (nomeAluno, telefone, materiais) => {
    const dataHora = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
    });

    const listaMateriais = Array.isArray(materiais)
        ? materiais.join('; ')
        : materiais;

    const log = `[${dataHora}] ${nomeAluno} | ${telefone} | ${listaMateriais}\n`;

    // SALVAR LOCAL
    fs.appendFile('relatorio_acessos.txt', log, (err) => {
        if (err) console.error('Erro ao salvar local:', err);
    });

    // ENVIAR PARA PLANILHA
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

        // SAUDAÇÃO
        if (['oi','ola','menu','bom dia','boa tarde','boa noite'].includes(body)) {
            await chat.sendStateTyping();
            await delay(1500);

            return client.sendMessage(msg.from,
                'Olá! 👋\n\nDigite seu *NOME E SOBRENOME* para acessar seu material.'
            );
        }

        // BUSCAR NA PLANILHA
        const response = await axios.get(urlPlanilha);
        const linhas = response.data.split('\n').slice(1);

        let aluno = null;

        for (let linha of linhas) {
            const colunas = linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

            const nome = colunas[0]?.replace(/"/g, '').trim();
            const materiais = colunas[1]?.replace(/"/g, '').trim();
            const msgExtra = colunas[2]?.replace(/"/g, '').trim();

            if (removerAcentos(nome) === body) {
                aluno = {
                    nome,
                    materiais: materiais.split(';').map(m => m.trim()),
                    msgExtra
                };
                break;
            }
        }

        // NÃO ENCONTRADO
        if (!aluno) {
            return client.sendMessage(msg.from, 'Nome não encontrado. Verifique a digitação.');
        }

        // ENVIAR MATERIAL
        await chat.sendStateTyping();
        await delay(1500);

        await client.sendMessage(msg.from, `Olá ${aluno.nome}! 📚 Enviando seus materiais...`);

        for (const arquivo of aluno.materiais) {
            await delay(1500);

            if (arquivo.startsWith('http')) {
                await client.sendMessage(msg.from, `🔗 ${arquivo}`);
            }
            else if (arquivo.endsWith('.mp3') || arquivo.endsWith('.ogg')) {
                const media = MessageMedia.fromFilePath(`./${arquivo}`);
                await client.sendMessage(msg.from, media, { sendAudioAsVoice: true });
            }
            else {
                const media = MessageMedia.fromFilePath(`./${arquivo}`);
                await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
            }
        }

        // MENSAGEM EXTRA
        if (aluno.msgExtra) {
            await delay(2000);
            await client.sendMessage(msg.from, `📢 ${aluno.msgExtra}`);
        }

        await client.sendMessage(msg.from, '✅ Pronto! Bons estudos!');

        // REGISTRAR ACESSO
        await registrarAcesso(aluno.nome, msg.from, aluno.materiais);

    } catch (error) {
        console.error(error);
        client.sendMessage(msg.from, '⚠️ Erro ao processar. Tente novamente.');
    }
});

// ================= START =================
client.initialize();