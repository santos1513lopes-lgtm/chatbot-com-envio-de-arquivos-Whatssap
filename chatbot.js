const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios'); 
const fs = require('fs'); 

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const urlPlanilha = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0jpFV50k9Ju50f_0jiWPLNAuKkDid4nwyrLl6AyYHTKCMKV95A04fL_-aNl5uHrjobXWeikTu1B0B/pub?output=csv';

const removerAcentos = (texto) => {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
};

// FUNÇÃO: Anota quem baixou o material
const registrarAcesso = (nomeAluno) => {
    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const logRegistro = `[${dataHora}] O aluno(a) ${nomeAluno} acessou os materiais com sucesso.\n`;
    
    fs.appendFile('relatorio_acessos.txt', logRegistro, (err) => {
        if (err) console.error('Erro ao salvar o relatório:', err);
    });
};

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code gerado! Escaneie para conectar.');
});

client.on('ready', () => {
    console.log('✅ Tudo certo! Robô conectado (Links, Relatórios e Áudios Nativos ativados!).');
});

const delay = ms => new Promise(res => setTimeout(res, ms));

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    
    const bodyOriginal = msg.body.toLowerCase().trim();
    const bodyLimpo = removerAcentos(bodyOriginal);

    // 1. SAUDAÇÃO INICIAL 
    if (bodyLimpo === 'oi' || bodyLimpo === 'ola' || bodyLimpo === 'menu' || bodyLimpo === 'bom dia' || bodyLimpo === 'boa tarde' || bodyLimpo === 'boa noite') {
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, 'Olá! Eu sou o assistente de materiais. 📚\n\nPor favor, digite apenas seu *NOME E SOBRENOME* para eu localizar e liberar seu material.');
    } 
    
    // 2. AGRADECIMENTOS
    else if (bodyLimpo === 'obrigado' || bodyLimpo === 'obrigada' || bodyLimpo === 'valeu' || bodyLimpo === 'gratidao' || bodyLimpo === 'obg' || bodyLimpo === 'muito obrigado' || bodyLimpo === 'muito obrigada' || bodyLimpo === 'ok' || bodyLimpo === 'joia') {
        await chat.sendStateTyping();
        await delay(1500);
        await client.sendMessage(msg.from, 'Por nada! Fico muito feliz em ajudar. Se precisar de mais alguma coisa no futuro, estarei por aqui, é só mandar um "oi"! 😉📚');
    }

    // 3. SUPORTE / AJUDA
    else if (bodyLimpo === 'ajuda' || bodyLimpo === 'suporte' || bodyLimpo === 'atendente' || bodyLimpo === 'humano' || bodyLimpo === 'falar com humano' || bodyLimpo === 'problema' || bodyLimpo === 'erro' || bodyLimpo === 'professor') {
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, 'Entendi! 🚨 Vou repassar sua mensagem para um dos Professores. Por favor, aguarde um momento que logo entraremos em contato com você para te ajudar.');
    }
    
    // 4. BUSCA NA PLANILHA
    else {
        try {
            const response = await axios.get(urlPlanilha);
            const linhas = response.data.split('\n').slice(1); 
            
            let alunoEncontrado = null;

            for (let linha of linhas) {
                const colunas = linha.split(',');
                if (colunas.length >= 2) {
                    const nomePlanilha = colunas[0].trim();
                    const materiaisPlanilha = colunas[1].trim();

                    const nomePlanilhaLimpo = removerAcentos(nomePlanilha.toLowerCase());

                    if (nomePlanilhaLimpo === bodyLimpo) {
                        alunoEncontrado = {
                            nome: nomePlanilha, 
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
                    
                    // 🌟 1ª REGRA: SE FOR UM LINK (começa com http)
                    if (arquivo.startsWith('http')) {
                        await chat.sendStateTyping();
                        await delay(2000);
                        await client.sendMessage(msg.from, `🔗 Segue o link para acesso:\n\n${arquivo}`);
                    } 
                    // 🌟 2ª REGRA: SE FOR JWPUB ESPECÍFICO
                    else if (arquivo.endsWith('.jwpub')) {
                        await chat.sendStateTyping();
                        await delay(2000);
                        const linkDownload = 'https://drive.google.com/uc?export=download&id=12wYrAn2UnQF5IOWv8u81G1szMaaexr4u';
                        await client.sendMessage(msg.from, `Para baixar o arquivo (${arquivo}), clique aqui:\n\n${linkDownload}`);
                    }
                    // 🌟 3ª REGRA (NOVA): SE FOR ÁUDIO (mp3 ou ogg) - Manda gravado na hora!
                    else if (arquivo.endsWith('.mp3') || arquivo.endsWith('.ogg')) {
                        try {
                            // Finge que está gravando áudio (aparece "Gravando áudio..." lá no WhatsApp do aluno)
                            await chat.sendStateRecording();
                            await delay(4000); // Demora 4 segundos para parecer real
                            
                            const media = MessageMedia.fromFilePath(`./${arquivo}`);
                            // O pulo do gato: sendAudioAsVoice: true
                            await client.sendMessage(msg.from, media, { sendAudioAsVoice: true });
                        } catch (e) {
                            await client.sendMessage(msg.from, `❌ Áudio não encontrado: ${arquivo}`);
                        }
                    }
                    // 🌟 4ª REGRA: SE FOR UM ARQUIVO FÍSICO COMUM (PDF, PNG, etc)
                    else {
                        try {
                            await chat.sendStateTyping();
                            await delay(2000);
                            const media = MessageMedia.fromFilePath(`./${arquivo}`);
                            await client.sendMessage(msg.from, media, { sendMediaAsDocument: true });
                        } catch (e) {
                            await client.sendMessage(msg.from, `❌ Arquivo físico não encontrado: ${arquivo}`);
                        }
                    }
                }
                
                await chat.sendStateTyping();
                await delay(1000);
                await client.sendMessage(msg.from, 'Prontinho! Bons estudos! 🚀');
                registrarAcesso(alunoEncontrado.nome); 

            } else if (bodyLimpo.length > 3) {
                await client.sendMessage(msg.from, 'Nome não encontrado na planilha. Verifique a digitação.');
            }
        } catch (error) {
            console.error('Erro ao ler a planilha:', error);
        }
    }
});

client.initialize();