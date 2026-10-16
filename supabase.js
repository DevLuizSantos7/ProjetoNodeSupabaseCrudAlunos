// carrega SUPABASE_URL, SUPABASE_ANON_KEY e PORT para process.env
// isso precisa vir antes de qualquer uso de process.env
require('dotenv').config();

// importa a função que constrói o cliente HTTP do Supabase
const { createClient } = require('@supabase/supabase-js');

// lê as variáveis como texto simples (strings)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// validação defensiva: se o .env estiver incompleto,
// é melhor travar aqui com uma mensagem clara do que
// receber um erro confuso mais adiante
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env');
}

// "supabase" é o objeto que sabe conversar com o seu projeto
// por baixo dos panos ele usa HTTPS e envia a anon key no header
// de cada requisição, para o Postgres saber quem está pedindo
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// equivalente a: INSERT INTO cursos (nome) VALUES (...)
async function inserirCurso(nome) {
  const { data, error } = await supabase
    .from('cursos')
    .insert([{ nome }])
    .select()
    .single();

  if (error) throw error;
  return data;   // { id, nome, criado_em }
}

// lista os cursos e conta quantos alunos cada um tem
async function listarCursos() {
  const { data, error } = await supabase
    .from('cursos')
    .select('id, nome, alunos(count)')   // conta os alunos relacionados
    .order('nome', { ascending: true });

  if (error) throw error;

    // o Supabase devolve: { id, nome, alunos: [{ count: 3 }] }
  // simplificamos para:   { id, nome, total_alunos: 3 }
  return data.map((curso) => ({
    id: curso.id,
    nome: curso.nome,
    total_alunos: curso.alunos[0]?.count ?? 0,
  }));
}

// se o curso ainda tiver alunos, o banco recusa (on delete restrict)
// e o erro vem com code '23503' (violação de chave estrangeira)
async function excluirCurso(id) {
  const { data, error } = await supabase
    .from('cursos').delete().eq('id', id).select();

  if (error) throw error;
  return data;
}

// colunas que pedimos sempre que lemos alunos (inclui o curso relacionado)
// guardamos numa constante para não repetir o texto em todas as funções
const COLUNAS_ALUNO = 'id, nome, ra, curso_id, criado_em, curso:cursos(id, nome)';

// equivalente a: INSERT INTO alunos (nome, ra, curso_id) VALUES (...)
async function inserirAluno(nome, ra, cursoId) {
  const { data, error } = await supabase
    .from('alunos')
    .insert([{ nome, ra, curso_id: cursoId }])   // grava o ID do curso
    .select(COLUNAS_ALUNO)   // devolve a linha criada, já com o curso
    .single();

  // error: RLS bloqueou, RA duplicado, curso inexistente...
  if (error) throw error;
  return data;
}

// todos os alunos, cada um com o seu curso
async function listarAlunos() {
  const { data, error } = await supabase
    .from('alunos')
        .select(COLUNAS_ALUNO)
    .order('id', { ascending: true });

  if (error) throw error;
  return data;   // [ {...}, {...} ] ou []
}

// o 1:N na prática: dado UM curso, os N alunos dele
// equivalente a: SELECT ... FROM alunos WHERE curso_id = ...
async function listarAlunosDoCurso(cursoId) {
  const { data, error } = await supabase
    .from('alunos')
    .select(COLUNAS_ALUNO)
    .eq('curso_id', cursoId)   // filtra pela chave estrangeira
    .order('nome', { ascending: true });

  if (error) throw error;
  return data;
}

// equivalente a: SELECT ... FROM alunos WHERE ra = '...'
async function buscarPorRa(ra) {
  const { data, error } = await supabase
    .from('alunos')
    .select(COLUNAS_ALUNO)
    .eq('ra', ra)            // eq = "equals": filtra onde ra é igual ao valor recebido
    .maybeSingle();          // aceita 0 ou 1 resultado, sem lançar erro se não achar nada
                             // (.single() lançaria erro se não encontrasse nenhuma linha)

  if (error) throw error;
  return data;   // objeto encontrado, ou null se o RA não existir
}

// equivalente a: SELECT ... FROM alunos WHERE nome ILIKE '%texto%'
async function buscarPorNome(parteNome) {
  const { data, error } = await supabase
    .from('alunos')
    .select(COLUNAS_ALUNO)
    .ilike('nome', `%${parteNome}%`)   // ilike = sem diferenciar maiúsc./minúsc.
                                       // os % são coringas: "contém" o texto
    .order('nome', { ascending: true });

  if (error) throw error;
  return data;
}

