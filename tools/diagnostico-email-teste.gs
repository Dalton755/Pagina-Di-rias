/**
 * Diagnóstico controlado do Google Forms de teste do Seletor de Rotas.
 * Vincule este script SOMENTE ao formulário "Solicitação de rotas Teste"
 * abrindo o editor do formulário > Extensões > Apps Script.
 *
 * Por padrão, nenhuma resposta é enviada.
 * Para autorizar UM envio de teste, altere PERMITIR_UM_ENVIO_TESTE para true
 * e execute "enviarUmaRespostaDeTeste" explicitamente.
 *
 * A caixa de confirmação de e-mail VERIFICADO do Google Forms NÃO é um Item.
 * Ela não pode ser "marcada" via FormApp.createResponse().
 * Depois do teste, confira no Google Forms se o e-mail foi coletado:
 * submissões programáticas podem não registrar o e-mail verificado.
 */
const TESTE_FORMS_PUBLIC_ID = '1FAIpQLSeIB-X6-5bB1T-gnKvO-dg5eI-pRVFAUH3DJBpyQaFYD884ug';
const PERMITIR_UM_ENVIO_TESTE = false;
const ROTA_TECNICA = 'X-99';
const ID_TECNICO = '000000';
const TELEFONE_TECNICO = '11000000000';

function formularioTesteSeguro_() {
  const form = FormApp.getActiveForm();
  if (!form) {
    throw new Error('Abra o Apps Script a partir do editor do Google Forms de TESTE.');
  }
  const url = form.getPublishedUrl() || '';
  if (!url.includes(TESTE_FORMS_PUBLIC_ID)) {
    throw new Error('BLOQUEADO: o script está vinculado a outro formulário. Não enviarei respostas.');
  }
  return form;
}

function mapearCampos_() {
  const form = formularioTesteSeguro_();
  const items = form.getItems(FormApp.ItemType.TEXT);
  const asText = (part) => {
    const matches = items.filter(item => item.getTitle().toUpperCase().includes(part));
    if (matches.length !== 1) throw new Error('Campo ausente ou duplicado: ' + part);
    return matches[0].asTextItem();
  };
  return {
    form,
    driverId: asText('SEU ID'),
    route: asText('LETRA DA ROTA'),
    phone: asText('TELEFONE')
  };
}

/** Somente leitura: execute primeiro. Não altera o formulário. */
function diagnosticarFormularioTeste() {
  const {form,driverId,route,phone} = mapearCampos_();
  const diagnostico = {
    formulario: form.getTitle(),
    recebeRespostas: form.isAcceptingResponses(),
    coletaEmails: form.collectsEmail(),
    perguntasEncontradas: [driverId.getTitle(),route.getTitle(),phone.getTitle()],
    aviso: 'A confirmação de e-mail verificado pertence ao Google e não é um campo que FormApp possa selecionar.'
  };
  console.log(JSON.stringify(diagnostico,null,2));
  return diagnostico;
}

/**
 * Envia UMA resposta fictícia no formulário de teste somente após autorização
 * explícita pela mudança de PERMITIR_UM_ENVIO_TESTE = true.
 *
 * Este experimento responde: "Uma submissão do Apps Script registra o
 * e-mail VERIFICADO da conta Google, como a caixa da interface?"
 */
function enviarUmaRespostaDeTeste() {
  if (PERMITIR_UM_ENVIO_TESTE !== true) {
    throw new Error('Envio desabilitado. Primeiro execute diagnosticarFormularioTeste. Para testar, altere PERMITIR_UM_ENVIO_TESTE para true.');
  }
  const propertyKey = 'RESPOSTA_TESTE_UNICA';
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(propertyKey)) {
    throw new Error('Já foi realizada uma tentativa deste teste. Bloqueado para evitar respostas duplicadas.');
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Há outro teste em andamento.');
  try {
    if (props.getProperty(propertyKey)) throw new Error('Já existe uma tentativa registrada.');
    const {form,driverId,route,phone} = mapearCampos_();
    if (!form.isAcceptingResponses()) throw new Error('O formulário de teste não está recebendo respostas.');
    // Reserva a tentativa ANTES do envio para impedir duplicações mesmo se a rede falhar.
    props.setProperty(propertyKey,new Date().toISOString());
    const response = form.createResponse()
      .withItemResponse(driverId.createResponse(ID_TECNICO))
      .withItemResponse(route.createResponse(ROTA_TECNICA))
      .withItemResponse(phone.createResponse(TELEFONE_TECNICO));
    const submitted=response.submit();
    const report = {
      teste: 'enviado_uma_vez',
      rota: ROTA_TECNICA,
      responseId: submitted.getId(),
      emailVerificadoRegistrado: Boolean(submitted.getRespondentEmail()),
      explicacao: 'Confirme manualmente a coluna de e-mail em Respostas no Google Forms.'
    };
    console.log(JSON.stringify(report,null,2));
    return report;
  } finally {
    lock.releaseLock();
  }
}
