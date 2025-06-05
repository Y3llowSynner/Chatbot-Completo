const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const mercadopago = require('mercadopago');
const axios = require('axios');
const client = new Client({
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

mercadopago.configure({
    access_token: 'APP_USR-7978484233362107-060410-7360acb805227d0e2b575152b8431b4f-76247140'
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});
client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});
client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms));

const usuariosLiberados = {};
const pedidos = {};
const valoresConsulta = {
    2: 5.00,
    4: 10.00,
    6: 15.00
};
const perguntasPermitidas = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50];

const aguardandoRespostas = {};

const palavrasChave = [
    "quero", "desejo", "anseio", "almejo", "ambiciono", "aspiro", "cobiço", "pretendo", "busco", "procuro", "tenho em mente", "penso em", "tenho vontade de",
    "tô a fim", "tô querendo", "tô na vibe de", "bateu vontade", "tô nessa", "tô sedenta", "gostaria", "adoraria", "apreciaria", "me encantaria", "seria incrível",
    "seria bom", "seria ótimo", "me agradaria", "cairia bem", "preciso", "necessito", "careço", "dependo", "é essencial", "é vital", "é urgente", "é necessário",
    "não posso ficar sem", "é prioridade", "não dá pra adiar"
];

const numerosExtenso = {
    "um": 1, "uma": 1, "dois": 2, "duas": 2, "três": 3, "tres": 3, "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10,
    "onze": 11, "doze": 12, "treze": 13, "quatorze": 14, "catorze": 14, "quinze": 15, "dezesseis": 16, "dezessete": 17, "dezoito": 18, "dezenove": 19, "vinte": 20,
    "vinte e dois": 22, "vinte e quatro": 24, "vinte e seis": 26, "vinte e oito": 28, "trinta": 30
};

function extrairNumero(str) {
    str = str.trim().toLowerCase();
    if (/^\d+$/.test(str)) return parseInt(str);
    if (numerosExtenso[str]) return numerosExtenso[str];
    for (const [palavra, valor] of Object.entries(numerosExtenso)) {
        if (str.includes(palavra)) return valor;
    }
    return null;
}

async function criarCobrancaPix(valor, descricao) {
    const payment_data = {
        transaction_amount: valor,
        description: descricao,
        payment_method_id: 'pix',
        payer: {
            email: 'comprador@email.com',
            first_name: 'Cliente',
            last_name: 'Bot'
        }
    };
    const pagamento = await mercadopago.payment.create(payment_data);
    return {
        id: pagamento.body.id,
        qr_code: pagamento.body.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: pagamento.body.point_of_interaction.transaction_data.qr_code_base64,
        valor: pagamento.body.transaction_amount
    };
}

async function verificarPagamentoPix(paymentId) {
    const pagamento = await mercadopago.payment.get(paymentId);
    return {
        aprovado: pagamento.body.status === 'approved',
        valor: pagamento.body.transaction_amount
    };
}

function detectarGenero(nome) {
    if (!nome) return 'neutro';
    const nomeLimpo = nome.trim().toLowerCase();
    if (nomeLimpo.endsWith('a') || nomeLimpo.endsWith('eia') || nomeLimpo.endsWith('ia')) return 'feminino';
    if (nomeLimpo.endsWith('o') || nomeLimpo.endsWith('io')) return 'masculino';
    return 'neutro';
}

