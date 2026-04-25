const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios'); // Biblioteca para ler o Google Sheets

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Link para o QR Code: https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(qr));
});

client.on('ready', () => {
    console.log('✅ Tudo certo! WhatsApp conectado.');
});

const delay = ms => new Promise(res => setTimeout(res, ms));

// ESTE É O SEU LINK NOVO QUE EU JÁ ATUALIZEI:
const urlPlanilha = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0jpFV50k9Ju50f_0jiWPLNAuKkDid4nwyrLl6AyYHTKCMKV95A04fL_-aNl5uHrjobXWeikTu1B0B/pub?output=csv';

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const body = msg.body.toLowerCase().trim();

    // 1. Saudação e Menu
    if (body === 'oi' || body === 'ola' || body === 'menu' || body === 'bom dia' || body === 'boa tarde' || body === 'boa noite' || body === 'dia' || body === 'tarde' || body === 'noite') {
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, 'Olá! Eu sou o assistente de materiais. 📚\n\nPor favor, digite seu *NOME COMPLETO* (exatamente como na matrícula) para eu liberar seu material.');
    } 
    
    // 2. Verificação na Planilha do Google Sheets
    else {
        try {
            // O robô baixa os dados da planilha
            const response = await axios.get(urlPlanilha);
            const dadosCSV = response.data;
            
            // Converte o texto da planilha em uma lista
            const linhas = dadosCSV.split('\n').slice(1); 
            
            let listaAlunos = [];
            for (let linha of linhas) {
                if (linha.trim() === '') continue;
                
                const colunas = linha.split(','); 
                if (colunas.length >= 2) {
                    listaAlunos.push({
                        nome: colunas[0].trim(),
                        // Aqui ele entende o ponto-e-vírgula (;) para mandar vários arquivos
                        material: colunas[1].trim().split(';') 
                    });
                }
            }

            // Procura o nome do aluno
            const alunoEncontrado = listaAlunos.find(aluno => aluno.nome.toLowerCase() === body);

            if (alunoEncontrado) {
                await chat.sendStateTyping(); 
                await delay(1500); 
                await client.sendMessage(msg.from, `Olá ${alunoEncontrado.nome}! Localizei seu cadastro. Preparando seu(s) material(is)... ⏳`);
                
                // Loop para enviar cada arquivo da lista
                for (const arquivo of alunoEncontrado.material) {
                    const nomeArquivo = arquivo.trim(); 
                    if (nomeArquivo === '') continue;

                    await chat.sendStateTyping();
                    await delay(2500); 
                    
                    try {
                        const media = MessageMedia.fromFilePath(`./${nomeArquivo}`);
                        media.filename = nomeArquivo; 
                        await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                    } catch (errArquivo) {
                        console.error(`Erro: Arquivo ${nomeArquivo} não encontrado no servidor.`);
                        await client.sendMessage(msg.from, `❌ Não encontrei o arquivo: *${nomeArquivo}* no meu sistema.`);
                    }
                }
                
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, 'Prontinho! Bons estudos! 🚀');

            } else if (body.length > 3) {
                await chat.sendStateTyping();
                await delay(2000);
                await client.sendMessage(msg.from, 'Desculpe, não encontrei seu nome na lista. Verifique se digitou corretamente.');
            }
        } catch (error) {
            console.error('Erro ao ler planilha:', error);
            await client.sendMessage(msg.from, 'Ops! Tive um problema técnico. Tente novamente em instantes.');
        }
    }
});

client.initialize();