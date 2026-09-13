/**
 * Shared StatCard Types & Builder (Frontend)
 */

export interface StatCard {
  title: string;
  value: string | number;
  change: number;
  trend: "up" | "down" | "neutral";
  icon?: string;
  color: string;
  tooltip?: string;
}

export interface StatCardOptions {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon?: string;
  color?: string;
  tooltip?: string;
}

export class StatCardBuilder {
  private card: StatCard;

  constructor(title: string, value: string | number) {
    this.card = {
      title,
      value,
      change: 0,
      trend: "neutral",
      icon: "default",
      color: "blue",
    };
  }

  static create(title: string, value: string | number): StatCardBuilder {
    return new StatCardBuilder(title, value);
  }

  static buildFrom(options: StatCardOptions): StatCard {
    const builder = new StatCardBuilder(options.title, options.value);
    if (options.change !== undefined) builder.setChange(options.change, options.trend);
    if (options.icon) builder.setIcon(options.icon);
    if (options.color) builder.setColor(options.color);
    if (options.tooltip) builder.setTooltip(options.tooltip);
    return builder.build();
  }

  setChange(change: number, forcedTrend?: "up" | "down" | "neutral"): this {
    this.card.change = change;
    if (forcedTrend) {
      this.card.trend = forcedTrend;
    } else {
      if (change > 0) this.card.trend = "up";
      else if (change < 0) this.card.trend = "down";
      else this.card.trend = "neutral";
    }
    return this;
  }

  setIcon(icon: string): this {
    this.card.icon = icon;
    return this;
  }

  setColor(color: string): this {
    this.card.color = color;
    return this;
  }

  setTooltip(tooltip: string): this {
    this.card.tooltip = tooltip;
    return this;
  }

  build(): StatCard {
    return { ...this.card };
  }
}