async function responderComIA(pergunta, nome) {
    const genero = detectarGenero(nome);
    let generoTexto = '';
    if (genero === 'feminino') generoTexto = 'A consulente é mulher.';
    else if (genero === 'masculino') generoTexto = 'O consulente é homem.';
    else generoTexto = 'Não foi possível identificar o gênero do consulente.';

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `${generoTexto}
Você é Carol Olivie, uma taróloga mística, acolhedora, dramática e muito humana.
Fale sempre em primeira pessoa, como se estivesse conversando pessoalmente.
Nunca mencione cartas, baralhos ou sorteios.
Responda sempre de forma extremamente breve, clara, objetiva e com emoção, como uma verdadeira taróloga.
No início de cada resposta, varie bastante entre frases como: "Sim,", "Talvez,", "Não,", "Espero que sim,", "Tudo é possível,", "Bem provavelmente sim,", "Bem provável que não,", "As energias mostram que...", "Olha...", "Bem...", "Sabe...", "Te digo que...", "Às vezes a vida surpreende, e...", "Tudo indica que...", "É possível que...", "Bem provável que sim,", "Bem provável que não,", "Com sinceridade,", "Com alegria,", "Com emoção,".
Nunca repita sempre o mesmo início, varie como um ser humano.
Sempre dê uma resposta clara à pergunta, mesmo que seja "sim", "não", "talvez", "pode ser que sim", "pode ser que não", "tudo é possível", etc, e nunca fique em cima do muro.
Dê respostas diretas, resumidas, dramáticas e com tom de conselho, como: "Sim, você terá que ser persistente para alcançar seu objetivo. Mudança inesperada pode trazer sucesso na venda."
Nunca diga que é uma IA, nunca explique o método, apenas responda como Carol Olivie.
Seja sempre acolhedora, intensa, dramática, mas nunca se prolongue.
Sempre responda a pergunta do usuário, mesmo que de forma breve e humana.`
                    },
                    { role: 'user', content: pergunta }
                ]
            },
            {
                headers: {
                    'Authorization': 'Bearer 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',
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        if (error.response) {
            console.log('Erro OpenAI:', error.response.status, error.response.data);
        } else {
            console.log('Erro OpenAI:', error.message);
        }
        return 'Desculpe, não consegui responder agora.';
    }
}

async function enviarMensagemInicial(msg) {
    await client.sendMessage(
        msg.from,
        `🌟 CONSULTA EXPRESSA DE TAROT
Olá, bem-vinda(o)! Sou Carol Olivié e estou muito feliz em ter você aqui comigo 😊

📩 2 perguntas por apenas R$5,00
Você pode fazer quantas perguntas quiser:
– 2 por R$5,00
– 4 por R$10,00
– 6 por R$15,00
– E assim por diante...

🧘‍♀ Exemplos de perguntas válidas:
– Vou conseguir me separar do Fulano?
– Ele/ela ainda me ama?
– Vou comprar minha casa própria?

⚠️ Perguntas devem ser objetivas.
❌ Não aceito perguntas genéricas como:
“o que o universo quer me dizer?”

💬 Como funciona:
✔ Envie suas perguntas por texto (áudios não serão ouvidos)
✔ A resposta vem por mensagem de WhatsApp
✔ Entrega em até 45 dias
✔ Atendimento só com pagamento via Pix Mercado Pago
✔ Código “copiar e colar” é gerado aqui no chat
✔ As perguntas são respondidas conforme o nome e data da pessoa envolvida

📌 Para ser atendida(o), envie:

Seu nome completo

Sua data de nascimento

As perguntas com os nomes das pessoas envolvidas

💡 Pode mandar tudo junto ou separado por mensagens.

⚡ VAGAS LIMITADAS!
Essa oferta pode sair do ar a qualquer momento. Aproveite!

🔢 Quantas perguntas deseja? 2, 4, 6, 8, 10...
Ou digite “menu” para ver novamente.

📦 Exemplos:
– "Quero 2 consultas de 6 perguntas" (R$30,00)
– "Quero 12 perguntas" (R$30,00)

✨ Com carinho e propósito,
Carol Olivié – Tarot com alma 

`
    );
}

