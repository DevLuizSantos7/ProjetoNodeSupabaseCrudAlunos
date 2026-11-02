// document = a página inteira; getElementById = “encontre pelo id”
const tabela = document.getElementById('tabela-alunos');
const tabelaCursos = document.getElementById('tabela-cursos');   // novo
const msg = document.getElementById('msg');
const modal = document.getElementById('modal');
const modalTitulo = document.getElementById('modal-titulo');
const form = document.getElementById('form-aluno');
const inputNome = document.getElementById('nome');
const inputRa = document.getElementById('ra');
const selectCurso = document.getElementById('curso');            // agora é um select
const filtroCurso = document.getElementById('filtro-curso');     // novo
const formCurso = document.getElementById('form-curso');         // novo
const inputNovoCurso = document.getElementById('novo-curso');    // novo
const formBusca = document.getElementById('form-busca');
const buscaAluno = document.getElementById('busca-aluno');
const sentinelaAlunos = document.getElementById('sentinela-alunos');

const ALUNOS_POR_PAGINA = 4;
let alunosInicio = 0;
let alunosTotal = 0;
let alunosCarregando = false;
let alunosPedido = 0;

// variáveis de estado: memórias do que estamos fazendo agora
let modo = 'criar';       // 'criar' ou 'editar'
let raEditando = '';     // RA do aluno aberto no modal de edição

function mostrarMsg(texto, tipo = '') {
  msg.hidden = false;              // tira o hidden → aparece na tela
  msg.textContent = texto;         // coloca o texto (seguro contra HTML)
  msg.className = 'msg' + (tipo ? ` ${tipo}` : '');
}

async function listarCursos() {
  const resposta = await fetch('/cursos');   // GET /cursos
  const cursos = await resposta.json();
  // cursos = [ { id: 1, nome: 'ADS', total_alunos: 2 }, ... ]
  if (!resposta.ok) {
    mostrarMsg(cursos.erro || 'Erro ao listar cursos', 'erro');
    return;
  }
  montarTabelaCursos(cursos);   // desenha a tabela de cursos
  preencherSelects(cursos);     // atualiza os dois <select>
}

function montarTabelaCursos(cursos) {
  if (!cursos.length) {
    tabelaCursos.innerHTML =
      '<tr><td colspan="3" class="vazio">Nenhum curso cadastrado ainda.</td></tr>';
    return;
  }
  tabelaCursos.innerHTML = '';             // apaga as linhas antigas
  for (const curso of cursos) {
    const tr = document.createElement('tr');
    const tdNome = document.createElement('td');
    tdNome.textContent = curso.nome;
    const tdTotal = document.createElement('td');
    tdTotal.textContent = curso.total_alunos;   // o "N" de cada curso
    const btnVer = document.createElement('button');
    btnVer.textContent = 'Ver alunos';
    btnVer.onclick = () => {
      filtroCurso.value = curso.id;   // escolhe o curso no filtro
      listarAlunos();                 // e lista só os alunos dele
    };
    const btnExcluir = document.createElement('button');
    btnExcluir.textContent = 'Excluir';
    btnExcluir.onclick = () => excluirCurso(curso.id, curso.nome);
    const tdAcoes = document.createElement('td');
    const acoes = document.createElement('div');
    acoes.className = 'tabela-acoes';
    btnVer.className = 'btn btn-secundario btn-pequeno';
    btnExcluir.className = 'btn btn-perigo btn-pequeno';
    acoes.append(btnVer, btnExcluir);
    tdAcoes.appendChild(acoes);
    tr.append(tdNome, tdTotal, tdAcoes);
    tabelaCursos.appendChild(tr);
  }
}

function preencherSelects(cursos) {
  // guarda o que estava escolhido antes de redesenhar
  const filtroAtual = filtroCurso.value;
  const cursoAtual = selectCurso.value;
  // recomeça cada select só com a primeira opção
  filtroCurso.innerHTML = '<option value="">Todos os cursos</option>';
  selectCurso.innerHTML = '<option value="">Selecione um curso</option>';
  for (const curso of cursos) {
    // new Option(texto que aparece, valor enviado)
    filtroCurso.appendChild(new Option(curso.nome, curso.id));
    selectCurso.appendChild(new Option(curso.nome, curso.id));
  }
  // devolve a escolha anterior
  filtroCurso.value = filtroAtual;
  selectCurso.value = cursoAtual;
  // se o curso escolhido foi excluído, volta para a primeira opção
  if (filtroCurso.selectedIndex === -1) filtroCurso.value = '';
  if (selectCurso.selectedIndex === -1) selectCurso.value = '';
}

