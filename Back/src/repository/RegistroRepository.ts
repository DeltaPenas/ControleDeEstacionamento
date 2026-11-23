import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { ConsultaHistorico } from "../service/consulta-historico";



const prisma = new PrismaClient();



    function calcularValor(entrada: Date, saida: Date): number{

        const diferencaMs = saida.getTime() - entrada.getTime();

        if(diferencaMs < 0){
            throw new Error("Data de saida menor que a de entrada");
        }
        
        const horaEmMs = 1000 * 60 * 60;

        const horas = Math.ceil(diferencaMs/horaEmMs);

        return horas * 7.50;
    }

export class RegistroRepository{
    async listarHistorico(consulta: ConsultaHistorico) {
        const where: Prisma.RegistroEstacionamentosWhereInput = {
            ...(consulta.placa ? { carro: { placa: { contains: consulta.placa, mode: 'insensitive' } } } : {}),
            ...(consulta.dataInicio || consulta.dataFim ? {
                entrada: {
                    ...(consulta.dataInicio ? { gte: consulta.dataInicio } : {}),
                    ...(consulta.dataFim ? { lt: consulta.dataFim } : {}),
                },
            } : {}),
            ...(consulta.situacao === 'abertos' ? { saida: null } : {}),
            ...(consulta.situacao === 'encerrados' ? { saida: { not: null } } : {}),
        };
        // Itens e total usam o mesmo snapshot, mesmo se houver movimentações durante a consulta.
        const [items, total] = await prisma.$transaction([
            prisma.registroEstacionamentos.findMany({
                where,
                include: { carro: true, vaga: true },
                orderBy: [{ entrada: 'desc' }, { id: 'desc' }],
                skip: (consulta.page - 1) * consulta.limit,
                take: consulta.limit,
            }),
            prisma.registroEstacionamentos.count({ where }),
        ], { isolationLevel: 'RepeatableRead' });
        return { items, total, page: consulta.page, limit: consulta.limit, totalPages: Math.ceil(total / consulta.limit) };
    }

    async buscarAtivoPorVaga(vagaId:number){
        return prisma.registroEstacionamentos.findFirst({
            where:{
                vagaId:vagaId,
                saida : null
            }
        })
    }

    async buscarAtivoPorCarro(carroId:number){
        return prisma.registroEstacionamentos.findFirst({
            where:{
                carroId:carroId,
                saida : null
            }
        })
    }

    async registrarEntrada(carroId: number, vagaId: number){
    return prisma.registroEstacionamentos.create({
        data: {
            carroId: carroId,
            vagaId: vagaId,
            entrada: new Date()
        },
        include: { 
            carro: true, 
            vaga: true 
        } 
    });
}
      async buscarAtivoPorPlaca(placa: string) {
    return prisma.registroEstacionamentos.findFirst({
        where: {
            carro: {             
                placa: placa     
            },
            saida: null          
        }
    });
}

    async registrarSaida(id:number){
            const registro = await prisma.registroEstacionamentos.findUnique({where: {id}})
            if (!registro) {
                throw new Error("Registro não encontrado");
            }
            const hrsaida = new Date();
            const valor = calcularValor(registro.entrada, hrsaida);

            console.log("Horário de entrada:", registro.entrada);
            console.log("Horário de saída:", hrsaida);
            console.log("Valor calculado:", valor);
            


        return prisma.registroEstacionamentos.update({
            where:{id},
            data:{
                saida: hrsaida,
                valor: valor
            },
            include:{carro:true, vaga:true},
        })
    }

    async buscarPorId(id: number) {
    return prisma.registroEstacionamentos.findUnique({
        where: { id },
        include: { carro: true, vaga: true }
    });
}

async encerrarSeAtivo(id: number) {
    const resultado = await prisma.registroEstacionamentos.updateMany({
        where: { id, saida: null },
        data: { saida: new Date() }
    });
    return resultado.count;
}

    // Método para listar registros encerrados em um período específico
    async listarEncerradosNoPeriodo(inicio: Date, fim: Date) {
    return prisma.registroEstacionamentos.findMany({
        where: { saida: { gte: inicio, lt: fim } },
        select: { saida: true, valor: true },
        orderBy: { saida: "asc" }
    });
}

}
