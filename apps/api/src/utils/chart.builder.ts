/**
 * Shared Chart Builder
 * Provides standard chart data response format: labels, datasets, colors, legend
 */

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
}

export interface StandardChartData {
  labels: string[];
  datasets: ChartDataset[];
  colors: string[];
  legend: boolean | { position: string; display: boolean };
}

export class ChartBuilder {
  private labels: string[] = [];
  private datasets: ChartDataset[] = [];
  private colors: string[] = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  private legend: boolean | { position: string; display: boolean } = true;

  static create(): ChartBuilder {
    return new ChartBuilder();
  }

  setLabels(labels: string[]): this {
    this.labels = labels;
    return this;
  }

  addDataset(dataset: ChartDataset): this {
    this.datasets.push(dataset);
    return this;
  }

  setColors(colors: string[]): this {
    this.colors = colors;
    return this;
  }

  setLegend(legend: boolean | { position: string; display: boolean }): this {
    this.legend = legend;
    return this;
  }

  build(): StandardChartData {
    return {
      labels: this.labels,
      datasets: this.datasets,
      colors: this.colors,
      legend: this.legend,
    };
  }
}
