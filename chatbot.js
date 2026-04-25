const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Link para o QR Code: https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(qr));
});

client.on('ready', () => {
    console.log('✅ Tudo certo! WhatsApp conectado.');
});

// Função para criar uma pausa (tempo em milissegundos. Ex: 2000 = 2 segundos)
const delay = ms => new Promise(res => setTimeout(res, ms));

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const body = msg.body.toLowerCase().trim();

    // 1. Saudação Inicial
    if (body === 'oi' || body === 'ola' || body === 'menu') {
        await chat.sendStateTyping(); // Simula que está digitando
        await delay(2000); // Aguarda 2 segundos
        await client.sendMessage(msg.from, 'Olá! Eu sou o assistente de materiais. 📚\n\nPor favor, digite seu *NOME COMPLETO* (exatamente como na matrícula) para eu liberar seu material.');
    } 
    
    // 2. Verificação de Nome
    else {
        try {
            const listaAlunos = JSON.parse(fs.readFileSync('./alunos.json', 'utf8'));
            const alunoEncontrado = listaAlunos.find(aluno => aluno.nome.toLowerCase() === body);

            if (alunoEncontrado) {
                await chat.sendStateTyping(); 
                await delay(1500); 
                await client.sendMessage(msg.from, `Olá ${alunoEncontrado.nome}! Localizei seu cadastro. Preparando seu material... ⏳`);
                
                // LÓGICA DE DECISÃO: Link ou Arquivo Direto
                if (alunoEncontrado.material.endsWith('.jwpub')) {
                    
                    await chat.sendStateTyping();
                    await delay(2000); // Mais 2 segundos fingindo que está buscando o link
                    
                    const linkDownload = 'https://drive.google.com/uc?export=download&id=12wYrAn2UnQF5IOWv8u81G1szMaaexr4u';
                    await client.sendMessage(msg.from, `Para baixar seu material JWpub, clique no link abaixo:\n\n${linkDownload}`);
                    await client.sendMessage(msg.from, 'Basta clicar para iniciar o download. Bons estudos! 🚀');
                    
                } else {
                    
                    await chat.sendStateTyping();
                    await delay(3000); // Tempo maior simulando o "carregamento" do arquivo PDF
                    
                    const media = MessageMedia.fromFilePath(`./${alunoEncontrado.material}`);
                    media.filename = alunoEncontrado.material; 
                    await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                    await client.sendMessage(msg.from, 'Prontinho! Seu arquivo foi enviado. Bons estudos! 🚀');
                }

            } else if (body.length > 3) {
                await chat.sendStateTyping();
                await delay(2000);
                await client.sendMessage(msg.from, 'Desculpe, não encontrei seu nome na lista de alunos matriculados. Verifique a grafia ou fale com o professor.');
            }
        } catch (error) {
            console.error('Erro no processamento:', error);
            if (error.code === 'ENOENT') {
                await client.sendMessage(msg.from, 'Localizei seu cadastro, mas o arquivo físico ainda não está no servidor. Por favor, avise o suporte.');
            }
        }
    }
});

client.initialize();