async function adicionarCurso(evento) {
  evento.preventDefault();               // form-curso não recarrega a página
  const nome = inputNovoCurso.value.trim();
  const resposta = await fetch('/cursos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),      // { "nome": "ADS" }
  });
  const dados = await resposta.json();
  if (!resposta.ok) {
    mostrarMsg(dados.erro || 'Erro ao cadastrar curso', 'erro');
    return;
  }
  inputNovoCurso.value = '';             // limpa o campo
  mostrarMsg(`Curso "${dados.nome}" cadastrado!`, 'ok');
  listarCursos();                        // o curso novo aparece na tabela e nos selects
}

async function excluirCurso(id, nome) {
  if (!confirm(`Excluir o curso "${nome}"?`)) return;
  const resposta = await fetch('/cursos/' + id, { method: 'DELETE' });
  const dados = await resposta.json();
  if (!resposta.ok) {
    // curso com alunos → a API respondeu 409 com a mensagem pronta
    mostrarMsg(dados.erro || 'Erro ao excluir curso', 'erro');
    return;
  }
  mostrarMsg('Curso excluído.', 'ok');
  atualizarTudo();
}

function abrirModalCriar() {
  // só a opção "Selecione um curso" → ainda não há cursos
  if (selectCurso.options.length <= 1) {
    mostrarMsg('Cadastre um curso antes de incluir alunos.', 'erro');
    return;
  }
  modo = 'criar';
  raEditando = '';
  modalTitulo.textContent = 'Novo aluno';
  form.reset();                         // limpa todos os campos do form
  selectCurso.value = filtroCurso.value; // já sugere o curso do filtro
  inputRa.disabled = false;             // RA pode ser digitado
  modal.hidden = false;                 // mostra o modal
  inputNome.focus();                    // cursor no campo Nome
}

function abrirModalEditar(aluno) {
  modo = 'editar';
  raEditando = aluno.ra;               // guardamos o RA para o PUT
  modalTitulo.textContent = 'Editar aluno';
  inputNome.value = aluno.nome || '';
  inputRa.value = aluno.ra || '';
  selectCurso.value = aluno.curso_id;   // seleciona o curso atual pelo id
  inputRa.disabled = true;             // RA bloqueado (não muda a chave)
  modal.hidden = false;
  inputNome.focus();
}
function fecharModal() {
  modal.hidden = true;
  form.reset();
  inputRa.disabled = false;            // libera RA para o próximo cadastro
}

function pedirMaisSeVisivel() {
  if (alunosCarregando || alunosInicio >= alunosTotal) return;
  if (sentinelaAlunos.getBoundingClientRect().top <= window.innerHeight + 160) {
    listarAlunos(true);
  }
}

