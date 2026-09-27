const {
    inserirAluno, listarAlunos, buscarPorRa,
    buscarPorNome, atualizarCurso, excluirPorRa,
} = require('./supabase');

// main() é async porque TODAS as funções do banco são assíncronas
// (cada await dentro dela precisa de uma função async por fora)
async function main() {
    try {
    const raDemo = '2026001';

    // remove qualquer linha antiga com esse RA para que a demo
    // possa mostrar o INSERT inicial com curso ADS
    await excluirPorRa(raDemo);

    try {
        const novo = await inserirAluno('Maria Silva', raDemo, 'ADS');
        console.log('Inserido com sucesso:', novo);
    } catch (e) {
        console.log('Não inseriu (talvez RA já exista):', e.message || e);
    }

    const todos = await listarAlunos();
    console.log(`Total: ${todos.length}`, todos);

    const um = await buscarPorRa(raDemo);
    console.log(um ?? 'Não encontrado');

    const atualizados = await atualizarCurso(raDemo, 'Gestão Comercial');
    console.log(atualizados);

    const filtrados = await buscarPorNome('Maria');
    console.log(filtrados);

    // DELETE fica comentado até você ter certeza do que está apagando
    // const apagados = await excluirPorRa(raDemo);

    } catch (err) {
        // captura qualquer erro geral: rede, chave inválida, RLS bloqueada...
        console.error('ERRO GERAL:', err.message || err);
    }
} 

main(); // dispara a função principal - sem isso, nada roda