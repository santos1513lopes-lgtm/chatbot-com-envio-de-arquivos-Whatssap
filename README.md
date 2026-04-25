# chatbot-com-envio-de-arquivos-Whatssap
Guia Completo: Bot WhatsApp na AWS
Este documento contém todo o passo a passo para configurar, rodar e gerenciar o seu bot de materiais no WhatsApp usando AWS e PM2.
1. Configuração Local (Seu Computador)
Antes de subir para a nuvem, você deve garantir que o projeto está rodando localmente.
Instale as dependências:
npm install whatsapp-web.js qrcode-terminal fs
2. Estrutura do Projeto
Mantenha seus arquivos organizados conforme a tabela abaixo:
Arquivo
Descrição
 
chatbot.js
Arquivo principal com a lógica do robô (Saudação, Digitando, Envio de Arquivos/Links).
alunos.json
Banco de dados em formato JSON com a lista de nomes e materiais.
.gitignore
Configuração para o Git ignorar arquivos sensíveis (como a chave .pem).

3. Configuração na AWS (Servidor Nuvem)
3.1 Acesso via SSH
Use o comando abaixo no terminal do seu VS Code para entrar na sua máquina virtual:
ssh -i "sua-chave.pem" ubuntu@seu-ip-da-aws.compute.amazonaws.com
3.2 Acessando a Pasta do Projeto
Sempre que você entrar no servidor da AWS, o primeiro passo antes de executar qualquer comando do robô é entrar na pasta onde os arquivos estão:
cd chatbot-com-envio-de-arquivos-whatssap
3.3 Comandos de Gerenciamento (PM2)
O PM2 é o que mantém o seu robô rodando mesmo quando você fecha o computador.
Comando
O que faz
 
pm2 start chatbot.js --name "bot-wa"
Inicia o robô pela primeira vez.
pm2 logs
Acompanha o funcionamento e exibe o QR Code.
pm2 restart bot-wa
Aplica as mudanças após um git pull.
pm2 stop bot-wa
Pausa o robô.
pm2 list
Lista todos os processos ativos.

4. Ciclo de Atualização Perfeito
Sempre que você precisar adicionar um aluno ou mudar um texto, siga esta ordem rigorosa:
No seu PC: Altere o código ou o JSON e salve.
No seu PC: Envie para o GitHub:
git add .
git commit -m "Atualização de teste"
git push
Na AWS: Entre na pasta do projeto (caso não tenha feito) e puxe a novidade:
cd chatbot-com-envio-de-arquivos-whatssap
git pull
Na AWS: Reinicie o processo para carregar a mudança:
pm2 restart bot-wa
5. Dicas de Segurança e Resolução de Erros
Erro EBADF no PM2: Execute pm2 kill e depois pm2 start chatbot.js --name "bot-wa".
Erro de Conexão (Timed Out): Reinicie a instância no painel da AWS e pegue o novo IP se necessário.
Arquivo .gitignore: Certifique-se de que sua chave .pem e a pasta node_modules estão listadas lá.

