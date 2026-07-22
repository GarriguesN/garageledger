"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { CATEGORY_MAP } from "@/lib/constants";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface Props {
  data: { category: string; total: number; count: number }[];
}

export default function DoughnutChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.total, 0);
  const labels = data.map((d) => CATEGORY_MAP[d.category]?.label ?? d.category);
  const colors = data.map((d) => CATEGORY_MAP[d.category]?.color ?? "#6a6568");
  const amounts = data.map((d) => d.total);

  const chartData = {
    labels,
    datasets: [
      {
        data: amounts,
        backgroundColor: colors,
        borderWidth: 0,
      },
    ],
  };

  const options = {
    cutout: "58%",
    plugins: {
      legend: { display: false },
      datalabels: {
        color: "#fff",
        font: { weight: "bold" as const, size: 11 },
        formatter: (val: number, ctx: any) => {
          const pct = ((val / total) * 100);
          return pct > 4 ? `${pct.toFixed(0)}%` : "";
        },
      },
    },
    maintainAspectRatio: false,
  };

  return <Doughnut data={chartData} options={options} />;
}