// Função para identificar nome e data mesmo juntos e datas em vários formatos
function coletarCampoSimples(msg, etapa) {
    const texto = msg.body.trim();
    // Aceita datas: xx/xx/xxxx, xx.xx.xxxx, xx xx xxxx, xxxxxxxx, xx-xx-xxxx, xx xx xx, xxxxxx
    const dataRegex = /(\d{2})[\/\.\s-]?(\d{2})[\/\.\s-]?(\d{2,4})/;

    if (etapa === 'nome') {
        // Se a mensagem contém nome e data juntos, separa
        const partes = texto.split(/[\n,;]/).map(p => p.trim()).filter(Boolean);
        for (let parte of partes) {
            if (parte.match(dataRegex)) continue;
            if (parte.length > 2 && !parte.match(dataRegex)) return parte;
        }
        if (texto.match(dataRegex)) return null;
        const nomePossivel = texto.replace(dataRegex, '').trim();
        if (nomePossivel.length > 2) return nomePossivel;
        return null;
    }
    if (etapa === 'nascimento') {
        let match = texto.match(dataRegex);
        if (match) {
            let dia = match[1];
            let mes = match[2];
            let ano = match[3];
            if (ano.length === 2) ano = '19' + ano;
            if (ano.length === 3) ano = '1' + ano;
            return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano.padStart(4, '0')}`;
        }
        const partes = texto.split(/[\n,;]/).map(p => p.trim()).filter(Boolean);
        for (let parte of partes) {
            let m = parte.match(dataRegex);
            if (m) {
                let dia = m[1];
                let mes = m[2];
                let ano = m[3];
                if (ano.length === 2) ano = '19' + ano;
                if (ano.length === 3) ano = '1' + ano;
                return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano.padStart(4, '0')}`;
            }
        }
        return null;
    }
    if (etapa === 'pergunta') {
        if (texto.match(dataRegex)) return null;
        if (texto.split(' ').length < 2) return null;
        return texto.replace(/^\d+[\.\-\)]?\s*/, '');
    }
    return null;
}

// Função para extrair todas as perguntas de uma mensagem (mesmo juntas)
function extrairPerguntas(texto, totalEsperado) {
    let perguntas = [];
    let linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
    for (let linha of linhas) {
        // Divide por números (ex: 1. xxx 2. xxx)
        let partes = linha.split(/(?:^|\s)(\d{1,2})[\.\-\)]\s*/).filter(Boolean);
        if (partes.length > 1) {
            let temp = [];
            for (let p of partes) {
                if (!/^\d+$/.test(p)) temp.push(p.trim());
            }
            perguntas.push(...temp);
        } else {
            // Divide por "?" se houver várias perguntas na mesma linha
            let subPergs = linha.split('?').map(p => p.trim()).filter(p => p.length > 3);
            if (subPergs.length > 1) {
                perguntas.push(...subPergs.map(p => p + '?'));
            } else {
                if (linha.length > 3) perguntas.push(linha);
            }
        }
    }
    if (perguntas.length > totalEsperado) perguntas = perguntas.slice(0, totalEsperado);
    return perguntas;
}

// Controle de etapas do usuário
const etapasUsuario = {};
const etapasCadastro = {}; // { [from]: { etapa: 'nome'|'nascimento'|'pergunta', perguntas: [], total: 0, nome: '', nascimento: '' } }

async function processarEscolhaConsulta(msg, quantidade) {
    if (!perguntasPermitidas.includes(quantidade)) {
        await client.sendMessage(msg.from, 'Por favor, escolha um número de perguntas válido: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50.');
        return;
    }
    let valor = 0;
    if (quantidade % 6 === 0) valor = (quantidade / 6) * valoresConsulta[6];
    else if (quantidade % 4 === 0) valor = (quantidade / 4) * valoresConsulta[4];
    else if (quantidade % 2 === 0) valor = (quantidade / 2) * valoresConsulta[2];
    else valor = (quantidade / 2) * valoresConsulta[2];

    const cobranca = await criarCobrancaPix(valor, `Consulta Tarot ${quantidade} perguntas`);
    if (!pedidos[msg.from]) pedidos[msg.from] = [];
    pedidos[msg.from].push({ valor, quantidade, id: cobranca.id });

    await client.sendMessage(
        msg.from,
        `Para sua consulta de ${quantidade} perguntas, faça o pagamento de R$${valor.toFixed(2)} via Pix Mercado Pago.

🔗 Pix copia e cola (basta segurar para copiar, não precisa clicar):
(Envio o código Pix logo abaixo, em uma mensagem separada)

Ou escaneie o QR Code abaixo.

O pagamento é verificado automaticamente. Assim que for aprovado, você receberá a confirmação aqui.`
    );
    await client.sendMessage(msg.from, cobranca.qr_code);

    await client.sendMessage(
        msg.from,
        new MessageMedia('image/png', cobranca.qr_code_base64)
    );
}

function getTotalPerguntasLiberadas(msgFrom) {
    if (!usuariosLiberados[msgFrom] || !usuariosLiberados[msgFrom].quantidadesPagas) return 0;
    return usuariosLiberados[msgFrom].quantidadesPagas.reduce((a, b) => a + b, 0);
}

