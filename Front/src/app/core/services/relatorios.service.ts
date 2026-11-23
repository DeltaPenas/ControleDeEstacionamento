import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';

export interface FaturamentoDiario {
  dia: string;
  total: number;
  quantidade: number;
}

export interface FaturamentoMensal {
  ano: number;
  mes: number;
  totalFaturado: number;
  quantidadeSaidas: number;
  ticketMedio: number;
  registrosSemValor: number;
  porDia: FaturamentoDiario[];
}

@Injectable({ providedIn: 'root' })
export class RelatoriosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/relatorios`;

  faturamentoMensal(ano: number, mes: number) {
    return this.http.get<FaturamentoMensal>(`${this.url}/faturamento`, {
      params: new HttpParams().set('ano', ano).set('mes', mes),
    });
  }

  baixarFaturamento(ano: number, mes: number) {
    return this.http.get(`${this.url}/faturamento/download`, {
      params: new HttpParams().set('ano', ano).set('mes', mes),
      responseType: 'blob',
    });
  }
}
