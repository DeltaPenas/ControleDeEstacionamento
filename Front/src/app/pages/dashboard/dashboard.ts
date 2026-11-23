import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PARKING_ROWS, PHYSICAL_CAPACITY } from '../../core/parking-layout';
import { ParkingDataService } from '../../core/services/parking-data.service';
import { RelatoriosService, type FaturamentoMensal } from '../../core/services/relatorios.service';
import { Icon } from '../../shared/icon/icon';
import { MetricCard } from '../../shared/metric-card/metric-card';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

@Component({
  selector: 'app-dashboard',
  imports: [Icon, MetricCard, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly data = inject(ParkingDataService);
  private readonly relatorios = inject(RelatoriosService);
  protected readonly capacity = PHYSICAL_CAPACITY;
  protected readonly search = signal('');
  protected readonly situacao = signal('');
  protected readonly reportYear = signal(new Date().getFullYear());
  protected readonly reportMonth = signal(new Date().getMonth() + 1);
  protected readonly report = signal<FaturamentoMensal | null>(null);
  protected readonly reportLoading = signal(false);
  protected readonly reportError = signal(false);
  protected readonly downloadLoading = signal(false);
  protected readonly downloadError = signal(false);
  protected readonly validReportPeriod = computed(
    () =>
      Number.isInteger(this.reportYear()) &&
      this.reportYear() >= 2000 &&
      this.reportYear() <= 2100 &&
      Number.isInteger(this.reportMonth()) &&
      this.reportMonth() >= 1 &&
      this.reportMonth() <= 12,
  );
  protected readonly months = Array.from({ length: 12 }, (_, index) => index + 1);
  protected readonly physicalNumbers = new Set(PARKING_ROWS.flatMap((row) => row.numeros));
  protected readonly loading = computed(
    () => this.data.parkingLoading() || this.data.carros.status() === 'loading',
  );
  protected readonly occupancyRate = computed(() => {
    const rate = this.data.occupancyMetrics()?.rate;
    return rate == null ? '—' : `${rate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  });
  protected readonly filteredCars = computed(() => {
    const term = normalize(this.search().trim());
    return this.data
      .carrosComSituacao()
      .filter(
        (carro) =>
          normalize(`${carro.placa} ${carro.modelo} ${carro.cor}`).includes(term) &&
          (!this.situacao() || carro.situacao === this.situacao()),
      );
  });

  constructor() {
    this.data.ensureParkingLoaded();
    this.data.carros.ensureLoaded();
  }

  protected refresh() {
    this.data.refreshParking();
    this.data.carros.load();
  }

  protected consultarFaturamento() {
    if (!this.validReportPeriod() || this.reportLoading()) return;

    this.reportLoading.set(true);
    this.reportError.set(false);
    this.report.set(null);
    this.relatorios.faturamentoMensal(this.reportYear(), this.reportMonth()).subscribe({
      next: (report) => {
        this.report.set(report);
        this.reportLoading.set(false);
      },
      error: () => {
        this.reportError.set(true);
        this.reportLoading.set(false);
      },
    });
  }

  protected baixarFaturamento() {
    if (!this.validReportPeriod() || this.downloadLoading()) return;

    const year = this.reportYear();
    const month = this.reportMonth();
    this.downloadLoading.set(true);
    this.downloadError.set(false);
    this.relatorios.baixarFaturamento(year, month).subscribe({
      next: (file) => {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        const paddedMonth = String(month).padStart(2, '0');
        link.href = url;
        link.download = `faturamento-${year}-${paddedMonth}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloadLoading.set(false);
      },
      error: () => {
        this.downloadError.set(true);
        this.downloadLoading.set(false);
      },
    });
  }

  protected formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected formatReportDay(day: string) {
    const [year, month, date] = day.split('-');
    return `${date}/${month}/${year}`;
  }
}
