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

// =================== CREATE ===================
// equivalente a: INSERT INTO alunos (nome, ra, curso) VALUES (....)
async function inserirAluno(nome, ra, curso) {
    const { data, error } = await supabase
    .from('alunos')    // escolhe a tabela
    .insert([{ nome, ra, curso }])    // array = permite inserir várias linhas de uma vez
    .select()    // pede para o Postgres devolver a linha recém-criada
    .single();    // espera exatamente 1 objeto de volta (não um array)

    // TODA chamada ao Supabase retorna { data, error }
    // se error existir, algo falhou (RLS bloqueou, RA duplicado, rede caiu...)
    if (error) {
        const msg = error?.message || String(error);
        if (error?.code === '23505' || msg.includes('alunos_ra_key')) {
            const dup = new Error(`RA ${ra} já cadastrado`);
            dup.statusCode = 409;
            throw dup;
        }

        throw error;
    }

    // data = { id, nome, ra, curso, criado_em }
    return data;
}

// =================================== READ (TODOS) ===================================
// equivalente a: SELECT * FROM alunos ORDER BY id
async function listarAlunos() {
    const { data, error } = await supabase
    .from('alunos')
    .select('*')    // '*' = todas as colunas
    .order('id', { ascending: true });    // ordena do menor id para o maior

    if (error) throw error;
    return data;    // data = [ { ... }, { ... } ] ou [] (array vazio, nunca null)
}

// =========================== READ (um, por RA) ===========================
// equivalente a: SELECT * FROM alunos WHERE ra = '...'
async function buscarPorRa(ra) {
    const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .eq('ra', ra)    // eq = "equals": filtra onde ra é igual ao valor recebido
    .maybeSingle();    // aceita 0 ou 1 resultado, sem lançar erro se não achar nada
    // (single() lançaria erro se não encontrasse nenhuma linha)
if (error) throw error;
return data; // objeto encontrado, ou null se o RA não existir
}

// =================== READ (busca parcial por nome) ===================
// equivalente a: SELECT * FROM alunos WHERE nome LIKE '%texto%'
async function buscarPorNome(parteNome) {
    const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .like('nome', `%${parteNome}%`) // ilike = comparação sem diferenciar maiúsc./minúsc.
    // os % são coringas: "contém" o texto em qualquer posição
    .order('nome', { ascending: true });

    if (error) throw error;
    return data;
}

// =================== UPDATE ===================
// equivalente a: UPDATE alunos SET curso = '...' WHERE ra = '...'
async function atualizarCurso(ra, curso) {
    const { data, error } = await supabase
    .from('alunos')
    .update({ curso }) // só altera o campo informado – os demais ficam intactos
    .eq('ra', ra) // filtro: qual linha alterar
    .select(); // devolve as linhas que foram efetivamente alteradas

    if (error) throw error;
    return data; // array com as linhas atualizadas (pode vir [] se o RA não existir)
}

// =================== DELETE ===================
// equivalente a: DELETE FROM alunos WHERE ra = '...'
async function excluirPorRa(ra) {
    const { data, error } = await supabase
    .from('alunos')
    .delete()
    .eq('ra', ra)
    .select(); // devolve o que foi apagado, útil para confirmar no terminal

    if (error) throw error;
return data;
}
// ========================== EXPORTS ==========================
// libera essas funções para outros arquivos poderem importar com:
// const { listarAlunos } = require('./supabase');

module.exports = {
    supabase, // cliente "cru", caso precise de uma query mais avançada
    inserirAluno,
    listarAlunos,
    buscarPorRa,
    buscarPorNome,
    atualizarCurso,
    excluirPorRa,
};