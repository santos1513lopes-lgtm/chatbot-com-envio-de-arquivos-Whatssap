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

const delay = ms => new Promise(res => setTimeout(res, ms));

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const body = msg.body.toLowerCase().trim();

    if (body === 'oi' || body === 'ola' || body === 'menu' || body === 'bom dia' || body === 'boa tarde' || body === 'boa noite' || body === 'dia' || body === 'tarde' || body === 'noite') {
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, 'Olá! Eu sou o assistente de materiais. 📚\n\nPor favor, digite seu *NOME COMPLETO* (exatamente como na matrícula) para eu liberar seu material.');
    } 
    
    else {
        try {
            const listaAlunos = JSON.parse(fs.readFileSync('./alunos.json', 'utf8'));
            const alunoEncontrado = listaAlunos.find(aluno => aluno.nome.toLowerCase() === body);

            if (alunoEncontrado) {
                await chat.sendStateTyping(); 
                await delay(1500); 
                await client.sendMessage(msg.from, `Olá ${alunoEncontrado.nome}! Localizei seu cadastro. Preparando seu(s) material(is)... ⏳`);
                
                // Transforma o material em lista (mesmo se for só 1 arquivo)
                const listaMateriais = Array.isArray(alunoEncontrado.material) 
                    ? alunoEncontrado.material 
                    : [alunoEncontrado.material];

                // LAÇO DE REPETIÇÃO: Agora ele envia TODOS os arquivos fisicamente da pasta
                for (const arquivo of listaMateriais) {
                    await chat.sendStateTyping();
                    await delay(2500); // Tempo fingindo que está carregando o arquivo
                    
                    const media = MessageMedia.fromFilePath(`./${arquivo}`);
                    media.filename = arquivo; 
                    await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                }
                
                // Mensagem final
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, 'Prontinho! Todos os arquivos foram enviados. Bons estudos! 🚀');

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