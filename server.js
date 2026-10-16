// carrega o .env ANTES de qualquer outra coisa usar process.env
require("dotenv").config();

// importa o framework Express
const express = require("express");

// importa só as funções do supabase.js que este arquivo usa
const {
  inserirAluno,
  listarAlunos,
  buscarPorRa,
  atualizarCurso,
  excluirPorRa,
} = require("./supabase");

// cria a aplicação Express - a partir daqui registramos as rotas
const app = express();

// MIDDLEWARE: roda em TODA requisição, antes de qualquer rota
// express.json() lê o corpo (body) enviado como JSON e transforma
// em um objeto comum do JavaScript, disponível em req.body
// sem esta linha, req.body chegaria "undefined" no POST/PUT
app.use(express.json());

// ======= GET /alunos =======
// primeiro argumento: o caminho da rota
// segundo argumento: a função "handler", que roda quando alguém acessa essa rota
app.get("/alunos", async (req, res) => {
  try {
    const dados = await listarAlunos(); // chama o supabase.js
    res.json(dados); // converte em JSON e envia; 200 OK é implícito
  } catch (e) {
    res.status(500).json({ erro: e.message }); // 500 = algo quebrou no servidor
  }
});

// ======= GET /alunos/2026001 =======
// "ra" é um PARÂMETRO DE ROTA – qualquer texto nessa posição
// da URL vira req.params.ra dentro da função
app.get("/alunos/:ra", async (req, res) => {
  try {
    const aluno = await buscarPorRa(req.params.ra);

    // se buscarPorRa devolveu null, o aluno não existe:
    // respondemos 404 e paramos aqui com "return"
    if (!aluno) return res.status(404).json({ erro: "Aluno não encontrado" });

    return res.json(aluno);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ===== POST /alunos - cria um novo aluno =====
// o cliente precisa enviar um body JSON, por exemplo:
// { "nome": "João", "ra": "2026002", "curso": "ADS" }
app.post("/alunos", async (req, res) => {
  try {
    // destructuring: extrai 3 campos do objeto req.body
    // de uma vez, em vez de escrever req.body.nome, req.body.curso
    const { nome, ra, curso } = req.body;

    // validação ANTES de gastar uma chamada ao banco:
    // nome e ra são obrigatórios; curso pode ficar de fora
    if (!nome || !ra) {
      return res.status(400).json({
        erro: "Campos obrigatórios: nome e ra",
      });
    }

    // só chega aqui se passou na validação
    const aluno = await inserirAluno(nome, ra, curso);

    // 201 = "Created": convenção HTTP para "recurso criado com sucesso"
    res.status(201).json(aluno);
  } catch (e) {
    // torna erro de RA duplicado uma resposta de negócio,
    // com 409 Conflict (conflito de dado único)
    if (e?.statusCode === 409 || e?.code === '23505' || e?.message?.includes('alunos_ra_key')) {
      return res.status(409).json({ erro: e.message || "RA já cadastrado" });
    }

    // cai aqui, por exemplo, se o RA já existir (unique no banco de dados)
    res.status(400).json({ erro: e.message });
  }
});

// ==== PUT /alunos/2026001 + altera o curso ====
// body esperado: { "curso": "SI" }
// combina req.params (qual aluno) + req.body (o que mudar)
app.put('/alunos/:ra', async (req, res) => {
    try {
    const data = await atualizarCurso(req.params.ra, req.body.curso);
    res.json(data);
    } catch (e) {
    res.status(400).json({ erro: e.message });
    }
});

// ==== DELETE /alunos/2026001 + apaga o aluno ====
// não precisa de body - só o RA já identifica o que apagar
app.delete('/alunos/:ra', async (req, res) => {
    try {
    const data = await excluirPorRa(req.params.ra);
    res.json(data);
    } catch (e) {
    res.status(400).json({ erro: e.message });
    }
});

// process.env.PORT veu do .env; 3000 é o valor usado
// SE a variável PORT não existir (operador ||)
const PORT = process.env.PORT || 3000;

// app.listen "liga" o servidor: a partir daqui ele fica
// escutando requisições até você apertar Ctrl+C no terminal
app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
});

const path = require('path');
const cors = require('cors');


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));