async function responderPerguntasComPrazo(msg, dados, prazoMs) {
    const aberturas = [
        `Aqui estão suas respostas, recebidas com carinho:`,
        `Prontinho! Suas respostas chegaram:`,
        `Com toda minha dedicação, seguem suas respostas:`,
        `Olha só o que senti para você:`,
        `Aqui está o que vejo para você:`,
        `Com emoção, te entrego suas respostas:`
    ];
    setTimeout(async () => {
        let respostas = [];
        for (let i = 0; i < dados.perguntas.length; i++) {
            const resposta = await responderComIA(dados.perguntas[i], dados.nome);
            respostas.push(`${i + 1}. ${resposta}`);
            await delay(1500);
        }
        const abertura = aberturas[Math.floor(Math.random() * aberturas.length)];
        await client.sendMessage(
            msg.from,
            `${abertura}\n\n${respostas.join('\n')}\n\nPrazo máximo era 30 dias, mas entreguei rapidinho! Gratidão pela confiança.`
        );
        delete aguardandoRespostas[msg.from];
        etapasUsuario[msg.from] = null;
        usuariosLiberados[msg.from] = null;
    }, prazoMs);
}

async function processarNovoPedido(msg) {
    const texto = msg.body.toLowerCase().trim();

    if (/^\d+$/.test(texto)) {
        const numero = parseInt(texto);
        if (perguntasPermitidas.includes(numero)) {
            await processarEscolhaConsulta(msg, numero);
            return true;
        }
        if ([5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 300, 400, 500].includes(numero)) {
            await client.sendMessage(
                msg.from,
                `Você enviou apenas o valor em reais. Por favor, envie apenas o número de perguntas desejadas (ex: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, ...).`
            );
            return true;
        }
    }

    if (numerosExtenso[texto]) {
        const qtd = numerosExtenso[texto];
        if (perguntasPermitidas.includes(qtd)) {
            await processarEscolhaConsulta(msg, qtd);
            return true;
        }
    }

    for (const palavra of palavrasChave) {
        const regex = new RegExp(`${palavra}\\s+(\\d{1,2}|${Object.keys(numerosExtenso).join("|")})`, "i");
        const match = texto.match(regex);
        if (match) {
            const qtd = extrairNumero(match[1]);
            if (perguntasPermitidas.includes(qtd)) {
                await processarEscolhaConsulta(msg, qtd);
                return true;
            }
        }
    }

    for (const palavra of palavrasChave) {
        const regex = new RegExp(`${palavra}\\s+(\\d+|${Object.keys(numerosExtenso).join("|")})\\s+de\\s+(\\d+|${Object.keys(numerosExtenso).join("|")})`, "i");
        const match = texto.match(regex);
        if (match) {
            let vezes = extrairNumero(match[1]);
            let qtdPorConsulta = extrairNumero(match[2]);
            if ([2, 4, 6].includes(qtdPorConsulta) && vezes > 0) {
                for (let i = 0; i < vezes; i++) {
                    await processarEscolhaConsulta(msg, qtdPorConsulta);
                }
                return true;
            }
        }
    }

    for (const palavra of palavrasChave) {
        const regex = new RegExp(`${palavra}\\s+(\\d+|${Object.keys(numerosExtenso).join("|")})\\s+consultas?\\s+de\\s+(\\d+|${Object.keys(numerosExtenso).join("|")})`, "i");
        const match = texto.match(regex);
        if (match) {
            let vezes = extrairNumero(match[1]);
            let qtdPorConsulta = extrairNumero(match[2]);
            if ([2, 4, 6].includes(qtdPorConsulta) && vezes > 0) {
                for (let i = 0; i < vezes; i++) {
                    await processarEscolhaConsulta(msg, qtdPorConsulta);
                }
                return true;
            }
        }
    }

    let matchSimples = texto.match(/quero\s+(\d{1,2})\s+perguntas?/);
    if (matchSimples) {
        const qtd = parseInt(matchSimples[1]);
        if (perguntasPermitidas.includes(qtd)) {
            await processarEscolhaConsulta(msg, qtd);
            return true;
        }
    }

    let matchSoNumero = texto.match(/^quero\s+(\d{1,2})$/);
    if (matchSoNumero) {
        const qtd = parseInt(matchSoNumero[1]);
        if (perguntasPermitidas.includes(qtd)) {
            await processarEscolhaConsulta(msg, qtd);
            return true;
        }
    }

    if (texto.includes('consulta de 2') || texto.includes('consulta de 5')) {
        await processarEscolhaConsulta(msg, 2);
        return true;
    }
    if (texto.includes('consulta de 4') || texto.includes('consulta de 10')) {
        await processarEscolhaConsulta(msg, 4);
        return true;
    }
    if (texto.includes('consulta de 6') || texto.includes('consulta de 15')) {
        await processarEscolhaConsulta(msg, 6);
        return true;
    }
    return false;
}

