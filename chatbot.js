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
                
                // MÁGICA: Transforma o material em uma lista, mesmo se for só um arquivo
                const listaMateriais = Array.isArray(alunoEncontrado.material) 
                    ? alunoEncontrado.material 
                    : [alunoEncontrado.material];

                // LAÇO DE REPETIÇÃO: Envia cada arquivo da lista um por um
                for (const arquivo of listaMateriais) {
                    
                    if (arquivo.endsWith('.jwpub')) {
                        await chat.sendStateTyping();
                        await delay(2000); 
                        const linkDownload = 'https://drive.google.com/uc?export=download&id=12wYrAn2UnQF5IOWv8u81G1szMaaexr4u';
                        await client.sendMessage(msg.from, `Para baixar seu material JWpub, clique no link abaixo:\n\n${linkDownload}`);
                        
                    } else {
                        await chat.sendStateTyping();
                        await delay(3000); 
                        const media = MessageMedia.fromFilePath(`./${arquivo}`);
                        media.filename = arquivo; 
                        await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                    }
                }
                
                // Mensagem final disparada apenas quando todos os arquivos terminam de ser enviados
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
                await client.sendMessage(msg.from, 'Localizei seu cadastro, mas algum arquivo físico ainda não está no servidor. Por favor, avise o suporte.');
            }
        }
    }
});

client.initialize();