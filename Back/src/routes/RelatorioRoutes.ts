
import { Router } from "express";
import { RelatorioController } from "../controller/RelatorioController";

const router = Router();
const relatorioController = new RelatorioController();

router.get("/faturamento", (req, res) => relatorioController.faturamentoMensal(req, res));
router.get("/faturamento/download", (req, res) => relatorioController.baixarFaturamento(req, res));

export default router;