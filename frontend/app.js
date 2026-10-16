// document = a página inteira; getElementById = "encontre pelo id"
const tabela = document.getElementById('tabela-alunos');
const msg = document.getElementById('msg');
const modal = document.getElementById('modal');
const modalTitulo = document.getElementById('modal-titulo');
const form = document.getElementById('form-aluno');
const inputNome = document.getElementById('nome');
const inputRa = document.getElementById('ra');
const inputCurso = document.getElementById('curso');

// variáveis de estado: memórias do que estamos fazendo agora
let modo = 'criar';       // 'criar' ou 'editar'
let raEditando = '';      // RA do aluno aberto no modal de edição

function mostrarMsg(texto, tipo = '') {
  msg.hidden = false;        // tira o hidden → aparece na tela
  msg.textContent = texto;   // coloca o texto (seguro contra HTML)
  msg.className = 'msg' + (tipo ? ` ${tipo}` : '');
}

function abrirModalCriar() {
  modo = 'criar';
  raEditando = '';
  modalTitulo.textContent = 'Novo aluno';
  form.reset();                   // limpa todos os inputs do form
  inputRa.disabled = false;       // disabled=false → pode digitar o RA
  modal.hidden = false;           // mostra o modal
  inputNome.focus();              // coloca o cursor no campo Nome
}

function abrirModalEditar(aluno) {
  modo = 'editar';
  raEditando = aluno.ra;          // guardamos o RA para o PUT
  modalTitulo.textContent = 'Editar aluno';
  inputNome.value = aluno.nome || '';
  inputRa.value = aluno.ra || '';
  inputCurso.value = aluno.curso || '';
  inputRa.disabled = true;        // RA bloqueado (não muda a chave)
  modal.hidden = false;
  inputNome.focus();
}

function fecharModal() {
  modal.hidden = true;
  form.reset();
  inputRa.disabled = false;    // libera RA para o próximo cadastro
}

async function listarAlunos() {
  const resposta = await fetch('/alunos');  // GET
  const alunos = await resposta.json();     // vira array [{...}, {...}]

  if (!resposta.ok) {
    mostrarMsg('Erro ao listar alunos', 'erro');
    tabela.innerHTML = '...mensagem de erro...';
    return;  // return = para a função aqui
  }

  if (!alunos.length) {
    tabela.innerHTML = '...nenhum aluno...';
    mostrarMsg('Nenhum aluno cadastrado.', '');
    return;
  }

    tabela.innerHTML = '';                  // apaga linhas antigas

  for (const aluno of alunos) {           // repete para cada aluno
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = aluno.nome;

    const tdRa = document.createElement('td');
    tdRa.textContent = aluno.ra;

    const tdCurso = document.createElement('td');
    tdCurso.textContent = aluno.curso;

    const btnEditar = document.createElement('button');
    btnEditar.type = 'button';
    btnEditar.textContent = 'Editar';
    btnEditar.className = 'btn btn-secundario btn-pequeno';
    btnEditar.onclick = () => abrirModalEditar(aluno);

    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.className = 'btn btn-perigo btn-pequeno';
    btnExcluir.onclick = () => excluirAluno(aluno.ra, aluno.nome);

    const tdAcoes = document.createElement('td');
    const divAcoes = document.createElement('div');
    divAcoes.className = 'tabela-acoes';
    divAcoes.appendChild(btnEditar);
    divAcoes.appendChild(btnExcluir);
    tdAcoes.appendChild(divAcoes);

    tr.appendChild(tdNome);
    tr.appendChild(tdRa);
    tr.appendChild(tdCurso);
    tr.appendChild(tdAcoes);
    tabela.appendChild(tr);               // encaixa a linha na tabela
  }
}

async function salvarAluno(evento) {
  evento.preventDefault();  // evento = objeto do submit; cancela reload

  const nome = inputNome.value.trim();  // .value = o que o usuário digitou
  const ra = inputRa.value.trim();      // .trim() = tira espaços das pontas
  const curso = inputCurso.value.trim();

  if (modo === 'criar') {
    const resposta = await fetch('/alunos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, ra, curso }),
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
      body: JSON.stringify({ nome, curso }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) {return; }
    if (!dados.length) {
      mostrarMsg('RA não encontrado', 'erro');
      return;
    }
    mostrarMsg('Aluno atualizado com sucesso!', 'ok');
  }
  fecharModal();
  listarAlunos();  // atualiza a tabela com o que está no banco
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
  listarAlunos();
}

document.getElementById('btn-novo')
  .addEventListener('click', abrirModalCriar);
// evento click → chama abrirModalCriar

document.getElementById('btn-atualizar')
  .addEventListener('click', listarAlunos);

document.getElementById('btn-cancelar')
  .addEventListener('click', fecharModal);

document.getElementById('modal-fundo')
  .addEventListener('click', fecharModal);

form.addEventListener('submit',       salvarAluno);
// evento submit (Salvar ou Enter) → chama salvarAluno(evento)

listarAlunos();  // roda 1 vez ao carregar a página