// equivalente a: UPDATE alunos SET nome = '...', curso_id = ... WHERE ra = '...'
async function atualizarAluno(ra, nome, cursoId) {
  const campos = {};
  if (nome) campos.nome = nome;            // só manda o que veio preenchido
  if (cursoId) campos.curso_id = cursoId;  // trocar de curso = trocar o número

  if (!Object.keys(campos).length) {
    throw new Error('Informe nome e/ou curso para atualizar');
  }

  const { data, error } = await supabase
    .from('alunos')
    .update(campos)
    .eq('ra', ra)
    .select(COLUNAS_ALUNO);

  if (error) throw error;
  return data;
}

// equivalente a: DELETE FROM alunos WHERE ra = '...'
async function excluirPorRa(ra) {
  const { data, error } = await supabase
    .from('alunos').delete().eq('ra', ra).select();

  if (error) throw error;
  return data;
}

module.exports = {
  supabase,
  inserirCurso, listarCursos, excluirCurso,
  inserirAluno, listarAlunos, listarAlunosDoCurso,
  buscarPorRa, buscarPorNome, atualizarAluno, excluirPorRa,
};

//  CODIGO ANTIGO

// // =================== CREATE ===================
// // equivalente a: INSERT INTO alunos (nome, ra, curso) VALUES (....)
// async function inserirAluno(nome, ra, curso) {
//     const { data, error } = await supabase
//     .from('alunos')    // escolhe a tabela
//     .insert([{ nome, ra, curso }])    // array = permite inserir várias linhas de uma vez
//     .select()    // pede para o Postgres devolver a linha recém-criada
//     .single();    // espera exatamente 1 objeto de volta (não um array)

//     // TODA chamada ao Supabase retorna { data, error }
//     // se error existir, algo falhou (RLS bloqueou, RA duplicado, rede caiu...)
//     if (error) {
//         const msg = error?.message || String(error);
//         if (error?.code === '23505' || msg.includes('alunos_ra_key')) {
//             const dup = new Error(`RA ${ra} já cadastrado`);
//             dup.statusCode = 409;
//             throw dup;
//         }

//         throw error;
//     }

//     // data = { id, nome, ra, curso, criado_em }
//     return data;
// }

// // =================================== READ (TODOS) ===================================
// // equivalente a: SELECT * FROM alunos ORDER BY id
// async function listarAlunos() {
//     const { data, error } = await supabase
//     .from('alunos')
//     .select('*')    // '*' = todas as colunas
//     .order('id', { ascending: true });    // ordena do menor id para o maior

//     if (error) throw error;
//     return data;    // data = [ { ... }, { ... } ] ou [] (array vazio, nunca null)
// }

// // =========================== READ (um, por RA) ===========================
// // equivalente a: SELECT * FROM alunos WHERE ra = '...'
// async function buscarPorRa(ra) {
//     const { data, error } = await supabase
//     .from('alunos')
//     .select('*')
//     .eq('ra', ra)    // eq = "equals": filtra onde ra é igual ao valor recebido
//     .maybeSingle();    // aceita 0 ou 1 resultado, sem lançar erro se não achar nada
//     // (single() lançaria erro se não encontrasse nenhuma linha)
// if (error) throw error;
// return data; // objeto encontrado, ou null se o RA não existir
// }

// // =================== READ (busca parcial por nome) ===================
// // equivalente a: SELECT * FROM alunos WHERE nome LIKE '%texto%'
// async function buscarPorNome(parteNome) {
//     const { data, error } = await supabase
//     .from('alunos')
//     .select('*')
//     .like('nome', `%${parteNome}%`) // ilike = comparação sem diferenciar maiúsc./minúsc.
//     // os % são coringas: "contém" o texto em qualquer posição
//     .order('nome', { ascending: true });

//     if (error) throw error;
//     return data;
// }

// // =================== UPDATE ===================
// // equivalente a: UPDATE alunos SET curso = '...' WHERE ra = '...'
// async function atualizarCurso(ra, curso) {
//     const { data, error } = await supabase
//     .from('alunos')
//     .update({ curso }) // só altera o campo informado – os demais ficam intactos
//     .eq('ra', ra) // filtro: qual linha alterar
//     .select(); // devolve as linhas que foram efetivamente alteradas

//     if (error) throw error;
//     return data; // array com as linhas atualizadas (pode vir [] se o RA não existir)
// }

// // =================== DELETE ===================
// // equivalente a: DELETE FROM alunos WHERE ra = '...'
// async function excluirPorRa(ra) {
//     const { data, error } = await supabase
//     .from('alunos')
//     .delete()
//     .eq('ra', ra)
//     .select(); // devolve o que foi apagado, útil para confirmar no terminal

//     if (error) throw error;
// return data;
// }
// // ========================== EXPORTS ==========================
// // libera essas funções para outros arquivos poderem importar com:
// // const { listarAlunos } = require('./supabase');

// module.exports = {
//     supabase, // cliente "cru", caso precise de uma query mais avançada
//     inserirAluno,
//     listarAlunos,
//     buscarPorRa,
//     buscarPorNome,
//     atualizarCurso,
//     excluirPorRa,
// };