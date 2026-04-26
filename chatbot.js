const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios'); // Biblioteca para acessar a planilha online

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Link que você gerou (CSV)
const urlPlanilha = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0jpFV50k9Ju50f_0jiWPLNAuKkDid4nwyrLl6AyYHTKCMKV95A04fL_-aNl5uHrjobXWeikTu1B0B/pub?gid=0&single=true&output=csv';

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code gerado! Escaneie para conectar.');
});

client.on('ready', () => {
    console.log('✅ Tudo certo! Robô conectado via Google Sheets.');
});

const delay = ms => new Promise(res => setTimeout(res, ms));

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const body = msg.body.toLowerCase().trim();

    if (body === 'oi' || body === 'ola' || body === 'menu') {
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, 'Olá! Digite seu *NOME COMPLETO* para receber seu material.');
    } 
    
    else {
        try {
            // O robô lê a planilha no Google no exato momento da mensagem
            const response = await axios.get(urlPlanilha);
            const linhas = response.data.split('\n').slice(1); // Pula o cabeçalho
            
            let alunoEncontrado = null;

            for (let linha of linhas) {
                const colunas = linha.split(',');
                if (colunas.length >= 2) {
                    const nomePlanilha = colunas[0].trim();
                    const materiaisPlanilha = colunas[1].trim();

                    if (nomePlanilha.toLowerCase() === body) {
                        alunoEncontrado = {
                            nome: nomePlanilha,
                            // Transforma a lista de arquivos (separados por ;) em uma lista real
                            material: materiaisPlanilha.split(';').map(m => m.trim())
                        };
                        break;
                    }
                }
            }

            if (alunoEncontrado) {
                await chat.sendStateTyping();
                await delay(1500);
                await client.sendMessage(msg.from, `Olá ${alunoEncontrado.nome}! Localizei seu cadastro na planilha. Enviando materiais...`);

                for (const arquivo of alunoEncontrado.material) {
                    await chat.sendStateTyping();
                    await delay(2000);

                    // LÓGICA JWPUB (Link do Drive)
                    if (arquivo.endsWith('.jwpub')) {
                        const linkDownload = 'https://drive.google.com/uc?export=download&id=12wYrAn2UnQF5IOWv8u81G1szMaaexr4u';
                        await client.sendMessage(msg.from, `Para baixar o arquivo (${arquivo}), clique aqui:\n\n${linkDownload}`);
                    } 
                    // LÓGICA OUTROS ARQUIVOS (Físico na pasta)
                    else {
                        try {
                            const media = MessageMedia.fromFilePath(`./${arquivo}`);
                            await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                        } catch (e) {
                            await client.sendMessage(msg.from, `❌ Arquivo físico não encontrado: ${arquivo}`);
                        }
                    }
                }
                await client.sendMessage(msg.from, 'Prontinho! Bons estudos! 🚀');

            } else if (body.length > 3) {
                await client.sendMessage(msg.from, 'Nome não encontrado na planilha. Verifique a digitação.');
            }
        } catch (error) {
            console.error('Erro ao ler a planilha:', error);
        }
    }
});

client.initialize();