setInterval(async () => {
    for (const user in pedidos) {
        const listaPedidos = Array.isArray(pedidos[user]) ? pedidos[user] : [pedidos[user]];
        for (let i = 0; i < listaPedidos.length; i++) {
            const pendente = listaPedidos[i];
            try {
                const resultado = await verificarPagamentoPix(pendente.id);
                if (resultado.aprovado) {
                    if (!usuariosLiberados[user]) usuariosLiberados[user] = { quantidadesPagas: [], perguntasRecebidas: false };
                    if (!usuariosLiberados[user].quantidadesPagas) usuariosLiberados[user].quantidadesPagas = [];
                    let quantidade = pendente.quantidade;
                    usuariosLiberados[user].quantidadesPagas.push(quantidade);
                    usuariosLiberados[user].perguntasRecebidas = false;
                    const total = getTotalPerguntasLiberadas(user);
                    etapasUsuario[user] = 'aguardando_dados';
                    delete etapasCadastro[user];
                    await client.sendMessage(
                        user,
                        `**ATENÇÃO: SÓ PODE UMA CONSULTA POR VEZ, UMA PESSOA POR CONSULTA E UMA MENSAGEM POR VEZ!**
Pagamento confirmado automaticamente! 🙏

PASSO 1: Envie o seu NOME COMPLETO (apenas uma pessoa por consulta, não envie data ou perguntas junto).`
                    );
                    if (Array.isArray(pedidos[user])) pedidos[user].splice(i, 1);
                    else delete pedidos[user];
                    break;
                }
            } catch (e) {}
        }
    }
}, 20000);