async function listarAlunos(acrescentar = false) {
  if (acrescentar && (alunosCarregando || alunosInicio >= alunosTotal)) return;

  const pedido = acrescentar ? alunosPedido : ++alunosPedido;
  const inicio = acrescentar ? alunosInicio : 0;
  const cursoId = filtroCurso.value;   // '' = "Todos os cursos"
  const url = cursoId ? `/cursos/${cursoId}/alunos` : '/alunos';
  const parametros = new URLSearchParams({
    inicio: String(inicio),
    limite: String(ALUNOS_POR_PAGINA),
  });
  const nome = buscaAluno.value.trim();
  if (nome) parametros.set('nome', nome);

  alunosCarregando = true;
  try {
    const resposta = await fetch(`${url}?${parametros}`);
    const dados = await resposta.json();
    if (pedido !== alunosPedido) return;
    if (!resposta.ok) throw new Error(dados.erro || 'Erro ao buscar alunos');

    const alunos = dados.alunos || [];
    alunosTotal = dados.total || 0;
    if (!acrescentar) tabela.innerHTML = '';

    if (!alunos.length && !acrescentar) {
      tabela.innerHTML = '<tr><td colspan="4" class="vazio">Nenhum aluno encontrado.</td></tr>';
    } else {
      for (const aluno of alunos) {
        const tr = document.createElement('tr');
        const tdNome = document.createElement('td');
        tdNome.textContent = aluno.nome;
        const tdRa = document.createElement('td');
        tdRa.textContent = aluno.ra;
        const tdCurso = document.createElement('td');
        tdCurso.textContent = aluno.curso ? aluno.curso.nome : '—';
        const tdAcoes = document.createElement('td');
        const acoes = document.createElement('div');
        acoes.className = 'tabela-acoes';
        const btnEditar = document.createElement('button');
        btnEditar.className = 'btn btn-secundario btn-pequeno';
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => abrirModalEditar(aluno);
        const btnExcluir = document.createElement('button');
        btnExcluir.className = 'btn btn-perigo btn-pequeno';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.onclick = () => excluirAluno(aluno.ra, aluno.nome);
        acoes.append(btnEditar, btnExcluir);
        tdAcoes.appendChild(acoes);
        tr.append(tdNome, tdRa, tdCurso, tdAcoes);
        tabela.appendChild(tr);
      }
    }
    alunosInicio = inicio + alunos.length;
    alunosInicio = inicio + alunos.length;
    msg.hidden = true;
  } catch (erro) {
    if (pedido !== alunosPedido) return;
    mostrarMsg(erro.message, 'erro');
    if (!acrescentar) {
      tabela.innerHTML = '<tr><td colspan="4" class="vazio">Não foi possível carregar os alunos.</td></tr>';
    }
  } finally {
    if (pedido === alunosPedido) {
      alunosCarregando = false;
      requestAnimationFrame(pedirMaisSeVisivel);
    }
  }
}

async function salvarAluno(evento) {
  evento.preventDefault();   // evento = objeto do submit; cancela o reload
  const nome = inputNome.value.trim();
  const ra = inputRa.value.trim();
  const curso_id = Number(selectCurso.value);   // "1" (texto) → 1 (número)
  if (modo === 'criar') {
    const resposta = await fetch('/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, ra, curso_id }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMsg(dados.erro || 'Erro ao cadastrar', 'erro');
      return;
    }
    mostrarMsg('Aluno cadastrado com sucesso!', 'ok');
  }
  else {
    const resposta = await fetch('/alunos/' + encodeURIComponent(raEditando), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, curso_id }),   // trocar de curso = novo curso_id
    });
    const dados = await resposta.json();
    if (!resposta.ok) {
      mostrarMsg(dados.erro || 'Erro ao atualizar aluno', 'erro');
      return;
    }
    if (!dados.length) {
      mostrarMsg('RA não encontrado', 'erro');
      return;
    }
    mostrarMsg('Aluno atualizado com sucesso!', 'ok');
  }
  fecharModal();
  atualizarTudo();   // a contagem de alunos por curso também muda
}

async function excluirAluno(ra, nome) {
  if (!confirm(`Excluir o aluno "${nome}" (RA ${ra})?`)) return;
  const resposta = await fetch('/alunos/' + encodeURIComponent(ra), {
    method: 'DELETE',
  });
  const dados = await resposta.json();
  if (!resposta.ok) {
    mostrarMsg(dados.erro || 'Erro ao excluir', 'erro');
    return;
  }
  mostrarMsg('Aluno excluído.', 'ok');
  atualizarTudo();
}
async function atualizarTudo() {
  await listarCursos();    // 1º os cursos: preenche o filtro e o select
  await listarAlunos();    // 2º os alunos: já usa o filtro preenchido
}
document.getElementById('btn-novo').addEventListener('click', abrirModalCriar);
document.getElementById('btn-atualizar').addEventListener('click', atualizarTudo);
document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
document.getElementById('modal-fundo').addEventListener('click', fecharModal);
form.addEventListener('submit', salvarAluno);
formCurso.addEventListener('submit', adicionarCurso);   // novo
formBusca.addEventListener('submit', (evento) => {
  evento.preventDefault();
  listarAlunos();
});
filtroCurso.addEventListener('change', () => listarAlunos());
window.addEventListener('scroll', pedirMaisSeVisivel, { passive: true });
window.addEventListener('resize', pedirMaisSeVisivel);
atualizarTudo();   // roda 1 vez ao abrir a página