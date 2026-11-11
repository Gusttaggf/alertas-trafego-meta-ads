// Datas e horários sempre no fuso de São Paulo (sem horário de verão desde 2019: UTC-3).
// Funções puras, testadas em tests/tempo.test.ts.

const FUSO = 'America/Sao_Paulo';
const OFFSET = '-03:00';
/** Um verificação que roda logo depois do horário (ex.: 07:00 às 07:10) ainda entra nele. */
const TOLERANCIA_MIN = 20;

export function diaSP(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function minutosSP(d: Date = new Date()): number {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  return Number(p.find((x) => x.type === 'hour')!.value) * 60 + Number(p.find((x) => x.type === 'minute')!.value);
}

export const paraMinutos = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return diaSP(d);
}

export function instante(dia: string, horario: string): Date {
  return new Date(`${dia}T${horario.slice(0, 5)}:00${OFFSET}`);
}

/** Em qual horário (07h, 12h, 16h...) aparece o que foi encontrado agora. Depois do último, vai para o primeiro do dia seguinte. */
export function proximoHorario(horarios: string[], agora: Date = new Date()) {
  const lista = [...horarios].map((h) => h.slice(0, 5)).sort();
  const dia = diaSP(agora), min = minutosSP(agora);
  const h = lista.find((x) => paraMinutos(x) + TOLERANCIA_MIN >= min);
  const r = h ? { dia, horario: h } : { dia: somarDias(dia, 1), horario: lista[0] };
  return { ...r, visivelEm: instante(r.dia, r.horario) };
}

/** Horário em que estamos agora (o último que já passou; antes do primeiro, o primeiro). Usado no "Verificar agora". */
export function horarioAtual(horarios: string[], agora: Date = new Date()) {
  const lista = [...horarios].map((h) => h.slice(0, 5)).sort();
  const dia = diaSP(agora), min = minutosSP(agora);
  const passados = lista.filter((x) => paraMinutos(x) <= min);
  const horario = passados.length ? passados[passados.length - 1] : lista[0];
  return { dia, horario, visivelEm: agora };
}

/** Segunda-feira da semana do dia. */
export function inicioDaSemana(dia: string): string {
  const d = new Date(`${dia}T12:00:00${OFFSET}`);
  const dow = (d.getUTCDay() + 6) % 7;
  return somarDias(dia, -dow);
}

export function diaDaSemana(dia: string): number {
  return new Date(`${dia}T12:00:00${OFFSET}`).getUTCDay();
}

/** "28/10" */
export const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