client.on('message', async msg => {
    // Se está aguardando resposta, bloqueia qualquer mensagem até terminar a entrega
    if (aguardandoRespostas[msg.from]) {
        etapasUsuario[msg.from] = 'aguardando_resposta';
        await client.sendMessage(
            msg.from,
            `**ATENÇÃO: SÓ PODE UMA CONSULTA POR VEZ!**
Aguarde! Suas respostas ainda estão sendo preparadas. Assim que estiverem prontas, enviarei aqui mesmo no WhatsApp. Gratidão pela confiança!`
        );
        return;
    }

    // Se está aguardando pagamento Pix, só aceita mensagens relacionadas ao Pix
    if (etapasUsuario[msg.from] === 'aguardando_pix') {
        await client.sendMessage(
            msg.from,
            `**ATENÇÃO: SÓ PODE UMA CONSULTA POR VEZ!**
Você já solicitou uma consulta. Por favor, realize o pagamento via Pix usando o código enviado. Assim que o pagamento for confirmado automaticamente, você poderá enviar seus dados e perguntas.`
        );
        return;
    }

    // FLUXO DE CADASTRO UM POR UM OU TUDO JUNTO
    if (etapasUsuario[msg.from] === 'aguardando_dados') {
        if (!etapasCadastro[msg.from]) {
            etapasCadastro[msg.from] = { etapa: 'nome', perguntas: [], total: getTotalPerguntasLiberadas(msg.from), nome: '', nascimento: '' };
            await client.sendMessage(
                msg.from,
                `**ATENÇÃO: SÓ PODE UMA CONSULTA POR VEZ, UMA PESSOA POR CONSULTA E UMA MENSAGEM POR VEZ!**
Envie PRIMEIRO o seu **NOME COMPLETO** (apenas uma pessoa por consulta, não envie data ou perguntas junto).`
            );
            return;
        }

        const cadastro = etapasCadastro[msg.from];

        // TUDO JUNTO: nome, data e perguntas
        const nomeJunto = coletarCampoSimples(msg, 'nome');
        const nascimentoJunto = coletarCampoSimples(msg, 'nascimento');
        let perguntasJuntas = [];
        if (nomeJunto && nascimentoJunto) {
            // Extrai perguntas do restante da mensagem
            let textoRestante = msg.body.replace(nomeJunto, '').replace(nascimentoJunto, '').trim();
            perguntasJuntas = extrairPerguntas(textoRestante, cadastro.total);
            if (perguntasJuntas.length === cadastro.total) {
                cadastro.nome = nomeJunto;
                cadastro.nascimento = nascimentoJunto;
                cadastro.perguntas = perguntasJuntas;
                usuariosLiberados[msg.from].perguntasRecebidas = true;
                aguardandoRespostas[msg.from] = true;
                etapasUsuario[msg.from] = 'aguardando_resposta';
                delete etapasCadastro[msg.from];
                await client.sendMessage(
                    msg.from,
                    `Recebi todas as suas perguntas! O prazo máximo é 30 dias, mas normalmente respondo bem antes disso. Aguarde sua resposta completa aqui no WhatsApp.`
                );
                await responderPerguntasComPrazo(msg, {
                    nome: cadastro.nome,
                    nascimento: cadastro.nascimento,
                    perguntas: cadastro.perguntas
                }, usuariosLiberados[msg.from].bypass ? 10000 : 27 * 60 * 60 * 1000);
                return;
            } else {
                await client.sendMessage(
                    msg.from,
                    `**ATENÇÃO:** Identifiquei seu nome e data, mas não consegui identificar todas as perguntas. Por favor, envie novamente as ${cadastro.total} perguntas (pode ser todas juntas ou uma por mensagem).`
                );
                return;
            }
        }

        // Nome
        if (cadastro.etapa === 'nome') {
            const nome = coletarCampoSimples(msg, 'nome');
            if (!nome) {
                await client.sendMessage(
                    msg.from,
                    `**ATENÇÃO: UMA MENSAGEM POR VEZ!**
Envie PRIMEIRO o seu **NOME COMPLETO** (apenas uma pessoa por consulta, não envie data ou perguntas junto).`
                );
                return;
            }
            cadastro.nome = nome;
            cadastro.etapa = 'nascimento';
            await client.sendMessage(
                msg.from,
                `Agora envie a sua **DATA DE NASCIMENTO** no formato DD/MM/AAAA (não envie nome ou perguntas junto).`
            );
            return;
        }

        // Data de nascimento
        if (cadastro.etapa === 'nascimento') {
            const nascimento = coletarCampoSimples(msg, 'nascimento');
            if (!nascimento) {
                await client.sendMessage(
                    msg.from,
                    `**ATENÇÃO: UMA MENSAGEM POR VEZ!**
Envie apenas a sua **DATA DE NASCIMENTO** no formato DD/MM/AAAA (não envie nome ou perguntas junto).`
                );
                return;
            }
            cadastro.nascimento = nascimento;
            cadastro.etapa = 'pergunta';
            cadastro.perguntas = [];
            await client.sendMessage(
                msg.from,
                `Agora envie a sua **PRIMEIRA PERGUNTA** (envie cada pergunta em uma mensagem separada, ou todas juntas, no total serão ${cadastro.total}).`
            );
            return;
        }

        // Perguntas
        if (cadastro.etapa === 'pergunta') {
            let novasPerguntas = extrairPerguntas(msg.body, cadastro.total - cadastro.perguntas.length);
            if (novasPerguntas.length === 0) {
                await client.sendMessage(
                    msg.from,
                    `**ATENÇÃO:**
Envie sua(s) **PERGUNTA(S)** (pode enviar todas juntas ou uma por mensagem, mas não envie nome ou data junto).`
                );
                return;
            }
            cadastro.perguntas.push(...novasPerguntas);
            if (cadastro.perguntas.length < cadastro.total) {
                await client.sendMessage(
                    msg.from,
                    `Pergunta(s) recebida(s)! Agora envie a próxima pergunta (${cadastro.perguntas.length + 1} de ${cadastro.total}).`
                );
                return;
            }
            if (cadastro.perguntas.length > cadastro.total) {
                cadastro.perguntas = [];
                await client.sendMessage(
                    msg.from,
                    `**ATENÇÃO:** Você enviou mais perguntas do que o permitido (${cadastro.total}). Por favor, envie novamente apenas as ${cadastro.total} perguntas.`
                );
                return;
            }
            usuariosLiberados[msg.from].perguntasRecebidas = true;
            aguardandoRespostas[msg.from] = true;
            etapasUsuario[msg.from] = 'aguardando_resposta';
            delete etapasCadastro[msg.from];
            await client.sendMessage(
                msg.from,
                `Recebi todas as suas perguntas! O prazo máximo é 30 dias, mas normalmente respondo bem antes disso. Aguarde sua resposta completa aqui no WhatsApp.`
            );
            await responderPerguntasComPrazo(msg, {
                nome: cadastro.nome,
                nascimento: cadastro.nascimento,
                perguntas: cadastro.perguntas
            }, usuariosLiberados[msg.from].bypass ? 10000 : 27 * 60 * 60 * 1000);
            return;
        }
        return;
    }

    // Se já existe uma consulta paga e já enviou as perguntas, bloqueia novas consultas até finalizar
    if (
        usuariosLiberados[msg.from] &&
        usuariosLiberados[msg.from].perguntasRecebidas
    ) {
        etapasUsuario[msg.from] = 'aguardando_resposta';
        await client.sendMessage(
            msg.from,
            `**ATENÇÃO: SÓ PODE UMA CONSULTA POR VEZ!**
Você já enviou suas perguntas! Aguarde a resposta antes de iniciar uma nova consulta.`
        );
        return;
    }

    // Mensagens de saudação/menu só funcionam se não estiver em outra etapa
    if (
        !etapasUsuario[msg.from] &&
        (
            msg.body.match(/\b(bom dia|boa tarde|boa noite|oi|oie|olá|ola|olá|boa|tarde|noite)\b/i) ||
            msg.body.match(/^(menu|iniciar|começar|inicio|início|start)$/i) ||
            msg.body === '1'
        )
    ) {
        await enviarMensagemInicial(msg);
        return;
    }

    // Liberação de teste
    if (!etapasUsuario[msg.from] && msg.body.includes('0304')) {
        if (!usuariosLiberados[msg.from]) usuariosLiberados[msg.from] = { quantidadesPagas: [], perguntasRecebidas: false, bypass: true };
        if (!usuariosLiberados[msg.from].quantidadesPagas) usuariosLiberados[msg.from].quantidadesPagas = [];
        usuariosLiberados[msg.from].bypass = true;
        usuariosLiberados[msg.from].perguntasRecebidas = false;

        if (pedidos[msg.from]) {
            const listaPedidos = Array.isArray(pedidos[msg.from]) ? pedidos[msg.from] : [pedidos[msg.from]];
            for (const pendente of listaPedidos) {
                let quantidade = pendente.quantidade;
                usuariosLiberados[msg.from].quantidadesPagas.push(quantidade);
            }
            delete pedidos[msg.from];
        }

        let total = getTotalPerguntasLiberadas(msg.from);
        if (total === 0) {
            usuariosLiberados[msg.from].quantidadesPagas.push(2);
            total = 2;
        }
        etapasUsuario[msg.from] = 'aguardando_dados';
        delete etapasCadastro[msg.from];
        await client.sendMessage(
            msg.from,
            `**ATENÇÃO: SÓ PODE UMA CONSULTA POR VEZ, UMA PESSOA POR CONSULTA E UMA MENSAGEM POR VEZ!**
Acesso liberado para teste!

PASSO 1: Envie o seu NOME COMPLETO (apenas uma pessoa por consulta, não envie data ou perguntas junto).`
        );
        return;
    }

    // Só permite iniciar nova consulta se não houver nenhuma pendente
    if (!etapasUsuario[msg.from] && await processarNovoPedido(msg)) {
        etapasUsuario[msg.from] = 'aguardando_pix';
        return;
    }

    // Se não caiu em nenhum fluxo acima, responde com mensagem padrão
    await client.sendMessage(
        msg.from,
        `**ATENÇÃO: SÓ PODE UMA CONSULTA POR VEZ E UMA PESSOA POR CONSULTA!**
Para começar sua consulta, envie "menu" ou escolha a quantidade de perguntas. 
Se já iniciou uma consulta, aguarde a resposta antes de iniciar outra.`
    );
});