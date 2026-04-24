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

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const body = msg.body.toLowerCase().trim();

    // 1. Saudação Inicial
    if (body === 'oi' || body === 'ola' || body === 'menu') {
        await client.sendMessage(msg.from, 'Olá! Eu sou o assistente de materiais. 📚\n\nPor favor, digite seu *NOME COMPLETO* (exatamente como na matrícula) para eu liberar seu material.');
    } 
    
    // 2. Verificação de Nome (Se não for saudação, o bot assume que é um nome)
    else {
        // Carrega a lista de alunos do arquivo JSON
        const listaAlunos = JSON.parse(fs.readFileSync('./alunos.json', 'utf8'));
        
        // Procura o aluno (ignorando maiúsculas/minúsculas)
        const alunoEncontrado = listaAlunos.find(aluno => aluno.nome.toLowerCase() === body);

        if (alunoEncontrado) {
            await client.sendMessage(msg.from, `Olá ${alunoEncontrado.nome}! Localizei seu cadastro. Enviando seu material agora... ⏳`);
            // Procure esta parte no seu código:
const media = MessageMedia.fromFilePath(`./${alunoEncontrado.material}`);

// Adicione esta linha logo abaixo:
media.filename = alunoEncontrado.material; 

// A linha de envio continua a mesma:
await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
            try {
                const media = MessageMedia.fromFilePath(`./${alunoEncontrado.material}`);
               await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                await client.sendMessage(msg.from, 'Prontinho! Bons estudos! 🚀');
            } catch (error) {
                console.error('Erro ao enviar arquivo:', error);
                await client.sendMessage(msg.from, 'Ops! Tive um problema ao carregar seu arquivo. Por favor, contate o suporte.');
            }
        } else if (body.length > 3) { // Evita responder a qualquer mensagem curta demais
            await client.sendMessage(msg.from, 'Desculpe, não encontrei seu nome na lista de alunos matriculados. Verifique se digitou corretamente ou fale com o professor.');
        }
    }
});

client.initialize();