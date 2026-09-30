const form = document.querySelector('#interest-form');
const submit = document.querySelector('#interest-submit');
const status = document.querySelector('#interest-status');

const ENDPOINT = 'https://www.wandora.com.br/api/wandora/product-interest';

const setStatus = (kind, message) => {
  if (!status) return;
  status.dataset.kind = kind;
  status.textContent = message;
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!(form instanceof HTMLFormElement) || !(submit instanceof HTMLButtonElement)) return;

  if (!form.reportValidity()) return;

  const data = new FormData(form);
  submit.disabled = true;
  submit.textContent = 'Enviando…';
  setStatus('loading', 'Registrando seu interesse com segurança…');

  const payload = {
    product: 'vigia',
    source: 'vigia-landing',
    name: String(data.get('name') ?? '').trim(),
    email: String(data.get('email') ?? '').trim(),
    whatsapp: String(data.get('whatsapp') ?? '').trim(),
    company: String(data.get('company') ?? '').trim(),
    website: String(data.get('website') ?? '').trim(),
    useCase: String(data.get('useCase') ?? ''),
    agentsCount: String(data.get('agentsCount') ?? '') || undefined,
    stack: String(data.get('stack') ?? '').trim(),
    successDefinition: String(data.get('successDefinition') ?? '').trim(),
    message: String(data.get('message') ?? '').trim(),
    consent: data.get('consent') === 'on',
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body.error || 'Não foi possível registrar seu interesse.');
    }

    form.reset();
    setStatus('success', body.message || 'Recebemos seu interesse. A equipe Wandora vai entrar em contato.');
    submit.textContent = 'Interesse enviado ✓';
  } catch (error) {
    setStatus('error', error instanceof Error ? error.message : 'Falha de conexão. Tente novamente.');
    submit.disabled = false;
    submit.textContent = 'Solicitar demonstração →';
  }
});
