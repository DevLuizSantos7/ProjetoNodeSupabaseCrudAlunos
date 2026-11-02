// carrega o .env ANTES de qualquer outra coisa usar process.env
require('dotenv').config();
// importa o framework Express
const express = require('express');
const cors = require('cors');
const path = require('path');
// importa só as funções do supabase.js que este arquivo usa
const {
  inserirCurso, listarCursos, excluirCurso,
  inserirAluno, listarAlunos, listarAlunosDoCurso,
  buscarPorRa, atualizarAluno, excluirPorRa,
} = require('./supabase');
// código de erro do Postgres para "violação de chave estrangeira"
const ERRO_CHAVE_ESTRANGEIRA = '23503';
// cria a aplicação Express — a partir daqui registramos as rotas
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));
// Middleware global: interpreta corpos JSON e disponibiliza os dados em req.body.
// ===== GET /alunos → lista todos =====
// primeiro argumento: o caminho da rota
// segundo argumento: a função "handler", que roda quando alguém acessa essa rota

app.get('/alunos', async (req, res) => {
  try {
    const pagina = lerPagina(req.query);
    if (pagina && pagina.erro) return res.status(400).json({ erro: pagina.erro });
    const nome = typeof req.query.nome === 'string' ? req.query.nome.trim() : '';
    const dados = await listarAlunos(pagina || undefined, nome);
    res.json(pagina
      ? { ...dados, inicio: pagina.inicio, limite: pagina.limite }
      : dados);
  } catch (e) {
    res.status(500).json({ erro: e.message });   // 500 = algo quebrou no servidor
  }
});
// ===== GET /alunos/2026001 → busca só um =====
// ":ra" é um PARÂMETRO DE ROTA — qualquer texto nessa posição
// da URL vira req.params.ra dentro da função
app.get('/alunos/:ra', async (req, res) => {
  try {
    const aluno = await buscarPorRa(req.params.ra);
    // se buscarPorRa devolveu null, o aluno não existe:
    // respondemos 404 e paramos aqui com "return"
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ===== POST /alunos → cria um novo aluno =====
// body esperado:
// { "nome": "João", "ra": "2026002", "curso_id": 1 }
app.post('/alunos', async (req, res) => {
  try {
    // destructuring: extrai 3 campos de req.body
    const { nome, ra, curso_id } = req.body;
    // todo aluno precisa de nome, RA e curso
    if (!nome || !ra || !curso_id) {
      return res.status(400).json({
        erro: 'Campos obrigatórios: nome, ra e curso_id',
      });
    }
    const aluno = await inserirAluno(nome, ra, curso_id);
    res.status(201).json(aluno);   // 201 = Created
  } catch (e) {
    // curso_id que não existe em cursos
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) {
      return res.status(400).json({ erro: 'O curso informado não existe' });
    }
    // por exemplo: RA já existe (unique)
    res.status(400).json({ erro: e.message });
  }
});
// ===== PUT /alunos/2026001 → altera nome e/ou curso =====
// body esperado: { "nome": "Maria", "curso_id": 2 }
app.put('/alunos/:ra', async (req, res) => {
  try {
    const { nome, curso_id } = req.body;
    if (!nome && !curso_id) {
      return res.status(400).json({
        erro: 'Informe nome e/ou curso_id para atualizar',
      });
    }
    const data = await atualizarAluno(req.params.ra, nome, curso_id);
    res.json(data);
  } catch (e) {
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) {
      return res.status(400).json({ erro: 'O curso informado não existe' });
    }
    res.status(400).json({ erro: e.message });
  }
});
// ===== DELETE /alunos/2026001 → apaga o aluno =====
// não precisa de body — só o RA já identifica o que apagar
app.delete('/alunos/:ra', async (req, res) => {
  try {
    const data = await excluirPorRa(req.params.ra);
    res.json(data);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});
const PORT = process.env.PORT || 3000;

// ===== GET /cursos → lista os cursos com o total de alunos =====
app.get('/cursos', async (req, res) => {
  try {
    res.json(await listarCursos());
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});
// ===== POST /cursos → cria um curso. body: { "nome": "ADS" } =====
app.post('/cursos', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Campo obrigatório: nome' });
    res.status(201).json(await inserirCurso(nome));
  } catch (e) {
    res.status(400).json({ erro: e.message });   // ex.: nome repetido
  }
});
// ===== DELETE /cursos/3 → apaga o curso =====
app.delete('/cursos/:id', async (req, res) => {
  try {
    res.json(await excluirCurso(req.params.id));
  } catch (e) {
    // o curso ainda tem alunos → o banco recusou (on delete restrict)
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) {
      return res.status(409).json({
        erro: 'Não é possível excluir: este curso ainda tem alunos',
      });
    }
    res.status(400).json({ erro: e.message });
  }
});
// ===== GET /cursos/3/alunos → os alunos de UM curso =====
app.get('/cursos/:id/alunos', async (req, res) => {
  try {
    const pagina = lerPagina(req.query);
    if (pagina?.erro) return res.status(400).json({ erro: pagina.erro });
    const nome = typeof req.query.nome === 'string' ? req.query.nome.trim() : '';
    const dados = await listarAlunosDoCurso(req.params.id, pagina || undefined, nome);
    res.json(pagina ? { ...dados, inicio: pagina.inicio, limite: pagina.limite } : dados);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

function lerPagina(query) {
  if (query.limite === undefined && query.inicio === undefined) return null;

  const limite = Number(query.limite);
  const inicio = query.inicio === undefined ? 0 : Number(query.inicio);

  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    return { erro: 'Informe limite entre 1 e 100' };
  }
  if (!Number.isInteger(inicio) || inicio < 0) {
    return { erro: 'inicio inválido' };
  }

  return { inicio, limite };
}

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});