
import type { Request, Response } from "express";
import { RelatorioService } from "../service/RelatorioService";
import { responderErro } from "../errors/ResponderError";

const relatorioService = new RelatorioService();

export class RelatorioController {
    //end point para obter o faturamento mensal
    async faturamentoMensal(req: Request, res: Response) {
        try {
        
            const ano = req.query.ano !== undefined ? Number(req.query.ano) : undefined;
            const mes = req.query.mes !== undefined ? Number(req.query.mes) : undefined;

            const relatorio = await relatorioService.faturamentoMensal(ano, mes);
            return res.status(200).json(relatorio);
        } catch (error) {
            return responderErro(res, error);
        }
    }
    //end point para baixar o arquivo excel gerado
    async baixarFaturamento(req: Request, res: Response) {
    try {
        const ano = req.query.ano !== undefined ? Number(req.query.ano) : undefined;
        const mes = req.query.mes !== undefined ? Number(req.query.mes) : undefined;

        const { nomeArquivo, conteudo } = await relatorioService.gerarCsvFaturamento(ano, mes);

        res.attachment(nomeArquivo);
        return res.status(200).send(conteudo);
    } catch (error) {
        return responderErro(res, error);
    }
}
}