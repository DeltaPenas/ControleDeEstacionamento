
import { RegistroRepository } from "../repository/RegistroRepository";
import { AppError } from "../errors/AppError";

const registroRepository = new RegistroRepository();
const FUSO_MS = 3 * 60 * 60 * 1000; // fuso horario especifico de alagoas

export class RelatorioService {
    // Método para calcular o faturamento mensal
    async faturamentoMensal(anoParam?: number, mesParam?: number) {
        const agora = new Date(Date.now() - FUSO_MS);
        const ano = anoParam ?? agora.getUTCFullYear();
        const mes = mesParam ?? agora.getUTCMonth() + 1;
        // valida parametros de ano e mes
        if (!Number.isInteger(ano) || ano < 2000 || ano > 2100 ||
            !Number.isInteger(mes) || mes < 1 || mes > 12) {
            throw new AppError("ano e mes inválidos. Exemplo: ?ano=2026&mes=11", 400);
        }

       
        const inicio = new Date(Date.UTC(ano, mes - 1, 1) + FUSO_MS);
        const fim = new Date(Date.UTC(ano, mes, 1) + FUSO_MS);

        const registros = await registroRepository.listarEncerradosNoPeriodo(inicio, fim);
        

        // Calcula o total faturado, quantidade de saídas e registros sem valor
        let total = 0;
        let comValor = 0;
        let semValor = 0;
        const dias = new Map<string, { total: number; quantidade: number }>();

        for (const r of registros) {
            if (!r.saida) continue;
            if (r.valor === null) { semValor++; continue; }

            const valor = Number(r.valor);
            total += valor;
            comValor++;

            const dia = new Date(r.saida.getTime() - FUSO_MS).toISOString().slice(0, 10);
            const acumulado = dias.get(dia) ?? { total: 0, quantidade: 0 };
            acumulado.total += valor;
            acumulado.quantidade++;
            dias.set(dia, acumulado);
        }
        // Ordena os dias
        return {
            ano,
            mes,
            totalFaturado: Math.round(total * 100) / 100,
            quantidadeSaidas: comValor,
            ticketMedio: comValor > 0 ? Math.round((total / comValor) * 100) / 100 : 0,
            registrosSemValor: semValor,
            porDia: [...dias.entries()].map(([dia, d]) => ({ dia, ...d }))
        };
    }
    //gera o arquivo excel
    async gerarCsvFaturamento(ano?: number, mes?: number) {
    const r = await this.faturamentoMensal(ano, mes);
    const num = (n: number) => n.toFixed(2).replace(".", ",");
    const dia = (d: string) => d.split("-").reverse().join("/");
    const mm = String(r.mes).padStart(2, "0");

    const linhas: string[][] = [
        ["Faturamento mensal", `${mm}/${r.ano}`],
        ["Total faturado (R$)", num(r.totalFaturado)],
        ["Quantidade de saídas", String(r.quantidadeSaidas)],
        ["Ticket médio (R$)", num(r.ticketMedio)],
        [],
        ["Dia", "Saídas", "Faturamento (R$)"],
        ...r.porDia.map(d => [dia(d.dia), String(d.quantidade), num(d.total)])
    ];

    return {
        nomeArquivo: `faturamento-${r.ano}-${mm}.csv`,
        conteudo: "\uFEFF" + linhas.map(l => l.join(";")).join("\r\n")
    };
}
}