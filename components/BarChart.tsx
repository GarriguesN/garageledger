"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, ChartDataLabels);

interface Props {
  data: { month: string; total: number }[];
}

export default function BarChart({ data }: Props) {
  const labels = data.map((d) => {
    const [y, m] = d.month.split("-");
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
  });
  const values = data.map((d) => d.total);

  const currentMonth = data.length > 0 ? data[data.length - 1].month : "";
  const bgColors = data.map((d: { month: string; total: number }) =>
    d.month === currentMonth
      ? "rgba(195, 66, 63, 0.9)"
      : "rgba(195, 66, 63, 0.3)"
  );
  const borderColors = data.map((d: { month: string; total: number }) =>
    d.month === currentMonth ? "#c3423f" : "transparent"
  );

  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  const chartData = {
    labels,
    datasets: [
      {
        label: "Gastos",
        data: values,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: "end" as const,
        align: "end" as const,
        color: "#211a1e",
        font: { size: 10, weight: 500 } as any,
        formatter: (val: number) =>
          val.toLocaleString("es-ES", { minimumFractionDigits: 0 }) + "€",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(216, 211, 213, 0.5)" },
        ticks: {
          font: { size: 10 },
          color: "#8a8588",
          callback: (val: any) => val + "€",
        },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: "#4a4548" },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
