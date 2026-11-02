const {
    inserirCurso, listarCursos,
    inserirAluno, listarAlunos, listarAlunosDoCurso,
    buscarPorRa, buscarPorNome, atualizarAluno, excluirPorRa,
} = require('./supabase');
// main() é async porque as operações de banco retornam Promises.
async function main() {
    try {
        // 1) o lado "1": cria os cursos (se já existirem, segue em frente)
        for (const nome of ['ADS', 'Gestão Comercial']) {
            try {
                await inserirCurso(nome);
            } catch (e) {
                console.log(`Curso "${nome}" não inserido (talvez já exista)`);
            }
        }
        const cursos = await listarCursos();
        console.log('Cursos:', cursos);
        // pega os ids pelo nome — o aluno guarda o ID do curso, não o nome
        const ads = cursos.find((c) => c.nome === 'ADS');
        const gestao = cursos.find((c) => c.nome === 'Gestão Comercial');
        // 2) o lado "N": cria um aluno ligado ao curso ADS
        try {
            const novo = await inserirAluno('Maria Silva', '2026001', ads.id);
            console.log('Inserido com sucesso:', novo);
        } catch (e) {
            console.log('Não inseriu (talvez RA já exista):', e.message || e);
        }
        const todos = await listarAlunos();
        console.log(`Total: ${todos.length}`, todos);
        // troca o aluno de curso: só muda o curso_id
        await atualizarAluno('2026001', 'Maria Silva', gestao.id);
        // 1:N na prática: todos os alunos de UM curso
        const daGestao = await listarAlunosDoCurso(gestao.id);
        console.log('Alunos de Gestão Comercial:', daGestao);
        // DELETE fica comentado até você ter certeza do que está apagando
        // const apagados = await excluirPorRa('2026001');
    } catch (err) {
        console.error('ERRO GERAL:', err.message || err);
    }
}
main();   // dispara a função principal — sem isso, nada roda